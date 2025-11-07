from fastapi import FastAPI, HTTPException, Depends, Request
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import time, json, os, hmac, hashlib, base64

app = FastAPI(title="Shipping Backend")

# --- Health check ---
@app.get("/api/health")
def health_get():
    return {"status": "ok"}

@app.head("/api/health")
def health_head():
    return

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ⚠️ Cambia esto por tu dominio Vercel en producción
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Archivos de datos ---
BASE_DIR = os.path.dirname(__file__)
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

FILES = {
    "users": "users.json",
    "fedex_orders": "fedex_orders.json",
    "usps_orders": "usps_orders.json",
    "retained_orders": "retained_orders.json",
    "finished_goods": "finished_goods.json",
    "material_bom": "material_bom.json",
    "observations": "observations.json",
    "part_numbers": "part_numbers.json",
    "invoice_search": "invoice_search.json",
    "invoice_history": "invoice_history.json",
    "cuts_report": "cuts_report.json",
    "daily_report": "daily_report.json"
}

def load_json(name):
    path = os.path.join(DATA_DIR, name)
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def save_json(name, data):
    path = os.path.join(DATA_DIR, name)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# --- Crear archivos iniciales ---
for file in FILES.values():
    path = os.path.join(DATA_DIR, file)
    if not os.path.exists(path):
        with open(path, "w", encoding="utf-8") as f:
            json.dump([], f)

# --- Token helpers ---
SECRET = os.environ.get("APP_SECRET", "change_this_secret")

def make_token(username, expires_in=86400):
    expiry = int(time.time()) + expires_in
    payload = f"{username}:{expiry}"
    sig = hmac.new(SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return base64.urlsafe_b64encode(f"{payload}:{sig}".encode()).decode()

def verify_token(token):
    try:
        raw = base64.urlsafe_b64decode(token.encode()).decode()
        username, expiry, sig = raw.split(":")
        payload = f"{username}:{expiry}"
        expected = hmac.new(SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, sig):
            return None
        if int(expiry) < time.time():
            return None
        return username.strip().lower()
    except Exception:
        return None

security = HTTPBearer()

class LoginPayload(BaseModel):
    username: str
    password: str

# --- Crear admin por defecto ---
def seed_admin():
    users = load_json(FILES["users"])
    if not any(u["username"].strip().lower() == "christian tabares" for u in users):
        users.append({
            "id": "admin1",
            "username": "Christian Tabares",
            "password": "Shipping3",
            "role": "admin"
        })
        save_json(FILES["users"], users)
seed_admin()

# --- Autenticación ---
@app.post("/api/auth/login")
def login(payload: LoginPayload, request: Request):
    users = load_json(FILES["users"])
    ip = request.client.host
    user_agent = request.headers.get("user-agent", "")

    for u in users:
        if u["username"].strip().lower() == payload.username.strip().lower() and u["password"] == payload.password:
            expiry = int(time.time()) + 86400
            payload_str = f"{u['username']}:{expiry}"
            signature = hmac.new(SECRET.encode(), payload_str.encode(), hashlib.sha256).hexdigest()
            token = base64.urlsafe_b64encode(f"{payload_str}:{signature}".encode()).decode()

            print(f"🔐 Login: {u['username']} desde IP {ip} con navegador {user_agent}")
            return {
                "token": token,
                "username": u["username"],
                "role": u.get("role", "user"),
                "expiry": expiry,
                "signature": signature[:12],
                "ip": ip,
                "userAgent": user_agent
            }

    raise HTTPException(status_code=401, detail="Credenciales inválidas")

@app.get("/api/auth/me")
def me(credentials: HTTPAuthorizationCredentials = Depends(security)):
    username = verify_token(credentials.credentials)
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token")
    users = load_json(FILES["users"])
    user = next((u for u in users if u["username"].strip().lower() == username), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"username": user["username"], "role": user.get("role", "user")}

# --- Usuarios ---
@app.get("/api/users")
def list_users(credentials: HTTPAuthorizationCredentials = Depends(security)):
    username = verify_token(credentials.credentials)
    print("🔐 Token recibido:", credentials.credentials)
    print("🔍 Usuario verificado:", username)
    users = load_json(FILES["users"])
    current = next((u for u in users if u["username"].strip().lower() == username), None)
    if not current or current.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return users

@app.post("/api/users")
def create_user(payload: LoginPayload, credentials: HTTPAuthorizationCredentials = Depends(security)):
    username = verify_token(credentials.credentials)
    users = load_json(FILES["users"])
    admin = next((u for u in users if u["username"].strip().lower() == username), None)
    if not admin or admin.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    if any(u["username"].strip().lower() == payload.username.strip().lower() for u in users):
        raise HTTPException(status_code=400, detail="User exists")
    new_user = {
        "id": f"user{len(users) + 1}",
        "username": payload.username,
        "password": payload.password,
        "role": "user"
    }
    users.append(new_user)
    save_json(FILES["users"], users)
    return {"ok": True, "user": new_user}

# --- Sincronización global ---
@app.get("/api/sync/data")
def sync_data():
    return {key: load_json(file) for key, file in FILES.items()}

@app.post("/api/sync/upload")
async def sync_upload(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    username = verify_token(credentials.credentials)
    print("🔄 Sincronizando datos para:", username)
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token")
    payload = await request.json()

    for key, file in FILES.items():
        if key in payload:
            value = payload[key]
            if isinstance(value, list) and len(value) > 0:
                save_json(file, value)
            else:
                print(f"⚠️ Ignorado {key}: array vacío recibido")
    return {"status": "ok", "message": "Datos sincronizados correctamente"}
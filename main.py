from fastapi import FastAPI, HTTPException, Depends, Request
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import time, json, os, hmac, hashlib, base64

app = FastAPI(title="Shipping Backend")

# --- Health check ---
@app.head("/api/health")
def health_head():
    return {"status": "ok"}

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ⚠️ cambia en producción a tu dominio exacto
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Rutas de datos ---
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DATA_DIR, exist_ok=True)

USERS_FILE = os.path.join(DATA_DIR, "users.json")
STORAGE_FILE = os.path.join(DATA_DIR, "storage.json")

# Archivos por módulo
FILES = {
    "users": "users.json",
    "fedexOrders": "fedex_orders.json",
    "uspsOrders": "usps_orders.json",
    "retainedOrders": "retained_orders.json",
    "finishedGoods": "finished_goods.json",
    "materialsBOM": "materials_bom.json",
    "observations": "observations.json",
    "partNumbers": "part_numbers.json",
    "invoiceSearch": "invoice_search.json",
    "invoiceHistory": "invoice_history.json",
    "cutsReport": "cuts_report.json",
    "dailyReport": "daily_report.json"
}

# Crear archivos vacíos si no existen
for filename in FILES.values():
    path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(path):
        with open(path, "w", encoding="utf-8") as f:
            json.dump([], f)

# --- Funciones auxiliares ---
def load_json(filename):
    path = os.path.join(DATA_DIR, filename)
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def save_json(filename, data):
    path = os.path.join(DATA_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def load_users():
    if not os.path.exists(USERS_FILE):
        return []
    with open(USERS_FILE, "r") as f:
        return json.load(f)

def save_users(users):
    with open(USERS_FILE, "w") as f:
        json.dump(users, f)

def load_storage():
    if not os.path.exists(STORAGE_FILE):
        with open(STORAGE_FILE, "w") as f:
            json.dump({}, f)
    with open(STORAGE_FILE, "r") as f:
        return json.load(f)

def save_storage(data):
    with open(STORAGE_FILE, "w") as f:
        json.dump(data, f)

# --- Crear admin por defecto ---
def seed_users():
    if not os.path.exists(USERS_FILE):
        users = [{
            "id": "admin1",
            "username": "Christian Tabares",
            "password": "Shipping3",
            "role": "admin"
        }]
        with open(USERS_FILE, "w") as f:
            json.dump(users, f)
seed_users()

# --- Tokens ---
SECRET = os.environ.get("APP_SECRET", "change_this_secret")

def make_token(username, expires_in=3600):
    expiry = int(time.time()) + expires_in
    payload = f"{username}:{expiry}"
    sig = hmac.new(SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
    token = base64.urlsafe_b64encode(f"{payload}:{sig}".encode()).decode()
    return token

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
        return username
    except Exception:
        return None

security = HTTPBearer()

# --- Modelos ---
class LoginPayload(BaseModel):
    username: str
    password: str

# --- Autenticación ---
@app.post("/api/auth/login")
def login(payload: LoginPayload):
    users = load_users()
    for u in users:
        if u["username"] == payload.username and u["password"] == payload.password:
            token = make_token(u["username"])
            return {"token": token, "username": u["username"], "role": u.get("role", "user")}
    raise HTTPException(status_code=401, detail="Invalid credentials")

@app.get("/api/auth/me")
def me(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    username = verify_token(token)
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token")
    users = load_users()
    for u in users:
        if u["username"] == username:
            return {"username": u["username"], "role": u.get("role", "user")}
    raise HTTPException(status_code=404, detail="User not found")

# --- CRUD Usuarios ---
@app.post("/api/users")
def create_user(payload: LoginPayload, credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if credentials is None:
        raise HTTPException(status_code=401, detail="Missing token")
    username = verify_token(credentials.credentials)
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token")

    users = load_users()
    admin = next((x for x in users if x["username"] == username), None)
    if not admin or admin.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    if any(u["username"] == payload.username for u in users):
        raise HTTPException(status_code=400, detail="User exists")

    new = {"id": f"user{len(users) + 1}", "username": payload.username, "password": payload.password, "role": "user"}
    users.append(new)
    save_users(users)
    return {"ok": True, "user": {"username": new["username"], "id": new["id"]}}

# --- Storage Genérico ---
@app.get("/api/storage/{key}")
def get_storage(key: str, credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if credentials is None:
        raise HTTPException(status_code=401, detail="Missing token")
    username = verify_token(credentials.credentials)
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token")
    data = load_storage()
    return {"key": key, "value": data.get(key)}

@app.post("/api/storage/{key}")
async def set_storage(key: str, request: Request, credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if credentials is None:
        raise HTTPException(status_code=401, detail="Missing token")
    username = verify_token(credentials.credentials)
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token")
    body = await request.json()
    data = load_storage()
    data[key] = body.get("value")
    save_storage(data)
    return {"ok": True}

# --- NUEVOS: Sincronización global ---
@app.get("/api/sync/data")
def get_all_data(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if credentials is None:
        raise HTTPException(status_code=401, detail="Missing token")
    username = verify_token(credentials.credentials)
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token")

    data = {key: load_json(file) for key, file in FILES.items()}
    return data

@app.post("/api/sync/upload")
async def upload_all_data(request: Request, credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if credentials is None:
        raise HTTPException(status_code=401, detail="Missing token")
    username = verify_token(credentials.credentials)
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token")

    payload = await request.json()
    for key, file in FILES.items():
        if key in payload:
            save_json(file, payload[key])
    return {"status": "ok", "message": "Datos sincronizados correctamente"}

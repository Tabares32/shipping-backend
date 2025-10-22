from fastapi import FastAPI, HTTPException, Depends, Request
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import time, json, os, hmac, hashlib, base64
from typing import Optional
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

app = FastAPI(title="Shipping Backend")

@app.get("/api/health")
def health():
    return {"status": "ok"}

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ⚠️ en producción cámbialo a tu dominio
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Archivos base ---
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DATA_DIR, exist_ok=True)
USERS_FILE = os.path.join(DATA_DIR, "users.json")
STORAGE_FILE = os.path.join(DATA_DIR, "storage.json")

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

# --- Funciones de carga/guardado ---
def load_users():
    with open(USERS_FILE, "r") as f:
        return json.load(f)

def save_users(users):
    with open(USERS_FILE, "w") as f:
        json.dump(users, f)

def load_storage():
    try:
        if not os.path.exists(STORAGE_FILE):
            with open(STORAGE_FILE, "w") as f:
                json.dump({}, f)
        with open(STORAGE_FILE, "r") as f:
            return json.load(f)
    except Exception as e:
        print("⚠️ Error leyendo storage.json:", e)
        return {}

def save_storage(data):
    try:
        with open(STORAGE_FILE, "w") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print("⚠️ Error guardando storage.json:", e)
def load_storage():
    try:
        if not os.path.exists(STORAGE_FILE):
            with open(STORAGE_FILE, "w") as f:
                json.dump({}, f)
        with open(STORAGE_FILE, "r") as f:
            return json.load(f)
    except Exception as e:
        print("⚠️ Error leyendo storage.json:", e)
        return {}

def save_storage(data):
    try:
        with open(STORAGE_FILE, "w") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print("⚠️ Error guardando storage.json:", e)

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

# --- Endpoints de autenticación ---
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

# --- CRUD de usuarios ---
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

    new = {
        "id": f"user{len(users) + 1}",
        "username": payload.username,
        "password": payload.password,
        "role": "user"
    }
    users.append(new)
    save_users(users)
    return {"ok": True, "user": {"username": new["username"], "id": new["id"]}}

@app.get("/api/users")
def list_users(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if credentials is None:
        raise HTTPException(status_code=401, detail="Missing token")
    username = verify_token(credentials.credentials)
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token")

    users = load_users()
    return [{"id": u["id"], "username": u["username"], "role": u["role"]} for u in users]

# --- Storage ---
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

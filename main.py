from fastapi import FastAPI, HTTPException, Depends, Request
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import time, json, os, hmac, hashlib, base64, bcrypt, httpx

# ─────────────────────────────────────────────────────────────────
#  VERSIÓN DE LA APLICACIÓN
#  Cambia APP_VERSION aquí cada vez que hagas un deploy nuevo.
#  El frontend lo compara con la versión almacenada en localStorage
#  y muestra el banner "Nueva versión disponible".
# ─────────────────────────────────────────────────────────────────
APP_VERSION  = "1.2.0"
APP_VERSION_NOTES = "Seguridad mejorada: passwords encriptados, Google OAuth, CRUD completo de usuarios, sistema de actualizaciones."

app = FastAPI(title="Shipping Backend", version=APP_VERSION)

# ── Health check ──────────────────────────────────────────────────
@app.get("/api/health")
def health_get():
    return {"status": "ok"}

@app.head("/api/health")
def health_head():
    return

# ── Versión ───────────────────────────────────────────────────────
@app.get("/api/version")
def get_version():
    return {
        "version": APP_VERSION,
        "notes": APP_VERSION_NOTES
    }

# ── CORS ──────────────────────────────────────────────────────────
# Pon tus dominios reales en la variable de entorno ALLOWED_ORIGINS
# separados por coma, p.ej.:  https://mi-app.vercel.app,https://otro.com
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,https://shipping-backend-kgm5.onrender.com"
    ).split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Archivos de datos ─────────────────────────────────────────────
BASE_DIR = os.path.dirname(__file__)
DATA_DIR  = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

FILES = {
    "users":           "users.json",
    "fedex_orders":    "fedex_orders.json",
    "usps_orders":     "usps_orders.json",
    "retained_orders": "retained_orders.json",
    "finished_goods":  "finished_goods.json",
    "material_bom":    "materials_bom.json",       # nombre corregido en disco
    "observations":    "observations.json",
    "part_numbers":    "part_numbers.json",
    "invoice_search":  "invoice_search.json",
    "invoice_history": "invoice_history.json",
    "cuts_report":     "cuts_report.json",
    "daily_report":    "daily_report.json",
}

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

# Crear archivos faltantes con array vacío
for _file in FILES.values():
    _path = os.path.join(DATA_DIR, _file)
    if not os.path.exists(_path):
        with open(_path, "w", encoding="utf-8") as _f:
            json.dump([], _f)

# ── Helpers de contraseña ─────────────────────────────────────────
def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False

def is_hashed(pw: str) -> bool:
    return pw.startswith("$2b$") or pw.startswith("$2a$")

# ── Helpers de token ──────────────────────────────────────────────
SECRET = os.environ.get("APP_SECRET", "change_this_secret_in_render_dashboard")

def make_token(username: str, expires_in: int = 86400) -> str:
    expiry  = int(time.time()) + expires_in
    payload = f"{username}:{expiry}"
    sig     = hmac.new(SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return base64.urlsafe_b64encode(f"{payload}:{sig}".encode()).decode()

def verify_token(token: str) -> Optional[str]:
    try:
        raw   = base64.urlsafe_b64decode(token.encode()).decode()
        parts = raw.rsplit(":", 2)
        if len(parts) != 3:
            return None
        username, expiry, sig = parts
        payload  = f"{username}:{expiry}"
        expected = hmac.new(SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, sig):
            return None
        if int(expiry) < int(time.time()):
            return None
        return username.strip().lower()
    except Exception:
        return None

security = HTTPBearer()

def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)):
    username = verify_token(creds.credentials)
    if not username:
        raise HTTPException(401, "Token inválido o expirado")
    users = load_json(FILES["users"])
    user  = next((u for u in users if u["username"].strip().lower() == username), None)
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    return user

def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(403, "Solo administradores")
    return current_user

# ── Seed admin por defecto ────────────────────────────────────────
def seed_admin():
    users = load_json(FILES["users"])
    admin = next((u for u in users if u["username"].strip().lower() == "christian tabares"), None)
    if not admin:
        users.append({
            "id":             "admin1",
            "username":       "Christian Tabares",
            "password":       hash_password("Shipping3"),
            "role":           "admin",
            "terms_accepted": True,
            "auth_provider":  "local",
        })
        save_json(FILES["users"], users)
    elif not is_hashed(admin.get("password", "")):
        # Migración automática de contraseña en texto plano
        for u in users:
            if u["username"].strip().lower() == "christian tabares":
                u["password"] = hash_password(u["password"])
        save_json(FILES["users"], users)
        print("✅ Contraseña de admin migrada a bcrypt")

seed_admin()

# ── Modelos Pydantic ──────────────────────────────────────────────
class LoginPayload(BaseModel):
    username: str
    password: str

class UserCreatePayload(BaseModel):
    username: str
    password: str
    role: str = "user"

class UserUpdatePayload(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    role:     Optional[str] = None

class GoogleAuthPayload(BaseModel):
    token:          str   # Google ID token
    terms_accepted: bool

# ── LOGIN normal ──────────────────────────────────────────────────
@app.post("/api/auth/login")
def login(payload: LoginPayload, request: Request):
    users = load_json(FILES["users"])
    ip    = request.client.host

    for u in users:
        if u["username"].strip().lower() != payload.username.strip().lower():
            continue
        pw = u.get("password", "")
        # Migración on-the-fly si la contraseña todavía está en texto plano
        if not is_hashed(pw):
            if pw != payload.password:
                break
            u["password"] = hash_password(pw)
            save_json(FILES["users"], users)
        elif not verify_password(payload.password, pw):
            break

        token  = make_token(u["username"])
        expiry = int(time.time()) + 86400
        sig    = token[-12:]
        print(f"🔐 Login OK: {u['username']} desde {ip}")
        return {
            "token":          token,
            "username":       u["username"],
            "role":           u.get("role", "user"),
            "expiry":         expiry,
            "signature":      sig,
            "ip":             ip,
            "userAgent":      request.headers.get("user-agent", ""),
            "terms_accepted": u.get("terms_accepted", True),
        }

    raise HTTPException(401, "Credenciales inválidas")

# ── LOGIN Google OAuth ────────────────────────────────────────────
@app.post("/api/auth/google")
async def google_login(payload: GoogleAuthPayload, request: Request):
    if not payload.terms_accepted:
        raise HTTPException(400, "Debes aceptar los términos y condiciones")

    # Verificar el ID token con Google
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"https://oauth2.googleapis.com/tokeninfo?id_token={payload.token}"
            )
        if resp.status_code != 200:
            raise HTTPException(401, "Token de Google inválido")
        g = resp.json()
    except httpx.RequestError:
        raise HTTPException(503, "No se pudo verificar con Google")

    email     = g.get("email", "")
    name      = g.get("name", email)
    google_id = g.get("sub", "")
    if not email:
        raise HTTPException(400, "No se pudo obtener el email de Google")

    users = load_json(FILES["users"])
    user  = next(
        (u for u in users if u.get("google_id") == google_id or u.get("email") == email),
        None
    )

    if not user:
        user = {
            "id":             f"g{len(users)+1}",
            "username":       name,
            "email":          email,
            "google_id":      google_id,
            "password":       "",
            "role":           "user",
            "terms_accepted": True,
            "auth_provider":  "google",
        }
        users.append(user)
    else:
        user["terms_accepted"] = True
        user["google_id"]      = google_id   # actualizar por si cambió

    save_json(FILES["users"], users)

    token = make_token(user["username"])
    return {
        "token":          token,
        "username":       user["username"],
        "role":           user.get("role", "user"),
        "expiry":         int(time.time()) + 86400,
        "terms_accepted": True,
    }

# ── /me ───────────────────────────────────────────────────────────
@app.get("/api/auth/me")
def me(current_user: dict = Depends(get_current_user)):
    return {
        "username":       current_user["username"],
        "role":           current_user.get("role", "user"),
        "terms_accepted": current_user.get("terms_accepted", True),
    }

# ── Usuarios — CRUD completo ──────────────────────────────────────
@app.get("/api/users")
def list_users(admin: dict = Depends(require_admin)):
    users = load_json(FILES["users"])
    return [{k: v for k, v in u.items() if k != "password"} for u in users]

@app.post("/api/users")
def create_user(payload: UserCreatePayload, admin: dict = Depends(require_admin)):
    users = load_json(FILES["users"])
    if any(u["username"].strip().lower() == payload.username.strip().lower() for u in users):
        raise HTTPException(400, "El usuario ya existe")
    new_user = {
        "id":             f"u{len(users)+1}",
        "username":       payload.username,
        "password":       hash_password(payload.password),
        "role":           payload.role,
        "terms_accepted": True,
        "auth_provider":  "local",
    }
    users.append(new_user)
    save_json(FILES["users"], users)
    return {"ok": True, "user": {k: v for k, v in new_user.items() if k != "password"}}

@app.put("/api/users/{user_id}")
def update_user(user_id: str, payload: UserUpdatePayload, admin: dict = Depends(require_admin)):
    users = load_json(FILES["users"])
    user  = next((u for u in users if u["id"] == user_id), None)
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    if payload.username:
        user["username"] = payload.username
    if payload.password:
        user["password"] = hash_password(payload.password)
    if payload.role:
        user["role"] = payload.role
    save_json(FILES["users"], users)
    return {"ok": True, "user": {k: v for k, v in user.items() if k != "password"}}

@app.delete("/api/users/{user_id}")
def delete_user(user_id: str, admin: dict = Depends(require_admin)):
    users = load_json(FILES["users"])
    user  = next((u for u in users if u["id"] == user_id), None)
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    admins_left = sum(1 for u in users if u.get("role") == "admin")
    if user.get("role") == "admin" and admins_left <= 1:
        raise HTTPException(400, "No puedes eliminar el único administrador")
    save_json(FILES["users"], [u for u in users if u["id"] != user_id])
    return {"ok": True}

# ── Sincronización ─────────────────────────────────────────────────
@app.get("/api/sync/data")
def sync_data(current_user: dict = Depends(get_current_user)):
    result = {}
    for key, filename in FILES.items():
        if key == "users":
            result[key] = [
                {k: v for k, v in u.items() if k != "password"}
                for u in load_json(filename)
            ]
        else:
            result[key] = load_json(filename)
    return result

@app.post("/api/sync/upload")
async def sync_upload(request: Request, current_user: dict = Depends(get_current_user)):
    payload = await request.json()
    for key, filename in FILES.items():
        if key == "users":
            continue   # usuarios solo se modifican por sus endpoints
        if key in payload:
            value = payload[key]
            if isinstance(value, list) and len(value) > 0:
                save_json(filename, value)
    return {"status": "ok"}

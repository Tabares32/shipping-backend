"""
Shipping Backend v1.5.1 — MongoDB Atlas
Persistencia real: todos los datos viven en MongoDB.
"""

from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List, Any
from pymongo import MongoClient
from bson import ObjectId
import time, os, hmac, hashlib, base64, bcrypt, httpx

# ── Versión ────────────────────────────────────────────────────────────────────
APP_VERSION       = "1.5.1"
APP_VERSION_NOTES = "Corrección: edición/eliminación de materiales BOM (busca por id, materialId o _id)."

app = FastAPI(title="Shipping Backend", version=APP_VERSION)

# ── Health / Version ───────────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.head("/api/health")
def health_head():
    return

@app.get("/api/version")
def get_version():
    return {"version": APP_VERSION, "notes": APP_VERSION_NOTES}

# ── CORS ───────────────────────────────────────────────────────────────────────
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,https://shipping-frontend-rho.vercel.app"
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

# ── MongoDB ────────────────────────────────────────────────────────────────────
MONGO_URI = os.environ.get(
    "MONGO_URI",
    "mongodb+srv://shippinguser:5IYOL8jte8hA4Cxf@shipping-db.6e3wp9f.mongodb.net/?appName=shipping-db"
)

client = MongoClient(MONGO_URI)
db     = client["shipping"]

# Colecciones
col_users          = db["users"]
col_fedex          = db["fedex_orders"]
col_usps           = db["usps_orders"]
col_retained       = db["retained_orders"]
col_finished_goods = db["finished_goods"]
col_material_bom   = db["material_bom"]
col_observations   = db["observations"]
col_part_numbers   = db["part_numbers"]
col_invoice_search = db["invoice_search"]
col_invoice_hist   = db["invoice_history"]
col_cuts           = db["cuts_report"]
col_daily          = db["daily_report"]

COLLECTIONS = {
    "fedex_orders":    col_fedex,
    "usps_orders":     col_usps,
    "retained_orders": col_retained,
    "finished_goods":  col_finished_goods,
    "material_bom":    col_material_bom,
    "observations":    col_observations,
    "part_numbers":    col_part_numbers,
    "invoice_search":  col_invoice_search,
    "invoice_history": col_invoice_hist,
    "cuts_report":     col_cuts,
    "daily_report":    col_daily,
}

def serialize(doc):
    """Convierte _id de ObjectId a string para JSON."""
    if doc is None:
        return None
    doc = dict(doc)
    if "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc

def col_list(col):
    return [serialize(d) for d in col.find()]

# ── Seguridad ──────────────────────────────────────────────────────────────────
SECRET = os.environ.get("APP_SECRET", "change_this_in_render_env")

def hash_pw(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()

def check_pw(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False

def is_hashed(pw: str) -> bool:
    return pw.startswith("$2b$") or pw.startswith("$2a$")

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
        expected = hmac.new(SECRET.encode(), f"{username}:{expiry}".encode(), hashlib.sha256).hexdigest()
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
    user = col_users.find_one({"username_lower": username})
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    return serialize(user)

def require_admin(u=Depends(get_current_user)):
    if u.get("role") != "admin":
        raise HTTPException(403, "Solo administradores")
    return u

def require_editor(u=Depends(get_current_user)):
    """admin y editor pueden escribir; viewer solo puede leer."""
    if u.get("role") not in ("admin", "editor"):
        raise HTTPException(403, "No tienes permisos de edición")
    return u

# ── Seed admin ─────────────────────────────────────────────────────────────────
def seed_admin():
    name = "Christian Tabares"
    existing = col_users.find_one({"username_lower": name.lower()})
    if not existing:
        col_users.insert_one({
            "username":       name,
            "username_lower": name.lower(),
            "password":       hash_pw("Shipping3"),
            "role":           "admin",
            "terms_accepted": True,
            "auth_provider":  "local",
        })
        print("✅ Admin creado en MongoDB")
    elif not is_hashed(existing.get("password", "")):
        col_users.update_one(
            {"username_lower": name.lower()},
            {"$set": {"password": hash_pw(existing["password"])}}
        )
        print("✅ Contraseña admin migrada a bcrypt en MongoDB")

seed_admin()

# ── Modelos ────────────────────────────────────────────────────────────────────
class LoginPayload(BaseModel):
    username: str
    password: str

class UserCreatePayload(BaseModel):
    username: str
    password: str
    role: str = "editor"   # roles: admin | editor | viewer

class UserUpdatePayload(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    role:     Optional[str] = None

class GoogleAuthPayload(BaseModel):
    token:          str
    terms_accepted: bool

class BulkUpsertPayload(BaseModel):
    records: List[Any]

# ── AUTH ───────────────────────────────────────────────────────────────────────
@app.post("/api/auth/login")
def login(payload: LoginPayload, request: Request):
    user = col_users.find_one({"username_lower": payload.username.strip().lower()})
    if not user:
        raise HTTPException(401, "Credenciales inválidas")

    pw = user.get("password", "")
    if not is_hashed(pw):
        if pw != payload.password:
            raise HTTPException(401, "Credenciales inválidas")
        col_users.update_one({"_id": user["_id"]}, {"$set": {"password": hash_pw(pw)}})
    elif not check_pw(payload.password, pw):
        raise HTTPException(401, "Credenciales inválidas")

    token = make_token(user["username"])
    print(f"🔐 Login: {user['username']} desde {request.client.host}")
    return {
        "token":          token,
        "username":       user["username"],
        "role":           user.get("role", "editor"),
        "expiry":         int(time.time()) + 86400,
        "terms_accepted": user.get("terms_accepted", True),
    }

@app.post("/api/auth/google")
async def google_login(payload: GoogleAuthPayload):
    if not payload.terms_accepted:
        raise HTTPException(400, "Debes aceptar los términos y condiciones")
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            resp = await c.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={payload.token}")
        if resp.status_code != 200:
            raise HTTPException(401, "Token de Google inválido")
        g = resp.json()
    except httpx.RequestError:
        raise HTTPException(503, "No se pudo verificar con Google")

    email     = g.get("email", "")
    name      = g.get("name", email)
    google_id = g.get("sub", "")
    if not email:
        raise HTTPException(400, "No se pudo obtener email de Google")

    user = col_users.find_one({"$or": [{"google_id": google_id}, {"email": email}]})
    if not user:
        doc = {
            "username":       name,
            "username_lower": name.lower(),
            "email":          email,
            "google_id":      google_id,
            "password":       "",
            "role":           "editor",
            "terms_accepted": True,
            "auth_provider":  "google",
        }
        col_users.insert_one(doc)
        user = col_users.find_one({"google_id": google_id})
    else:
        col_users.update_one({"_id": user["_id"]}, {"$set": {"terms_accepted": True, "google_id": google_id}})

    token = make_token(user["username"])
    return {
        "token":          token,
        "username":       user["username"],
        "role":           user.get("role", "editor"),
        "expiry":         int(time.time()) + 86400,
        "terms_accepted": True,
    }

@app.get("/api/auth/me")
def me(u=Depends(get_current_user)):
    return {"username": u["username"], "role": u.get("role", "editor"), "terms_accepted": u.get("terms_accepted", True)}

# ── USUARIOS ───────────────────────────────────────────────────────────────────
@app.get("/api/users")
def list_users(admin=Depends(require_admin)):
    users = [serialize(u) for u in col_users.find()]
    return [{k: v for k, v in u.items() if k != "password"} for u in users]

@app.post("/api/users")
def create_user(payload: UserCreatePayload, admin=Depends(require_admin)):
    if col_users.find_one({"username_lower": payload.username.strip().lower()}):
        raise HTTPException(400, "El usuario ya existe")
    if payload.role not in ("admin", "editor", "viewer"):
        raise HTTPException(400, "Rol inválido. Usa: admin, editor o viewer")
    doc = {
        "username":       payload.username.strip(),
        "username_lower": payload.username.strip().lower(),
        "password":       hash_pw(payload.password),
        "role":           payload.role,
        "terms_accepted": True,
        "auth_provider":  "local",
    }
    result = col_users.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return {"ok": True, "user": {k: v for k, v in doc.items() if k != "password"}}

@app.put("/api/users/{user_id}")
def update_user(user_id: str, payload: UserUpdatePayload, admin=Depends(require_admin)):
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(400, "ID inválido")
    user = col_users.find_one({"_id": oid})
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    upd = {}
    if payload.username:
        upd["username"]       = payload.username.strip()
        upd["username_lower"] = payload.username.strip().lower()
    if payload.password:
        upd["password"] = hash_pw(payload.password)
    if payload.role:
        if payload.role not in ("admin", "editor", "viewer"):
            raise HTTPException(400, "Rol inválido")
        upd["role"] = payload.role
    if upd:
        col_users.update_one({"_id": oid}, {"$set": upd})
    updated = serialize(col_users.find_one({"_id": oid}))
    return {"ok": True, "user": {k: v for k, v in updated.items() if k != "password"}}

@app.delete("/api/users/{user_id}")
def delete_user(user_id: str, admin=Depends(require_admin)):
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(400, "ID inválido")
    user = col_users.find_one({"_id": oid})
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    if user.get("role") == "admin" and col_users.count_documents({"role": "admin"}) <= 1:
        raise HTTPException(400, "No puedes eliminar el único administrador")
    col_users.delete_one({"_id": oid})
    return {"ok": True}

# ── SYNC — leer todos los datos ────────────────────────────────────────────────
@app.get("/api/sync/data")
def sync_data(u=Depends(get_current_user)):
    result = {}
    for key, col in COLLECTIONS.items():
        result[key] = col_list(col)
    result["users"] = [
        {k: v for k, v in serialize(u).items() if k != "password"}
        for u in col_users.find()
    ]
    return result

# ── SYNC — subir datos (solo editor/admin) ─────────────────────────────────────
@app.post("/api/sync/upload")
async def sync_upload(request: Request, u=Depends(require_editor)):
    payload = await request.json()
    saved   = []
    for key, col in COLLECTIONS.items():
        if key not in payload:
            continue
        records = payload[key]
        if not isinstance(records, list) or len(records) == 0:
            continue
        for rec in records:
            if not isinstance(rec, dict):
                continue
            rec_id = rec.get("id") or rec.get("_id")
            if rec_id:
                rec_copy = {k: v for k, v in rec.items() if k != "_id"}
                rec_copy["id"] = str(rec_id)
                col.replace_one({"id": str(rec_id)}, rec_copy, upsert=True)
            else:
                col.insert_one(rec)
        saved.append(key)
    return {"status": "ok", "saved": saved}

# ── ENDPOINTS GENÉRICOS POR COLECCIÓN ───────────────────────────────────────────

def _match_filter(item_id: str):
    """Busca un documento por 'id', 'materialId' o _id de Mongo."""
    or_conditions = [{"id": item_id}, {"materialId": item_id}]
    try:
        or_conditions.append({"_id": ObjectId(item_id)})
    except Exception:
        pass
    return {"$or": or_conditions}


def generic_router(col, prefix: str):
    @app.get(f"/api/{prefix}")
    def _list(u=Depends(get_current_user)):
        return col_list(col)

    @app.post(f"/api/{prefix}")
    async def _create(request: Request, u=Depends(require_editor)):
        body = await request.json()
        if not isinstance(body, dict):
            raise HTTPException(400, "Se esperaba un objeto JSON")
        body.pop("_id", None)
        result = col.insert_one(body)
        body["_id"] = str(result.inserted_id)
        return body

    @app.put(f"/api/{prefix}/{{item_id}}")
    async def _update(item_id: str, request: Request, u=Depends(require_editor)):
        body = await request.json()
        body.pop("_id", None)
        existing = col.find_one(_match_filter(item_id))
        if existing:
            col.update_one({"_id": existing["_id"]}, {"$set": body})
        else:
            body.setdefault("id", item_id)
            col.insert_one(body)
        return {"ok": True}

    @app.delete(f"/api/{prefix}/cleanup/duplicates")
    def _cleanup_duplicates(u=Depends(require_editor)):
        """
        Elimina documentos duplicados según 'materialId' (o 'id' si no
        existe materialId), dejando el primero de cada grupo.
        """
        seen = set()
        to_delete = []
        for doc in col.find():
            key = (doc.get("materialId") or doc.get("id") or "").strip().lower()
            if not key:
                continue
            if key in seen:
                to_delete.append(doc["_id"])
            else:
                seen.add(key)
        for _id in to_delete:
            col.delete_one({"_id": _id})
        return {"ok": True, "deleted_count": len(to_delete), "remaining": col.count_documents({})}

    @app.delete(f"/api/{prefix}/{{item_id}}")
    def _delete(item_id: str, u=Depends(require_editor)):
        result = col.delete_one(_match_filter(item_id))
        return {"ok": True, "deleted_count": result.deleted_count}


# Registrar rutas para cada colección
generic_router(col_fedex,          "fedex_orders")
generic_router(col_usps,           "usps_orders")
generic_router(col_retained,       "retained_orders")
generic_router(col_finished_goods, "finished_goods")
generic_router(col_material_bom,   "material_bom")
generic_router(col_observations,   "observations")
generic_router(col_part_numbers,   "part_numbers")
generic_router(col_invoice_search, "invoice_search")
generic_router(col_invoice_hist,   "invoice_history")
generic_router(col_cuts,           "cuts_report")
generic_router(col_daily,          "daily_report")

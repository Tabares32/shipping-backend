from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import json, sqlite3, os, time, threading

DB_PATH = os.getenv("DB_PATH", "data.db")
API_PREFIX = "/api"

app = FastAPI(title="Shipping Backend", version="1.0.0")

# CORS: allow any origin by default; tighten in production with env var
origins = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_conn():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT, updated_at REAL)")
    return conn

conn = get_conn()
lock = threading.Lock()

class StoragePayload(BaseModel):
    value: dict | list | str | int | float | bool | None

# Connected websockets
class ConnectionManager:
    def __init__(self):
        self.active: set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active.discard(websocket)

    async def broadcast(self, message: dict):
        dead = []
        for ws in self.active:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

manager = ConnectionManager()

@app.get(f"{API_PREFIX}/health")
def health():
    return {"status": "ok", "time": time.time()}

@app.get(f"{API_PREFIX}/storage/{{key}}")
def get_storage(key: str):
    with lock:
        cur = conn.execute("SELECT value, updated_at FROM kv WHERE key=?", (key,))
        row = cur.fetchone()
    if not row:
        return JSONResponse({"value": None, "updated_at": None})
    value, updated_at = row
    try:
        data = json.loads(value)
    except Exception:
        data = value
    return {"value": data, "updated_at": updated_at}

@app.post(f"{API_PREFIX}/storage/{{key}}")
async def set_storage(key: str, payload: StoragePayload):
    data_json = json.dumps(payload.value)
    now = time.time()
    with lock:
        conn.execute("INSERT INTO kv(key, value, updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at",
                     (key, data_json, now))
        conn.commit()
    # notify all clients
    await manager.broadcast({"type": "storage_update", "key": key, "value": payload.value, "updated_at": now})
    return {"ok": True, "key": key, "updated_at": now}

@app.websocket(f"{API_PREFIX}/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # clients may optionally send messages to echo/broadcast
            msg = await websocket.receive_json()
            if isinstance(msg, dict) and msg.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
            elif isinstance(msg, dict) and msg.get("type") == "storage_update":
                # optional: server can also persist if clients send updates this way
                key = msg.get("key")
                value = msg.get("value")
                if key is not None:
                    await set_storage(key, StoragePayload(value=value))
            else:
                # ignore
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")), reload=False)

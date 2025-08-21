# Backend FastAPI (Render)

## Deploy en Render (GitHub)
1. Suba esta carpeta `backend/` a un repo en GitHub (puede ser el mismo monorepo con `frontend/` o separado).
2. En Render: **New +** → **Web Service** → conecte el repo.
3. Render detectará Python. Asegúrese de:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app:app --host 0.0.0.0 --port $PORT`
   - Health check path: `/api/health`
4. Variables de entorno (opcional):
   - `CORS_ORIGINS` → `*` (o su dominio de Vercel)
   - `DB_PATH` → `data.db` (por defecto)
5. Cree el servicio. Tome el URL (p.ej. `https://shipping-backend.onrender.com`).

## Probar
- GET `https://.../api/health`
- WebSocket `wss://.../api/ws`
- GET/POST `https://.../api/storage/<key>`

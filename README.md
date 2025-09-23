FastAPI backend for the Shipping app.

Endpoints:
/auth/login  POST {username, password} -> {token}
/auth/me    GET (Authorization: Bearer <token>)
/users       POST (admin only) {username,password}
/storage/{key} GET, POST (requires Authorization header) -> store arbitrary JSON under 'value' field

Seeded user: username=admin password=adminpassword

To run locally:
pip install -r requirements.txt
gunicorn -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8000

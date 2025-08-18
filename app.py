from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import os

app = Flask(__name__)

# --- DB URL (Render) ---
db_url = os.environ.get("DATABASE_URL", "")
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)
app.config["SQLALCHEMY_DATABASE_URI"] = db_url or "sqlite:///local.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# --- CORS: Firebase Hosting / Vercel / local ---
CORS(
    app,
    resources={r"/api/*": {
        "origins": [
            "http://localhost:3000",
            "https://*.web.app",
            "https://*.firebaseapp.com",
            "https://*.vercel.app"
        ]
    }},
    supports_credentials=True
)

db = SQLAlchemy(app)

# --- Models ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True)  # opcional
    email = db.Column(db.String(120), unique=True)    # opcional
    password = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(20), default="normal")
    is_admin = db.Column(db.Boolean, default=False)

class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    invoice = db.Column(db.String(100), nullable=False)
    client = db.Column(db.String(100))
    date = db.Column(db.String(50))
    created_by = db.Column(db.Integer, db.ForeignKey("user.id"))

# --- Crear tablas (Flask 3: hacerlo al import) ---
with app.app_context():
    db.create_all()

# --- Rutas ---
@app.route("/api/test")
def test():
    return jsonify({"message": "Backend conectado correctamente con PostgreSQL!"})

@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")
    role = data.get("role", "normal")

    if not password or (not username and not email):
        return jsonify({"error": "username o email y password son requeridos"}), 400

    if username and User.query.filter_by(username=username).first():
        return jsonify({"error": "El username ya existe"}), 400
    if email and User.query.filter_by(email=email).first():
        return jsonify({"error": "El email ya existe"}), 400

    hashed = generate_password_hash(password)
    user = User(username=username, email=email, password=hashed, role=role)
    db.session.add(user)
    db.session.commit()

    return jsonify({"user": {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role
    }}), 201

@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    username = data.get("username")
    email = data.get("email")
    password = data.get("password") or ""

    user = None
    if username:
        user = User.query.filter_by(username=username).first()
    elif email:
        user = User.query.filter_by(email=email).first()

    if not user or not check_password_hash(user.password, password):
        return jsonify({"error": "Credenciales inválidas"}), 401

    return jsonify({"user": {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role
    }})  # (si quieres, aquí podrías emitir un JWT)

@app.route("/api/orders", methods=["GET", "POST"])
def orders():
    if request.method == "POST":
        data = request.get_json() or {}
        invoice = data.get("invoice")
        if not invoice:
            return jsonify({"error": "invoice es requerido"}), 400

        order = Order(
            invoice=invoice,
            client=data.get("client"),
            date=data.get("date"),
            created_by=data.get("user_id"),
        )
        db.session.add(order)
        db.session.commit()
        return jsonify({"message": "Orden creada", "order": {
            "id": order.id, "invoice": order.invoice, "client": order.client, "date": order.date
        }}), 201

    # GET con soporte simple para polling incremental
    since_id = request.args.get("since_id", type=int, default=0)
    q = Order.query
    if since_id > 0:
        q = q.filter(Order.id > since_id)
    q = q.order_by(Order.id.desc()).limit(200)

    data = [{
        "id": o.id,
        "invoice": o.invoice,
        "client": o.client,
        "date": o.date,
        "created_by": o.created_by
    } for o in q.all()]

    return jsonify(data)

if __name__ == "__main__":
    # Para Render, usa el start command: `gunicorn app:app`
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port, debug=True)

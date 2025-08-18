import os
import secrets
from datetime import datetime
from functools import wraps

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

# -----------------------------------------------------------------------------
# Configuración base
# -----------------------------------------------------------------------------
app = Flask(__name__)

# CORS: permite tu frontend (ajusta FRONTEND_ORIGIN en Render)
FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN", "*")
CORS(app, resources={r"/api/*": {"origins": FRONTEND_ORIGIN}})

# DATABASE_URL (Render) — corrige esquema postgres:// -> postgresql://
db_url = os.environ.get("DATABASE_URL", "sqlite:///local.db")
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

app.config["SQLALCHEMY_DATABASE_URI"] = db_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)

# -----------------------------------------------------------------------------
# Modelos
# -----------------------------------------------------------------------------
class User(db.Model):
    __tablename__ = "users"
    id          = db.Column(db.Integer, primary_key=True)
    email       = db.Column(db.String(120), unique=True, nullable=False, index=True)
    username    = db.Column(db.String(80), unique=True, nullable=False)
    password_h  = db.Column("password_hash", db.String(200), nullable=False)
    role        = db.Column(db.String(20), default="user")  # 'admin' | 'user'
    token       = db.Column(db.String(64), index=True, unique=True, nullable=True)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, raw):
        self.password_h = generate_password_hash(raw)

    def check_password(self, raw):
        return check_password_hash(self.password_h, raw)

    def issue_token(self):
        self.token = secrets.token_hex(32)
        db.session.commit()
        return self.token

    def revoke_token(self):
        self.token = None
        db.session.commit()


class Order(db.Model):
    __tablename__ = "orders"
    id              = db.Column(db.Integer, primary_key=True)
    invoice         = db.Column(db.String(100), nullable=False, index=True)
    client          = db.Column(db.String(120), nullable=True)
    date            = db.Column(db.Date, nullable=True)
    status          = db.Column(db.String(30), default="open")  # open|closed|cancelled
    created_by_id   = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_at      = db.Column(db.DateTime, default=datetime.utcnow)

    created_by      = db.relationship("User", backref="orders")


class OrderLine(db.Model):
    __tablename__ = "order_lines"
    id              = db.Column(db.Integer, primary_key=True)
    order_id        = db.Column(db.Integer, db.ForeignKey("orders.id"), index=True)
    part_number     = db.Column(db.String(100), nullable=False)
    description     = db.Column(db.String(255), nullable=True)
    quantity        = db.Column(db.Integer, default=1)
    unit_price      = db.Column(db.Numeric(12, 2), default=0)
    created_at      = db.Column(db.DateTime, default=datetime.utcnow)

    order           = db.relationship("Order", backref="lines")


class Report(db.Model):
    __tablename__ = "reports"
    id              = db.Column(db.Integer, primary_key=True)
    title           = db.Column(db.String(150), nullable=False)
    content_json    = db.Column(db.Text, nullable=False)  # guarda JSON como texto
    created_by_id   = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_at      = db.Column(db.DateTime, default=datetime.utcnow)

    created_by      = db.relationship("User", backref="reports")

# -----------------------------------------------------------------------------
# Utilidades de auth
# -----------------------------------------------------------------------------
def auth_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return jsonify({"error": "No autorizado"}), 401
        token = auth.split(" ", 1)[1].strip()
        user = User.query.filter_by(token=token).first()
        if not user:
            return jsonify({"error": "Token inválido"}), 401
        request.current_user = user
        return f(*args, **kwargs)
    return wrapper

def admin_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if not getattr(request, "current_user", None):
            return jsonify({"error": "No autorizado"}), 401
        if request.current_user.role != "admin":
            return jsonify({"error": "Requiere rol admin"}), 403
        return f(*args, **kwargs)
    return wrapper

# -----------------------------------------------------------------------------
# Inicialización de BD + seed de admin
# -----------------------------------------------------------------------------
def init_db_and_seed():
    db.create_all()
    admin_email = os.environ.get("ADMIN_EMAIL")
    admin_user  = os.environ.get("ADMIN_USER", "admin")
    admin_pass  = os.environ.get("ADMIN_PASSWORD")

    # Crea admin si no existe y hay credenciales en env
    if admin_email and admin_pass:
        exists = User.query.filter(
            (User.email == admin_email) | (User.username == admin_user)
        ).first()
        if not exists:
            u = User(email=admin_email, username=admin_user, role="admin")
            u.set_password(admin_pass)
            db.session.add(u)
            db.session.commit()

with app.app_context():
    init_db_and_seed()

# -----------------------------------------------------------------------------
# Rutas públicas
# -----------------------------------------------------------------------------
@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "time": datetime.utcnow().isoformat() + "Z"})

@app.route("/api/test")
def test():
    return jsonify({"message": "Backend conectado correctamente con PostgreSQL!"})

# Auth
@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email_or_user = (data.get("email") or "").strip().lower()
    username      = (data.get("username") or "").strip().lower()
    password      = data.get("password") or ""

    user = None
    if email_or_user:
        user = User.query.filter(db.func.lower(User.email) == email_or_user).first()
    if not user and username:
        user = User.query.filter(db.func.lower(User.username) == username).first()

    if not user or not user.check_password(password):
        return jsonify({"error": "Credenciales inválidas"}), 401

    token = user.issue_token()
    return jsonify({
        "token": token,
        "user": {"id": user.id, "email": user.email, "username": user.username, "role": user.role}
    })

@app.route("/api/logout", methods=["POST"])
@auth_required
def logout():
    request.current_user.revoke_token()
    return jsonify({"message": "Sesión cerrada"})

# Registro (solo admin) o abierto si ALLOW_OPEN_SIGNUP=true
@app.route("/api/register", methods=["POST"])
def register():
    allow_open = os.environ.get("ALLOW_OPEN_SIGNUP", "false").lower() == "true"
    data = request.get_json() or {}

    if not allow_open:
        # Solo admin
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return jsonify({"error": "Solo admin puede registrar usuarios"}), 403
        token = auth.split(" ", 1)[1].strip()
        admin = User.query.filter_by(token=token, role="admin").first()
        if not admin:
            return jsonify({"error": "Solo admin puede registrar usuarios"}), 403

    email = (data.get("email") or "").strip().lower()
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    role = data.get("role", "user")

    if not email or not username or not password:
        return jsonify({"error": "email, username y password son requeridos"}), 400

    if User.query.filter((User.email == email) | (User.username == username)).first():
        return jsonify({"error": "Usuario ya existe"}), 400

    u = User(email=email, username=username, role=role)
    u.set_password(password)
    db.session.add(u)
    db.session.commit()

    return jsonify({"message": "Usuario creado", "id": u.id}), 201

# -----------------------------------------------------------------------------
# Usuarios (admin)
# -----------------------------------------------------------------------------
@app.route("/api/users", methods=["GET"])
@auth_required
@admin_required
def list_users():
    users = User.query.order_by(User.id.desc()).all()
    return jsonify([
        {"id": u.id, "email": u.email, "username": u.username, "role": u.role, "created_at": u.created_at.isoformat()}
        for u in users
    ])

@app.route("/api/users/<int:user_id>", methods=["PATCH", "DELETE"])
@auth_required
@admin_required
def manage_user(user_id):
    u = User.query.get_or_404(user_id)
    if request.method == "DELETE":
        # Evitar borrarse a sí mismo si único admin
        if u.role == "admin" and User.query.filter_by(role="admin").count() == 1:
            return jsonify({"error": "No puedes eliminar el único admin"}), 400
        db.session.delete(u)
        db.session.commit()
        return jsonify({"message": "Usuario eliminado"})
    else:
        data = request.get_json() or {}
        if "role" in data:
            u.role = data["role"]
        if "password" in data and data["password"]:
            u.set_password(data["password"])
        db.session.commit()
        return jsonify({"message": "Usuario actualizado"})

# -----------------------------------------------------------------------------
# Órdenes
# -----------------------------------------------------------------------------
@app.route("/api/orders", methods=["GET", "POST"])
@auth_required
def orders():
    if request.method == "GET":
        q = Order.query.order_by(Order.id.desc())
        client = request.args.get("client")
        status = request.args.get("status")
        if client:
            q = q.filter(Order.client.ilike(f"%{client}%"))
        if status:
            q = q.filter(Order.status == status)
        result = []
        for o in q.all():
            result.append({
                "id": o.id,
                "invoice": o.invoice,
                "client": o.client,
                "date": o.date.isoformat() if o.date else None,
                "status": o.status,
                "created_by": o.created_by.username if o.created_by else None,
                "created_at": o.created_at.isoformat(),
                "line_count": len(o.lines),
            })
        return jsonify(result)

    data = request.get_json() or {}
    invoice = data.get("invoice")
    if not invoice:
        return jsonify({"error": "invoice es requerido"}), 400

    order = Order(
        invoice=invoice,
        client=data.get("client"),
        date=datetime.fromisoformat(data["date"]).date() if data.get("date") else None,
        status=data.get("status", "open"),
        created_by_id=request.current_user.id,
    )
    db.session.add(order)
    db.session.commit()
    return jsonify({"message": "Orden creada", "id": order.id}), 201

@app.route("/api/orders/<int:order_id>", methods=["GET", "PATCH", "DELETE"])
@auth_required
def order_detail(order_id):
    o = Order.query.get_or_404(order_id)
    if request.method == "GET":
        return jsonify({
            "id": o.id,
            "invoice": o.invoice,
            "client": o.client,
            "date": o.date.isoformat() if o.date else None,
            "status": o.status,
            "created_by": o.created_by.username if o.created_by else None,
            "lines": [{
                "id": l.id, "part_number": l.part_number, "description": l.description,
                "quantity": l.quantity, "unit_price": str(l.unit_price)
            } for l in o.lines]
        })
    elif request.method == "PATCH":
        data = request.get_json() or {}
        o.invoice = data.get("invoice", o.invoice)
        o.client = data.get("client", o.client)
        if "date" in data:
            o.date = datetime.fromisoformat(data["date"]).date() if data["date"] else None
        if "status" in data:
            o.status = data["status"]
        db.session.commit()
        return jsonify({"message": "Orden actualizada"})
    else:
        db.session.delete(o)
        db.session.commit()
        return jsonify({"message": "Orden eliminada"})

# Líneas
@app.route("/api/orders/<int:order_id>/lines", methods=["GET", "POST"])
@auth_required
def order_lines(order_id):
    Order.query.get_or_404(order_id)
    if request.method == "GET":
        lines = OrderLine.query.filter_by(order_id=order_id).order_by(OrderLine.id.asc()).all()
        return jsonify([{
            "id": l.id, "part_number": l.part_number, "description": l.description,
            "quantity": l.quantity, "unit_price": str(l.unit_price)
        } for l in lines])
    data = request.get_json() or {}
    if not data.get("part_number"):
        return jsonify({"error": "part_number es requerido"}), 400
    line = OrderLine(
        order_id=order_id,
        part_number=data["part_number"],
        description=data.get("description"),
        quantity=int(data.get("quantity") or 1),
        unit_price=data.get("unit_price") or 0
    )
    db.session.add(line)
    db.session.commit()
    return jsonify({"message": "Línea creada", "id": line.id}), 201

@app.route("/api/lines/<int:line_id>", methods=["PATCH", "DELETE"])
@auth_required
def line_detail(line_id):
    l = OrderLine.query.get_or_404(line_id)
    if request.method == "PATCH":
        data = request.get_json() or {}
        l.part_number = data.get("part_number", l.part_number)
        l.description = data.get("description", l.description)
        if "quantity" in data:
            l.quantity = int(data["quantity"])
        if "unit_price" in data:
            l.unit_price = data["unit_price"]
        db.session.commit()
        return jsonify({"message": "Línea actualizada"})
    db.session.delete(l)
    db.session.commit()
    return jsonify({"message": "Línea eliminada"})

# -----------------------------------------------------------------------------
# Reportes
# -----------------------------------------------------------------------------
@app.route("/api/reports", methods=["GET", "POST"])
@auth_required
def reports():
    if request.method == "GET":
        r = Report.query.order_by(Report.id.desc()).all()
        return jsonify([{
            "id": x.id, "title": x.title, "content_json": x.content_json,
            "created_by": x.created_by.username if x.created_by else None,
            "created_at": x.created_at.isoformat()
        } for x in r])
    data = request.get_json() or {}
    if not data.get("title") or not data.get("content_json"):
        return jsonify({"error": "title y content_json son requeridos"}), 400
    rep = Report(
        title=data["title"],
        content_json=data["content_json"],  # envía JSON.stringify(...) desde el frontend
        created_by_id=request.current_user.id
    )
    db.session.add(rep)
    db.session.commit()
    return jsonify({"message": "Reporte creado", "id": rep.id}), 201

# -----------------------------------------------------------------------------
# Main (para local). En Render usa gunicorn.
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
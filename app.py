from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import os

app = Flask(__name__)
CORS(app)

# Configura tu URL de PostgreSQL desde Render aquí
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get("DATABASE_URL", "postgresql://shipping_db_nktl_user:tqrEny3WooYT1o3Gd2iaCx8lNCSYe4KE@dpg-d1v9l349c44c73dmcb3g-a/shipping_db_nktl")
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Modelos
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)

class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    invoice = db.Column(db.String(100), nullable=False)
    client = db.Column(db.String(100))
    date = db.Column(db.String(50))

class Line(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('order.id'))
    part_number = db.Column(db.String(100))
    quantity = db.Column(db.Integer)

@app.before_request
def create_tables_once():
    if not hasattr(app, 'has_created_tables'):
        db.create_all()
        app.has_created_tables = True

@app.route("/api/test")
def test():
    return jsonify({"message": "Backend conectado correctamente!"})

@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data["email"]).first()
    if user and check_password_hash(user.password, data["password"]):
        return jsonify({"message": "Login exitoso", "user": {"email": user.email, "is_admin": user.is_admin}})
    return jsonify({"error": "Credenciales inválidas"}), 401

@app.route("/api/users", methods=["GET"])
def get_users():
    users = User.query.all()
    return jsonify([{"email": u.email, "is_admin": u.is_admin} for u in users])

@app.route("/api/orders", methods=["GET", "POST"])
def manage_orders():
    if request.method == "GET":
        orders = Order.query.all()
        return jsonify([{"id": o.id, "invoice": o.invoice, "client": o.client, "date": o.date} for o in orders])
    elif request.method == "POST":
        data = request.get_json()
        order = Order(invoice=data["invoice"], client=data.get("client"), date=data.get("date"))
        db.session.add(order)
        db.session.commit()
        return jsonify({"message": "Orden registrada", "order_id": order.id})

@app.route("/api/lines", methods=["POST"])
def add_line():
    data = request.get_json()
    line = Line(order_id=data["order_id"], part_number=data["part_number"], quantity=data["quantity"])
    db.session.add(line)
    db.session.commit()
    return jsonify({"message": "Línea añadida"})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5432))
    app.run(host="0.0.0.0", port=port)
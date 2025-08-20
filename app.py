import os
import secrets
from datetime import datetime
from functools import wraps

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

# -------------------------------------------------------------------------
# Configuración base
# -------------------------------------------------------------------------
app = Flask(__name__)

# CORS: permite tu frontend en producción y todo en local
FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN")
print(">> FRONTEND_ORIGIN =", FRONTEND_ORIGIN)  # debug en logs de Render

if FRONTEND_ORIGIN:
    # Solo permite tu frontend en producción
    CORS(app, origins=[FRONTEND_ORIGIN], supports_credentials=True)
else:
    # En desarrollo, permite todo (útil para pruebas en localhost:5173)
    CORS(app, origins="*", supports_credentials=True)

# -------------------------------------------------------------------------
# Configuración de base de datos
# -------------------------------------------------------------------------
db_url = os.environ.get("DATABASE_URL", "sqlite:///local.db")

# Render a veces da postgres:// pero SQLAlchemy espera postgresql://
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

app.config["SQLALCHEMY_DATABASE_URI"] = db_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)

# -------------------------------------------------------------------------
# Ejemplo de rutas
# -------------------------------------------------------------------------

@app.route("/")
def home():
    return jsonify({"message": "Backend funcionando 🚀"})

@app.route("/login", methods=["POST"])
def login():
    data = request.json
    if not data or "username" not in data or "password" not in data:
        return jsonify({"error": "Datos incompletos"}), 400

    # Ejemplo de login simple
    if data["username"] == "admin" and data["password"] == "1234":
        token = secrets.token_hex(16)
        return jsonify({"message": "Login correcto", "token": token})

    return jsonify({"error": "Credenciales inválidas"}), 401


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)


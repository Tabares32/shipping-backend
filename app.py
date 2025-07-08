from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os

app = Flask(__name__)
CORS(app)

USERS_FILE = "users.json"

def load_users():
    if not os.path.exists(USERS_FILE):
        return []
    with open(USERS_FILE, "r") as f:
        return json.load(f)

def save_users(users):
    with open(USERS_FILE, "w") as f:
        json.dump(users, f, indent=2)

@app.route("/api/test")
def test():
    return jsonify({"message": "Backend conectado correctamente!"})

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    users = load_users()
    user = next((u for u in users if u["username"] == username and u["password"] == password), None)

    if user:
        return jsonify({"user": user})
    else:
        return jsonify({"error": "Usuario o contraseña incorrectos."}), 401

@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    role = data.get("role", "normal")

    if not username or not password:
        return jsonify({"error": "Usuario y contraseña requeridos."}), 400

    users = load_users()
    if any(u["username"] == username for u in users):
        return jsonify({"error": "El usuario ya existe."}), 400

    new_user = {
        "id": str(len(users) + 1),
        "username": username,
        "password": password,
        "role": role
    }
    users.append(new_user)
    save_users(users)

    return jsonify({"user": new_user}), 201

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000, debug=True)
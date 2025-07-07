from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route("/api/test")
def test():
    return jsonify({"message": "Backend conectado correctamente!"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000, debug=True)
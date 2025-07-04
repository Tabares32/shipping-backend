from flask import Flask
from flask_cors import CORS
from routes import shipping_bp
from models import init_db

app = Flask(__name__)
CORS(app)

app.register_blueprint(shipping_bp, url_prefix="/api")

if __name__ == "__main__":
    init_db()
    import os
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
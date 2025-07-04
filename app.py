from flask import Flask
from flask_cors import CORS
from routes import shipping_bp
from models import init_db

app = Flask(__name__)
CORS(app)

app.register_blueprint(shipping_bp, url_prefix="/api")

if __name__ == "__main__":
    init_db()
    app.run(debug=True)
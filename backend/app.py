import os
from flask import Flask
from api import api
from flask_cors import CORS
from config import CORS_ORIGINS


app = Flask(__name__)
app.secret_key = os.urandom(24)

# Configure CORS properly
CORS(app, resources={r"/api/*": {"origins": CORS_ORIGINS}})


app.register_blueprint(api)

if __name__ == "__main__":
    print(f"Starting Flask server on port {os.environ.get('PORT', 8080)}...")
    port = int(os.environ.get("PORT", 8080))
    app.run(debug=False, host="0.0.0.0", port=port)

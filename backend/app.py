import os
from flask import Flask
from api import api
from flask_cors import CORS

app = Flask(__name__)
app.secret_key = os.urandom(24)
app.register_blueprint(api)
CORS(app)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(debug=False, host="0.0.0.0", port=port)

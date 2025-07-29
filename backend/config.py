import os

ENV = os.getenv("ENV", "development")

DEFAULT_DEV_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]

CORS_ALLOWED_ORIGINS = os.getenv("CORS_ALLOWED_ORIGINS", "")
CORS_ORIGINS = [origin.strip() for origin in CORS_ALLOWED_ORIGINS.split(",") if origin.strip()]

if ENV != "production":
    CORS_ORIGINS += DEFAULT_DEV_ORIGINS

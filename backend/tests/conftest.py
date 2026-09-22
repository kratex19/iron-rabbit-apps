"""Shared pytest bootstrap: load backend/.env + frontend/.env so tests
have MONGO_URL, DB_NAME, ADMIN_TOKEN, REACT_APP_BACKEND_URL available."""
import os
from pathlib import Path

try:
    from dotenv import load_dotenv
    root = Path(__file__).resolve().parents[2]
    load_dotenv(root / "backend" / ".env", override=False)
    load_dotenv(root / "frontend" / ".env", override=False)
except Exception:
    pass

# Repair #10 · No hardcoded ADMIN_TOKEN fallback here — python-dotenv above
# already populates it from backend/.env. If the env var is missing, tests
# must fail loudly instead of silently authenticating with a leaked value.

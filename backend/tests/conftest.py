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

os.environ.setdefault("ADMIN_TOKEN", "irr-admin-8f3a2b91c4d7e6f5")

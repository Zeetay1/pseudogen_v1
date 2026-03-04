# backend/database.py
"""
SQLite database and user CRUD for Pseudogen auth.
"""
import sqlite3
from pathlib import Path

_BACKEND_DIR = Path(__file__).resolve().parent
DB_PATH = _BACKEND_DIR / "pseudogen.db"


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create users table if it does not exist."""
    conn = get_connection()
    try:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                hashed_password TEXT NOT NULL,
                plan TEXT NOT NULL DEFAULT 'free',
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        """)
        conn.commit()
    finally:
        conn.close()


def get_user_by_email(email: str) -> dict | None:
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT id, email, hashed_password, plan, created_at FROM users WHERE email = ?",
            (email.strip().lower(),),
        ).fetchone()
        if row is None:
            return None
        return dict(row)
    finally:
        conn.close()


def get_user_by_id(user_id: int) -> dict | None:
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT id, email, plan, created_at FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        if row is None:
            return None
        return dict(row)
    finally:
        conn.close()


def create_user(email: str, hashed_password: str, plan: str = "free") -> dict:
    conn = get_connection()
    try:
        cursor = conn.execute(
            "INSERT INTO users (email, hashed_password, plan) VALUES (?, ?, ?)",
            (email.strip().lower(), hashed_password, plan),
        )
        conn.commit()
        user_id = cursor.lastrowid
        return {"id": user_id, "email": email.strip().lower(), "plan": plan}
    finally:
        conn.close()

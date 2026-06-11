import sqlite3
from datetime import datetime, timezone
from pathlib import Path

_BACKEND_DIR = Path(__file__).resolve().parent
DB_PATH = _BACKEND_DIR / "pseudogen.db"

GUEST_DAILY_LIMIT = 5
USER_DAILY_LIMIT = 10


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
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
        conn.execute("""
            CREATE TABLE IF NOT EXISTS daily_usage (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                identifier TEXT NOT NULL,
                date TEXT NOT NULL,
                count INTEGER NOT NULL DEFAULT 0,
                UNIQUE(identifier, date)
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
        return dict(row) if row else None
    finally:
        conn.close()


def get_user_by_id(user_id: int) -> dict | None:
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT id, email, plan, created_at FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        return dict(row) if row else None
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
        return {"id": cursor.lastrowid, "email": email.strip().lower(), "plan": plan}
    finally:
        conn.close()


def _today_utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def get_usage_today(identifier: str) -> int:
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT count FROM daily_usage WHERE identifier = ? AND date = ?",
            (identifier, _today_utc()),
        ).fetchone()
        return row["count"] if row else 0
    finally:
        conn.close()


def increment_usage_today(identifier: str) -> int:
    today = _today_utc()
    conn = get_connection()
    try:
        conn.execute(
            """
            INSERT INTO daily_usage (identifier, date, count)
            VALUES (?, ?, 1)
            ON CONFLICT(identifier, date) DO UPDATE SET count = count + 1
            """,
            (identifier, today),
        )
        conn.commit()
        row = conn.execute(
            "SELECT count FROM daily_usage WHERE identifier = ? AND date = ?",
            (identifier, today),
        ).fetchone()
        return row["count"]
    finally:
        conn.close()

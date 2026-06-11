import os
import hashlib
import secrets
from datetime import datetime, timezone, timedelta
from pathlib import Path

_BACKEND_DIR = Path(__file__).resolve().parent
DB_PATH = _BACKEND_DIR / "pseudogen.db"

_USE_PG = bool(os.getenv("DATABASE_URL"))
P = "%s" if _USE_PG else "?"

GUEST_DAILY_LIMIT = 5
USER_DAILY_LIMIT = 10


def get_connection():
    if _USE_PG:
        import psycopg2
        url = os.getenv("DATABASE_URL", "")
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        return psycopg2.connect(url)
    else:
        import sqlite3
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn


def _one(conn, sql, params=()):
    if _USE_PG:
        import psycopg2.extras
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(sql, params)
        row = cur.fetchone()
        return dict(row) if row else None
    else:
        row = conn.execute(sql, params).fetchone()
        return dict(row) if row else None


def _exec(conn, sql, params=()):
    if _USE_PG:
        cur = conn.cursor()
        cur.execute(sql, params)
        return cur
    else:
        return conn.execute(sql, params)


def init_db():
    conn = get_connection()
    try:
        if _USE_PG:
            _exec(conn, """
                CREATE TABLE IF NOT EXISTS users (
                    id BIGSERIAL PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    hashed_password TEXT NOT NULL,
                    plan TEXT NOT NULL DEFAULT 'free',
                    created_at TEXT NOT NULL DEFAULT NOW()::TEXT
                )
            """)
            _exec(conn, """
                CREATE TABLE IF NOT EXISTS daily_usage (
                    id BIGSERIAL PRIMARY KEY,
                    identifier TEXT NOT NULL,
                    date TEXT NOT NULL,
                    count INTEGER NOT NULL DEFAULT 0,
                    UNIQUE(identifier, date)
                )
            """)
            _exec(conn, """
                CREATE TABLE IF NOT EXISTS refresh_tokens (
                    id BIGSERIAL PRIMARY KEY,
                    token_hash TEXT UNIQUE NOT NULL,
                    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    expires_at TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT NOW()::TEXT
                )
            """)
        else:
            _exec(conn, """
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT UNIQUE NOT NULL,
                    hashed_password TEXT NOT NULL,
                    plan TEXT NOT NULL DEFAULT 'free',
                    created_at TEXT NOT NULL DEFAULT (datetime('now'))
                )
            """)
            _exec(conn, """
                CREATE TABLE IF NOT EXISTS daily_usage (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    identifier TEXT NOT NULL,
                    date TEXT NOT NULL,
                    count INTEGER NOT NULL DEFAULT 0,
                    UNIQUE(identifier, date)
                )
            """)
            _exec(conn, """
                CREATE TABLE IF NOT EXISTS refresh_tokens (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    token_hash TEXT UNIQUE NOT NULL,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    expires_at TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT (datetime('now'))
                )
            """)
        conn.commit()
    finally:
        conn.close()


def get_user_by_email(email: str) -> dict | None:
    conn = get_connection()
    try:
        return _one(
            conn,
            f"SELECT id, email, hashed_password, plan, created_at FROM users WHERE email = {P}",
            (email.strip().lower(),),
        )
    finally:
        conn.close()


def get_user_by_id(user_id: int) -> dict | None:
    conn = get_connection()
    try:
        return _one(
            conn,
            f"SELECT id, email, plan, created_at FROM users WHERE id = {P}",
            (user_id,),
        )
    finally:
        conn.close()


def create_user(email: str, hashed_password: str, plan: str = "free") -> dict:
    conn = get_connection()
    try:
        if _USE_PG:
            row = _one(
                conn,
                f"INSERT INTO users (email, hashed_password, plan) VALUES ({P}, {P}, {P}) RETURNING id, email, plan",
                (email.strip().lower(), hashed_password, plan),
            )
            conn.commit()
            return row
        else:
            cur = _exec(
                conn,
                f"INSERT INTO users (email, hashed_password, plan) VALUES ({P}, {P}, {P})",
                (email.strip().lower(), hashed_password, plan),
            )
            conn.commit()
            return {"id": cur.lastrowid, "email": email.strip().lower(), "plan": plan}
    finally:
        conn.close()


def _today_utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def get_usage_today(identifier: str) -> int:
    conn = get_connection()
    try:
        row = _one(
            conn,
            f"SELECT count FROM daily_usage WHERE identifier = {P} AND date = {P}",
            (identifier, _today_utc()),
        )
        return row["count"] if row else 0
    finally:
        conn.close()


def increment_usage_today(identifier: str) -> int:
    today = _today_utc()
    conn = get_connection()
    try:
        _exec(
            conn,
            f"""
            INSERT INTO daily_usage (identifier, date, count)
            VALUES ({P}, {P}, 1)
            ON CONFLICT(identifier, date) DO UPDATE SET count = daily_usage.count + 1
            """,
            (identifier, today),
        )
        conn.commit()
        row = _one(
            conn,
            f"SELECT count FROM daily_usage WHERE identifier = {P} AND date = {P}",
            (identifier, today),
        )
        return row["count"] if row else 1
    finally:
        conn.close()


# ── Refresh tokens ────────────────────────────────────────────────────────────

REFRESH_TOKEN_DAYS = 7


def _hash_token(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def create_refresh_token(user_id: int) -> str:
    """Create a refresh token, persist its hash, return the raw value."""
    value = secrets.token_urlsafe(32)
    token_hash = _hash_token(value)
    expires_at = (
        datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_DAYS)
    ).isoformat()
    conn = get_connection()
    try:
        _exec(
            conn,
            f"INSERT INTO refresh_tokens (token_hash, user_id, expires_at) VALUES ({P}, {P}, {P})",
            (token_hash, user_id, expires_at),
        )
        conn.commit()
    finally:
        conn.close()
    return value


def validate_refresh_token(value: str) -> int | None:
    """Return user_id if valid and not expired, else None."""
    token_hash = _hash_token(value)
    conn = get_connection()
    try:
        row = _one(
            conn,
            f"SELECT user_id, expires_at FROM refresh_tokens WHERE token_hash = {P}",
            (token_hash,),
        )
        if not row:
            return None
        expires = datetime.fromisoformat(row["expires_at"])
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expires:
            _exec(conn, f"DELETE FROM refresh_tokens WHERE token_hash = {P}", (token_hash,))
            conn.commit()
            return None
        return row["user_id"]
    finally:
        conn.close()


def revoke_refresh_token(value: str) -> None:
    token_hash = _hash_token(value)
    conn = get_connection()
    try:
        _exec(conn, f"DELETE FROM refresh_tokens WHERE token_hash = {P}", (token_hash,))
        conn.commit()
    finally:
        conn.close()


def revoke_all_refresh_tokens(user_id: int) -> None:
    conn = get_connection()
    try:
        _exec(conn, f"DELETE FROM refresh_tokens WHERE user_id = {P}", (user_id,))
        conn.commit()
    finally:
        conn.close()

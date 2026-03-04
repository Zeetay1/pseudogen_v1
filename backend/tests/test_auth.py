"""
Tests for auth endpoints: register, login, /me.
Uses real SQLite DB (backend/pseudogen.db). Register uses a unique email per run to avoid conflicts.
"""
import time
import pytest
from fastapi.testclient import TestClient

from app import app

client = TestClient(app)


def _unique_email():
    return f"test-{int(time.time() * 1000)}@example.com"


def test_register_returns_token():
    email = _unique_email()
    r = client.post("/auth/register", json={"email": email, "password": "password123"})
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    assert data.get("token_type") == "bearer"


def test_register_rejects_short_password():
    r = client.post("/auth/register", json={"email": "a@b.com", "password": "short"})
    assert r.status_code == 400
    assert "8" in r.json().get("detail", "")


def test_register_rejects_duplicate_email():
    email = _unique_email()
    client.post("/auth/register", json={"email": email, "password": "password123"})
    r = client.post("/auth/register", json={"email": email, "password": "password123"})
    assert r.status_code == 400
    assert "already" in r.json().get("detail", "").lower()


def test_login_returns_token():
    email = _unique_email()
    client.post("/auth/register", json={"email": email, "password": "password123"})
    r = client.post("/auth/login", json={"email": email, "password": "password123"})
    assert r.status_code == 200
    assert "access_token" in r.json()


def test_login_rejects_wrong_password():
    email = _unique_email()
    client.post("/auth/register", json={"email": email, "password": "password123"})
    r = client.post("/auth/login", json={"email": email, "password": "wrong"})
    assert r.status_code == 401


def test_me_returns_user_with_valid_token():
    email = _unique_email()
    reg = client.post("/auth/register", json={"email": email, "password": "password123"})
    token = reg.json()["access_token"]
    r = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    data = r.json()
    assert data["email"] == email
    assert data["plan"] == "free"


def test_me_rejects_invalid_token():
    r = client.get("/auth/me", headers={"Authorization": "Bearer invalid"})
    assert r.status_code == 401

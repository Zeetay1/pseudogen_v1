"""
Unit tests for Pseudogen FastAPI app.
Tests GenerateRequest validation, style/detail handling, and generate endpoint with mocked LLM.
Auth is overridden so generate endpoints receive a fake user.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch

from app import app, GenerateRequest
from auth import get_current_user

# Override auth so generate endpoints see a fake user (plan from user, not header)
FAKE_USER_FREE = {"id": 1, "email": "test@test.com", "plan": "free"}
FAKE_USER_PREMIUM = {"id": 2, "email": "premium@test.com", "plan": "premium"}


async def _fake_user_free():
    return FAKE_USER_FREE


async def _fake_user_premium():
    return FAKE_USER_PREMIUM


app.dependency_overrides[get_current_user] = _fake_user_free
client = TestClient(app)


def test_root_returns_service_info():
    """GET / returns service info and docs link."""
    r = client.get("/")
    assert r.status_code == 200
    data = r.json()
    assert data.get("service") == "Pseudogen API"
    assert data.get("docs") == "/docs"
    assert "generate-pseudocode" in data.get("generate", "")


def test_generate_request_validates_problem_description_min_length():
    """GenerateRequest rejects empty problem_description."""
    with patch("app.call_llm") as mock_llm:
        mock_llm.return_value = "BEGIN\nEND"
        r = client.post(
            "/generate-pseudocode",
            json={
                "problem_description": "",
                "style": "Academic",
                "detail": "Concise",
            },
        )
    assert r.status_code == 422


def test_generate_request_validates_style_regex():
    """GenerateRequest rejects invalid style."""
    with patch("app.call_llm"):
        r = client.post(
            "/generate-pseudocode",
            json={
                "problem_description": "Sort a list",
                "style": "InvalidStyle",
                "detail": "Concise",
            },
        )
    assert r.status_code == 422


def test_generate_request_validates_detail_regex():
    """GenerateRequest rejects invalid detail."""
    with patch("app.call_llm"):
        r = client.post(
            "/generate-pseudocode",
            json={
                "problem_description": "Sort a list",
                "style": "Academic",
                "detail": "Medium",
            },
        )
    assert r.status_code == 422


@pytest.mark.parametrize("style", ["Academic", "Developer-Friendly", "English-Like", "Step-by-Step"])
@pytest.mark.parametrize("detail", ["Concise", "Detailed"])
def test_generate_returns_markdown_for_valid_input(style, detail):
    """Valid request returns 200 and markdown from mocked call_llm."""
    with patch("app.call_llm") as mock_llm:
        mock_llm.return_value = "BEGIN\n  SORT list\nEND"
        r = client.post(
            "/generate-pseudocode",
            json={
                "problem_description": "Sort a list of numbers",
                "style": style,
                "detail": detail,
            },
        )
    assert r.status_code == 200
    data = r.json()
    assert "markdown" in data
    assert data["markdown"] == "BEGIN\n  SORT list\nEND"
    mock_llm.assert_called_once()


def test_generate_returns_502_when_llm_fails():
    """When call_llm raises, endpoint returns 502."""
    with patch("app.call_llm") as mock_llm:
        mock_llm.side_effect = RuntimeError("API key invalid")
        r = client.post(
            "/generate-pseudocode",
            json={
                "problem_description": "Sort a list",
                "style": "Academic",
                "detail": "Concise",
            },
        )
    assert r.status_code == 502
    assert "API key invalid" in r.json().get("detail", "")


def test_generate_request_max_length_12000():
    """Problem description over 12000 chars is rejected by schema."""
    with patch("app.call_llm"):
        r = client.post(
            "/generate-pseudocode",
            json={
                "problem_description": "x" * 12001,
                "style": "Academic",
                "detail": "Concise",
            },
        )
    assert r.status_code == 422


def test_free_plan_rejects_input_over_4000_chars():
    """Without X-Plan: premium, input over 4000 chars returns 400."""
    with patch("app.call_llm"):
        r = client.post(
            "/generate-pseudocode",
            json={
                "problem_description": "x" * 4001,
                "style": "Academic",
                "detail": "Concise",
            },
        )
    assert r.status_code == 400
    assert "4000" in r.json().get("detail", "")


def test_premium_plan_accepts_input_up_to_12000_chars():
    """With user plan premium, input up to 12000 chars is accepted."""
    app.dependency_overrides[get_current_user] = _fake_user_premium
    try:
        with patch("app.call_llm") as mock_llm:
            mock_llm.return_value = "BEGIN\nEND"
            r = client.post(
                "/generate-pseudocode",
                json={
                    "problem_description": "y" * 10000,
                    "style": "Academic",
                    "detail": "Concise",
                },
            )
        assert r.status_code == 200
        assert r.json().get("markdown") == "BEGIN\nEND"
    finally:
        app.dependency_overrides[get_current_user] = _fake_user_free

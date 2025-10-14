# backend/check_groq_models.py
"""
Utility script to check available Groq LLM models.
Requires GROQ_API_KEY in backend/.env.
"""

import os
import requests
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")

API_URL = "https://api.groq.com/openai/v1/models"
api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    raise SystemExit("❌ Error: GROQ_API_KEY not set in backend/.env")

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json",
}

try:
    resp = requests.get(API_URL, headers=headers, timeout=15)
    resp.raise_for_status()
    data = resp.json().get("data", [])
    print("\nAvailable Groq models:\n")
    for m in data:
        print("-", m.get("id") or m.get("model") or m.get("name") or m)
except requests.exceptions.RequestException as e:
    print(f"API request failed: {e}")

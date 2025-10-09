# backend/check_groq_models.py
import os
import requests
from dotenv import load_dotenv
from pathlib import Path
load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")
API_URL = "https://api.groq.com/openai/v1/models"

api_key = os.getenv("GROQ_API_KEY")
if not api_key:
    raise SystemExit("Set GROQ_API_KEY in backend/.env")

headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

resp = requests.get(API_URL, headers=headers, timeout=15)
resp.raise_for_status()
data = resp.json().get("data", [])
print("Available Groq models:")
for m in data:
    # model id often in 'id' or 'model'
    print("-", m.get("id") or m.get("model") or m.get("name") or m)

# backend/utils.py
import os
import time
import openai
import requests
from anthropic import Anthropic
from requests.exceptions import RequestException

# Initialize clients
openai.api_key = os.getenv("OPENAI_API_KEY")
claude_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

def call_openai_with_retries(prompt, model=None, max_retries=3, backoff=1.0):
    model = model or os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    last_err = None
    for attempt in range(1, max_retries + 1):
        try:
            resp = openai.ChatCompletion.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=1200,
            )
            if "choices" in resp and len(resp.choices) > 0:
                text = resp.choices[0].message.get("content", "").strip()
                if text:
                    return text
            raise RuntimeError("Empty response from OpenAI")
        except Exception as e:
            last_err = e
            if attempt < max_retries:
                time.sleep(backoff * attempt)
            else:
                raise

def call_claude_with_retries(prompt, model=None, max_retries=3, backoff=1.0):
    model = model or os.getenv("CLAUDE_MODEL", "claude-3-sonnet-20240229")
    last_err = None
    for attempt in range(1, max_retries + 1):
        try:
            resp = claude_client.messages.create(
                model=model,
                max_tokens=1000,
                temperature=0.2,
                messages=[{"role": "user", "content": prompt}],
            )
            if resp.content and len(resp.content) > 0 and resp.content[0].type == "text":
                text = resp.content[0].text.strip()
                if text:
                    return text
            raise RuntimeError("Empty response from Claude")
        except Exception as e:
            last_err = e
            if attempt < max_retries:
                time.sleep(backoff * attempt)
            else:
                raise

def call_groq_with_retries(prompt, model=None, max_retries=3, backoff=1.0):
    api_key = os.getenv("GROQ_API_KEY")
    model = model or os.getenv("GROQ_MODEL", "llama3-8b-8192")

    if not api_key:
        raise RuntimeError("Missing GROQ_API_KEY")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2,
        "max_tokens": 1000
    }

    last_err = None
    for attempt in range(1, max_retries + 1):
        try:
            resp = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("choices"):
                    return data["choices"][0]["message"]["content"].strip()
                raise RuntimeError("Empty response from Groq")

            # Capture 400s with context
            print("Groq API error response:", resp.text)
            resp.raise_for_status()

        except Exception as e:
            last_err = e
            if attempt < max_retries:
                time.sleep(backoff * attempt)
            else:
                raise RuntimeError(f"Groq failed after {max_retries} attempts: {last_err}")


def call_llm(prompt):
    provider = os.getenv("PROVIDER", "openai").lower()
    if provider == "claude":
        return call_claude_with_retries(prompt)
    elif provider == "openai":
        return call_openai_with_retries(prompt)
    elif provider == "groq":
        return call_groq_with_retries(prompt)
    else:
        raise RuntimeError(f"Unsupported PROVIDER: {provider}")

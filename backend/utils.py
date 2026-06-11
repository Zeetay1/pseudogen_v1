import os
import time
import openai
import requests
import logging
from anthropic import Anthropic
from requests.exceptions import RequestException
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")

openai.api_key = os.getenv("OPENAI_API_KEY")
_claude = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


def call_openai_with_retries(prompt: str, model: str = None, max_retries: int = 3, backoff: float = 1.0) -> str:
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
            if resp.choices and resp.choices[0].message.get("content"):
                return resp.choices[0].message["content"].strip()
            raise RuntimeError("Empty response from OpenAI")
        except Exception as e:
            last_err = e
            logging.warning(f"OpenAI attempt {attempt} failed: {e}")
            if attempt < max_retries:
                time.sleep(backoff * attempt)
    raise RuntimeError(f"OpenAI failed after {max_retries} attempts: {last_err}")


def call_claude_with_retries(prompt: str, model: str = None, max_retries: int = 3, backoff: float = 1.0) -> str:
    model = model or os.getenv("CLAUDE_MODEL", "claude-3-5-haiku-20241022")
    last_err = None
    for attempt in range(1, max_retries + 1):
        try:
            resp = _claude.messages.create(
                model=model,
                max_tokens=1000,
                temperature=0.2,
                messages=[{"role": "user", "content": prompt}],
            )
            if resp.content and resp.content[0].type == "text":
                text = resp.content[0].text.strip()
                if text:
                    return text
            raise RuntimeError("Empty response from Claude")
        except Exception as e:
            last_err = e
            logging.warning(f"Claude attempt {attempt} failed: {e}")
            if attempt < max_retries:
                time.sleep(backoff * attempt)
    raise RuntimeError(f"Claude failed after {max_retries} attempts: {last_err}")


def call_groq_with_retries(prompt: str, model: str = None, max_retries: int = 3, backoff: float = 1.0) -> str:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("Missing GROQ_API_KEY")
    model = model or os.getenv("GROQ_MODEL", "llama3-8b-8192")
    ssl_verify = os.getenv("GROQ_SSL_VERIFY", "true").lower() != "false"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2,
        "max_tokens": 1000,
    }
    last_err = None
    for attempt in range(1, max_retries + 1):
        try:
            resp = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=30,
                verify=ssl_verify,
            )
            if resp.status_code == 200:
                data = resp.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content")
                if content:
                    return content.strip()
                raise RuntimeError("Empty response from Groq")
            logging.error(f"Groq API error ({resp.status_code}): {resp.text}")
            resp.raise_for_status()
        except (RequestException, Exception) as e:
            last_err = e
            logging.warning(f"Groq attempt {attempt} failed: {e}")
            if attempt < max_retries:
                time.sleep(backoff * attempt)
    raise RuntimeError(f"Groq failed after {max_retries} attempts: {last_err}")


def call_llm(prompt: str) -> str:
    provider = os.getenv("PROVIDER", "openai").lower()
    if provider == "claude" or provider == "anthropic":
        return call_claude_with_retries(prompt)
    elif provider == "openai":
        return call_openai_with_retries(prompt)
    elif provider == "groq":
        return call_groq_with_retries(prompt)
    raise RuntimeError(f"Unsupported PROVIDER: {provider}")


def call_groq_with_messages(messages: list, model: str = None, max_retries: int = 3, backoff: float = 1.0) -> str:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("Missing GROQ_API_KEY")
    model = model or os.getenv("GROQ_MODEL", "llama3-8b-8192")
    ssl_verify = os.getenv("GROQ_SSL_VERIFY", "true").lower() != "false"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {"model": model, "messages": messages, "temperature": 0.2, "max_tokens": 1000}
    last_err = None
    for attempt in range(1, max_retries + 1):
        try:
            resp = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers=headers, json=payload, timeout=30, verify=ssl_verify,
            )
            if resp.status_code == 200:
                content = resp.json().get("choices", [{}])[0].get("message", {}).get("content")
                if content:
                    return content.strip()
                raise RuntimeError("Empty response from Groq")
            logging.error(f"Groq API error ({resp.status_code}): {resp.text}")
            resp.raise_for_status()
        except (RequestException, Exception) as e:
            last_err = e
            logging.warning(f"Groq attempt {attempt} failed: {e}")
            if attempt < max_retries:
                time.sleep(backoff * attempt)
    raise RuntimeError(f"Groq failed after {max_retries} attempts: {last_err}")


def call_openai_with_messages(messages: list, model: str = None, max_retries: int = 3, backoff: float = 1.0) -> str:
    model = model or os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    last_err = None
    for attempt in range(1, max_retries + 1):
        try:
            resp = openai.ChatCompletion.create(
                model=model, messages=messages, temperature=0.2, max_tokens=1200,
            )
            if resp.choices and resp.choices[0].message.get("content"):
                return resp.choices[0].message["content"].strip()
            raise RuntimeError("Empty response from OpenAI")
        except Exception as e:
            last_err = e
            logging.warning(f"OpenAI attempt {attempt} failed: {e}")
            if attempt < max_retries:
                time.sleep(backoff * attempt)
    raise RuntimeError(f"OpenAI failed after {max_retries} attempts: {last_err}")


def call_claude_with_messages(messages: list, model: str = None, max_retries: int = 3, backoff: float = 1.0) -> str:
    model = model or os.getenv("CLAUDE_MODEL", "claude-3-5-haiku-20241022")
    system_parts = [m["content"] for m in messages if m.get("role") == "system"]
    non_system = [m for m in messages if m.get("role") != "system"]
    last_err = None
    for attempt in range(1, max_retries + 1):
        try:
            kwargs = {"model": model, "max_tokens": 1000, "temperature": 0.2, "messages": non_system}
            if system_parts:
                kwargs["system"] = " ".join(system_parts)
            resp = _claude.messages.create(**kwargs)
            if resp.content and resp.content[0].type == "text":
                text = resp.content[0].text.strip()
                if text:
                    return text
            raise RuntimeError("Empty response from Claude")
        except Exception as e:
            last_err = e
            logging.warning(f"Claude attempt {attempt} failed: {e}")
            if attempt < max_retries:
                time.sleep(backoff * attempt)
    raise RuntimeError(f"Claude failed after {max_retries} attempts: {last_err}")


def call_llm_messages(messages: list) -> str:
    provider = os.getenv("PROVIDER", "openai").lower()
    if provider in ("claude", "anthropic"):
        return call_claude_with_messages(messages)
    elif provider == "openai":
        return call_openai_with_messages(messages)
    elif provider == "groq":
        return call_groq_with_messages(messages)
    raise RuntimeError(f"Unsupported PROVIDER: {provider}")

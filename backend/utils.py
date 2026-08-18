import os
import time
import json
import hashlib
import logging
import openai
import requests
import structlog
from anthropic import Anthropic
from requests.exceptions import RequestException
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")

openai.api_key = os.getenv("OPENAI_API_KEY")
_claude = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# ── Structlog setup ───────────────────────────────────────────────────────────

def configure_logging() -> None:
    log_level = getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper(), logging.INFO)
    use_json = os.getenv("LOG_JSON", "false").lower() == "true"

    processors = [
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer() if use_json else structlog.dev.ConsoleRenderer(),
    ]
    structlog.configure(
        processors=processors,
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )
    logging.basicConfig(level=log_level, format="%(message)s")


configure_logging()
logger = structlog.get_logger("pseudogen")

# ── Redis (optional) ──────────────────────────────────────────────────────────

_redis = None
_redis_url = os.getenv("REDIS_URL")
if _redis_url:
    try:
        import redis as _redis_lib
        _redis = _redis_lib.from_url(_redis_url, decode_responses=True, socket_connect_timeout=2)
        _redis.ping()
        logger.info("redis.connected", url=_redis_url.split("@")[-1])
    except Exception as e:
        logger.warning("redis.unavailable", error=str(e))
        _redis = None


def get_cached_response(key: str) -> str | None:
    if not _redis:
        return None
    try:
        return _redis.get(f"pgcache:{key}")
    except Exception:
        return None


def set_cached_response(key: str, value: str, ttl: int = 3600) -> None:
    if not _redis:
        return
    try:
        _redis.setex(f"pgcache:{key}", ttl, value)
    except Exception:
        pass


def make_cache_key(problem: str, style: str, detail: str) -> str:
    payload = f"{style}:{detail}:{problem.strip().lower()}"
    return hashlib.sha256(payload.encode()).hexdigest()


# ── Single-turn LLM (non-streaming) ──────────────────────────────────────────

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
            logger.warning("openai.retry", attempt=attempt, error=str(e))
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
            logger.warning("claude.retry", attempt=attempt, error=str(e))
            if attempt < max_retries:
                time.sleep(backoff * attempt)
    raise RuntimeError(f"Claude failed after {max_retries} attempts: {last_err}")


def call_groq_with_retries(prompt: str, model: str = None, max_retries: int = 3, backoff: float = 1.0) -> str:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("Missing GROQ_API_KEY")
    model = model or os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
    ssl_verify = os.getenv("GROQ_SSL_VERIFY", "true").lower() != "false"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {"model": model, "messages": [{"role": "user", "content": prompt}], "temperature": 0.2, "max_tokens": 4096}
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
            logger.error("groq.error", status=resp.status_code)
            resp.raise_for_status()
        except (RequestException, Exception) as e:
            last_err = e
            logger.warning("groq.retry", attempt=attempt, error=str(e))
            if attempt < max_retries:
                time.sleep(backoff * attempt)
    raise RuntimeError(f"Groq failed after {max_retries} attempts: {last_err}")


def call_llm(prompt: str) -> str:
    provider = os.getenv("PROVIDER", "openai").lower()
    if provider in ("claude", "anthropic"):
        return call_claude_with_retries(prompt)
    elif provider == "openai":
        return call_openai_with_retries(prompt)
    elif provider == "groq":
        return call_groq_with_retries(prompt)
    raise RuntimeError(f"Unsupported PROVIDER: {provider}")


# ── Multi-turn LLM (non-streaming) ───────────────────────────────────────────

def call_groq_with_messages(messages: list, model: str = None, max_retries: int = 3, backoff: float = 1.0) -> str:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("Missing GROQ_API_KEY")
    model = model or os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
    ssl_verify = os.getenv("GROQ_SSL_VERIFY", "true").lower() != "false"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {"model": model, "messages": messages, "temperature": 0.2, "max_tokens": 4096}
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
            resp.raise_for_status()
        except (RequestException, Exception) as e:
            last_err = e
            logger.warning("groq.retry", attempt=attempt, error=str(e))
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
            logger.warning("openai.retry", attempt=attempt, error=str(e))
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
            logger.warning("claude.retry", attempt=attempt, error=str(e))
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


# ── Streaming LLM ─────────────────────────────────────────────────────────────

def call_groq_stream(messages: list, model: str = None):
    """Sync generator — yields text tokens from Groq SSE stream."""
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("Missing GROQ_API_KEY")
    model = model or os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
    ssl_verify = os.getenv("GROQ_SSL_VERIFY", "true").lower() != "false"
    resp = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={"model": model, "messages": messages, "temperature": 0.2, "max_tokens": 4096, "stream": True},
        timeout=60,
        verify=ssl_verify,
        stream=True,
    )
    resp.raise_for_status()
    for line in resp.iter_lines():
        if not line or line == b"data: [DONE]":
            continue
        if line.startswith(b"data: "):
            try:
                data = json.loads(line[6:])
                delta = data["choices"][0]["delta"].get("content", "")
                if delta:
                    yield delta
            except (json.JSONDecodeError, KeyError, IndexError):
                pass


def call_openai_stream(messages: list, model: str = None):
    """Sync generator — yields text tokens from OpenAI streaming."""
    model = model or os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    resp = openai.ChatCompletion.create(
        model=model, messages=messages, temperature=0.2, max_tokens=1200, stream=True,
    )
    for chunk in resp:
        delta = chunk["choices"][0]["delta"].get("content", "")
        if delta:
            yield delta


def call_claude_stream(messages: list, model: str = None):
    """Sync generator — yields text tokens from Claude streaming."""
    model = model or os.getenv("CLAUDE_MODEL", "claude-3-5-haiku-20241022")
    system_parts = [m["content"] for m in messages if m.get("role") == "system"]
    non_system = [m for m in messages if m.get("role") != "system"]
    kwargs = {"model": model, "max_tokens": 1000, "messages": non_system}
    if system_parts:
        kwargs["system"] = " ".join(system_parts)
    with _claude.messages.stream(**kwargs) as stream:
        for text in stream.text_stream:
            yield text


def call_llm_stream(messages: list):
    """Sync generator — dispatches to the configured provider's streaming function."""
    provider = os.getenv("PROVIDER", "openai").lower()
    if provider in ("claude", "anthropic"):
        yield from call_claude_stream(messages)
    elif provider == "openai":
        yield from call_openai_stream(messages)
    elif provider == "groq":
        yield from call_groq_stream(messages)
    else:
        raise RuntimeError(f"Unsupported PROVIDER: {provider}")

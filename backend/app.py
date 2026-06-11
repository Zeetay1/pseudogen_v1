import json
import os
from contextlib import asynccontextmanager
from pathlib import Path

import structlog
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Request, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from typing import Annotated

from ai_prompts import TEMPLATES
from utils import (
    call_llm,
    call_llm_messages,
    call_llm_stream,
    get_cached_response,
    set_cached_response,
    make_cache_key,
)
from database import (
    init_db,
    GUEST_DAILY_LIMIT,
    USER_DAILY_LIMIT,
    get_usage_today,
    increment_usage_today,
)
from auth import get_optional_user
from routers.auth import router as auth_router

_BACKEND_DIR = Path(__file__).resolve().parent
load_dotenv(dotenv_path=_BACKEND_DIR / ".env")

# ── Sentry (optional) ─────────────────────────────────────────────────────────
_SENTRY_DSN = os.getenv("SENTRY_DSN")
if _SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.starlette import StarletteIntegration
    sentry_sdk.init(
        dsn=_SENTRY_DSN,
        integrations=[StarletteIntegration(), FastApiIntegration()],
        traces_sample_rate=float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.2")),
        send_default_pii=False,
    )

_REQUIRED_ENV = ["PROVIDER"]
_PROVIDER_KEYS = {
    "openai": "OPENAI_API_KEY",
    "claude": "ANTHROPIC_API_KEY",
    "anthropic": "ANTHROPIC_API_KEY",
    "groq": "GROQ_API_KEY",
}


def _check_env() -> None:
    if os.getenv("SKIP_ENV_CHECK"):
        return
    missing = [k for k in _REQUIRED_ENV if not os.getenv(k)]
    if missing:
        raise RuntimeError(f"Missing required env vars: {', '.join(missing)}")
    provider = (os.getenv("PROVIDER") or "").lower()
    key_var = _PROVIDER_KEYS.get(provider)
    if key_var and not os.getenv(key_var):
        raise RuntimeError(f"PROVIDER={provider} requires {key_var} to be set")


_check_env()

logger = structlog.get_logger("pseudogen.app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    logger.info("app.started")
    yield
    logger.info("app.stopped")


# ── Rate limiter (Redis-backed when REDIS_URL is set) ─────────────────────────
_redis_url = os.getenv("REDIS_URL")
limiter = Limiter(
    key_func=get_remote_address,
    **{"storage_uri": _redis_url} if _redis_url else {},
)

app = FastAPI(title="Pseudogen API", lifespan=lifespan, docs_url=None, redoc_url=None)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS: credentials require explicit origins (can't mix * with allow_credentials=True)
_cors_origins_env = os.getenv("CORS_ORIGINS", "*").strip()
if _cors_origins_env == "*":
    _allow_origins = ["*"]
    _allow_credentials = False
else:
    _allow_origins = [o.strip() for o in _cors_origins_env.split(",") if o.strip()]
    _allow_credentials = True

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allow_origins,
    allow_credentials=_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_INPUT_LEN = 4000


class MessageItem(BaseModel):
    role: Annotated[str, Field(pattern="^(user|assistant|system)$")]
    content: Annotated[str, Field(min_length=1, max_length=8000)]


class GenerateRequest(BaseModel):
    problem_description: Annotated[str, Field(min_length=1, max_length=MAX_INPUT_LEN)]
    style: Annotated[str, Field(pattern="^(Academic|Developer-Friendly|English-Like|Step-by-Step)$")]
    detail: Annotated[str, Field(pattern="^(Concise|Detailed)$")]
    context: list[MessageItem] | None = None


class SummarizeRequest(BaseModel):
    text: Annotated[str, Field(min_length=1, max_length=2000)]


_STYLE_SYSTEM = {
    "Academic": (
        "You generate Academic pseudocode using uppercase keywords "
        "(BEGIN, END, IF, ELSE, WHILE, FOR, FUNCTION, RETURN) with formal, concise logical flow. "
        "Output Markdown formatted pseudocode only."
    ),
    "Developer-Friendly": (
        "You generate Developer-Friendly pseudocode with code-like syntax "
        "(Function, If, Else, While, For, Return), clear indentation, and comments where needed. "
        "Output Markdown formatted pseudocode only."
    ),
    "English-Like": (
        "You convert problems into plain English steps with no programming syntax. "
        "Output numbered or bulleted Markdown steps only."
    ),
    "Step-by-Step": (
        "You generate beginner-friendly pseudocode using simple English keywords "
        "(FUNCTION, IF, ELSE, WHILE, FOR, RETURN). "
        "Output Markdown formatted pseudocode only."
    ),
}

app.include_router(auth_router)
v1_router = APIRouter(prefix="/v1", tags=["v1"])


@app.get("/")
async def root():
    return {"service": "Pseudogen API", "version": "1"}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/usage")
async def usage(
    user: dict | None = Depends(get_optional_user),
    x_session_id: str | None = Header(default=None),
):
    if user:
        identifier = f"user:{user['id']}"
        limit = USER_DAILY_LIMIT
        is_guest = False
    elif x_session_id:
        identifier = f"session:{x_session_id}"
        limit = GUEST_DAILY_LIMIT
        is_guest = True
    else:
        return {"used": 0, "limit": GUEST_DAILY_LIMIT, "remaining": GUEST_DAILY_LIMIT, "is_guest": True}

    used = get_usage_today(identifier)
    return {"used": used, "limit": limit, "remaining": max(0, limit - used), "is_guest": is_guest}


@app.post("/summarize")
@limiter.limit("60/minute")
async def summarize_title(request: Request, req: SummarizeRequest):
    prompt = (
        "Write a 4-6 word title for this programming problem. "
        "Title case. No punctuation. No quotes. No explanation. Just the title:\n\n"
        + req.text[:500]
    )
    try:
        title = call_llm(prompt)
        title = title.strip().split("\n")[0][:60]
        return {"title": title}
    except Exception:
        logger.exception("summarize.failed")
        raise HTTPException(status_code=502, detail="Summarization failed")


def _resolve_identity(user: dict | None, x_session_id: str | None):
    if user:
        return f"user:{user['id']}", USER_DAILY_LIMIT, False
    if x_session_id:
        return f"session:{x_session_id}", GUEST_DAILY_LIMIT, True
    raise HTTPException(status_code=400, detail="A session ID or account is required.")


def _build_messages(req: GenerateRequest) -> list | None:
    if not req.context:
        return None
    system_msg = (
        f"{_STYLE_SYSTEM.get(req.style, 'You generate pseudocode.')} "
        f"Detail level: {req.detail}. "
        "When asked to modify or improve, update the pseudocode accordingly."
    )
    context = req.context[-10:]
    return [
        {"role": "system", "content": system_msg},
        *[{"role": m.role, "content": m.content} for m in context],
        {"role": "user", "content": req.problem_description},
    ]


# ── Main endpoint — SSE streaming ─────────────────────────────────────────────

@app.post("/generate-pseudocode")
@limiter.limit("30/minute")
async def generate(
    request: Request,
    req: GenerateRequest,
    user: dict | None = Depends(get_optional_user),
    x_session_id: str | None = Header(default=None),
):
    identifier, limit, is_guest = _resolve_identity(user, x_session_id)
    used = get_usage_today(identifier)
    if used >= limit:
        raise HTTPException(
            status_code=429,
            detail=(
                f"You've used all {limit} free prompts for today. Create a free account to get {USER_DAILY_LIMIT} per day."
                if is_guest
                else f"Daily limit of {limit} prompts reached. Resets at midnight UTC."
            ),
        )

    # Increment before streaming to prevent quota abuse via cancel
    new_count = increment_usage_today(identifier)
    remaining = max(0, limit - new_count)
    messages = _build_messages(req)

    def _sse():
        try:
            if messages:
                token_stream = call_llm_stream(messages)
            else:
                template = TEMPLATES.get(req.style)
                if template is None:
                    yield f"data: {json.dumps({'error': 'Unknown style'})}\n\n"
                    return
                prompt = template.format(user_input=req.problem_description, detail=req.detail)
                token_stream = call_llm_stream([{"role": "user", "content": prompt}])

            for token in token_stream:
                yield f"data: {json.dumps({'token': token})}\n\n"

            yield f"data: {json.dumps({'usage': {'used': new_count, 'limit': limit, 'remaining': remaining, 'is_guest': is_guest}})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as exc:
            logger.error("generate.stream.error", error=str(exc))
            yield f"data: {json.dumps({'error': 'Generation failed. Please try again.'})}\n\n"

    return StreamingResponse(_sse(), media_type="text/event-stream")


# ── v1 endpoint — non-streaming with Redis cache ──────────────────────────────

@v1_router.post("/generate-pseudocode")
@limiter.limit("30/minute")
async def generate_v1(
    request: Request,
    req: GenerateRequest,
    user: dict | None = Depends(get_optional_user),
    x_session_id: str | None = Header(default=None),
):
    identifier, limit, is_guest = _resolve_identity(user, x_session_id)

    cache_key = make_cache_key(req.problem_description, req.style, req.detail)
    cached = get_cached_response(cache_key)
    if cached:
        used = get_usage_today(identifier)
        return {
            "markdown": cached,
            "used": used,
            "limit": limit,
            "remaining": max(0, limit - used),
            "is_guest": is_guest,
            "cached": True,
        }

    used = get_usage_today(identifier)
    if used >= limit:
        raise HTTPException(
            status_code=429,
            detail=(
                f"You've used all {limit} free prompts for today. Create a free account to get {USER_DAILY_LIMIT} per day."
                if is_guest
                else f"Daily limit of {limit} prompts reached. Resets at midnight UTC."
            ),
        )

    try:
        messages = _build_messages(req)
        if messages:
            response_text = call_llm_messages(messages)
        else:
            template = TEMPLATES.get(req.style)
            if template is None:
                raise HTTPException(status_code=400, detail="Unknown style")
            prompt = template.format(user_input=req.problem_description, detail=req.detail)
            response_text = call_llm(prompt)
    except HTTPException:
        raise
    except Exception:
        logger.exception("generate_v1.failed")
        raise HTTPException(status_code=502, detail="Failed to generate pseudocode. Please try again.")

    set_cached_response(cache_key, response_text)
    new_count = increment_usage_today(identifier)
    remaining = max(0, limit - new_count)

    return {
        "markdown": response_text,
        "used": new_count,
        "limit": limit,
        "remaining": remaining,
        "is_guest": is_guest,
        "cached": False,
    }


app.include_router(v1_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)

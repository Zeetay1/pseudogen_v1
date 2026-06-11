import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Request, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from typing import Annotated
import logging

from ai_prompts import TEMPLATES
from utils import call_llm
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

logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("pseudogen")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="Pseudogen API", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

_cors_origins = os.getenv("CORS_ORIGINS", "*").strip()
allow_origins = (
    [o.strip() for o in _cors_origins.split(",") if o.strip()]
    if _cors_origins != "*"
    else ["*"]
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_INPUT_LEN = 4000


class GenerateRequest(BaseModel):
    problem_description: Annotated[str, Field(min_length=1, max_length=MAX_INPUT_LEN)]
    style: Annotated[str, Field(pattern="^(Academic|Developer-Friendly|English-Like|Step-by-Step)$")]
    detail: Annotated[str, Field(pattern="^(Concise|Detailed)$")]


class SummarizeRequest(BaseModel):
    text: Annotated[str, Field(min_length=1, max_length=2000)]


app.include_router(auth_router)

v1_router = APIRouter(prefix="/v1", tags=["v1"])


@app.get("/")
async def root():
    return {"service": "Pseudogen API", "version": "1"}


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
    return {
        "used": used,
        "limit": limit,
        "remaining": max(0, limit - used),
        "is_guest": is_guest,
    }


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
        logger.exception("Summarize failed")
        raise HTTPException(status_code=502, detail="Summarization failed")


@v1_router.post("/generate-pseudocode")
@limiter.limit("30/minute")
async def generate_v1(
    request: Request,
    req: GenerateRequest,
    user: dict | None = Depends(get_optional_user),
    x_session_id: str | None = Header(default=None),
):
    return await _generate(req, user, x_session_id)


app.include_router(v1_router)


@app.post("/generate-pseudocode")
@limiter.limit("30/minute")
async def generate(
    request: Request,
    req: GenerateRequest,
    user: dict | None = Depends(get_optional_user),
    x_session_id: str | None = Header(default=None),
):
    return await _generate(req, user, x_session_id)


async def _generate(req: GenerateRequest, user: dict | None, x_session_id: str | None):
    if user:
        identifier = f"user:{user['id']}"
        limit = USER_DAILY_LIMIT
        is_guest = False
    elif x_session_id:
        identifier = f"session:{x_session_id}"
        limit = GUEST_DAILY_LIMIT
        is_guest = True
    else:
        raise HTTPException(
            status_code=400,
            detail="A session ID or account is required.",
        )

    used = get_usage_today(identifier)
    if used >= limit:
        if is_guest:
            raise HTTPException(
                status_code=429,
                detail=f"You've used all {limit} free prompts for today. Create a free account to get {USER_DAILY_LIMIT} per day.",
            )
        else:
            raise HTTPException(
                status_code=429,
                detail=f"Daily limit of {limit} prompts reached. Resets at midnight UTC.",
            )

    template = TEMPLATES.get(req.style)
    if template is None:
        raise HTTPException(status_code=400, detail="Unknown style")

    prompt = template.format(user_input=req.problem_description, detail=req.detail)

    try:
        response_text = call_llm(prompt)
    except Exception:
        logger.exception("LLM call failed")
        raise HTTPException(status_code=502, detail="Failed to generate pseudocode. Please try again.")

    new_count = increment_usage_today(identifier)
    remaining = max(0, limit - new_count)

    return {
        "markdown": response_text,
        "used": new_count,
        "limit": limit,
        "remaining": remaining,
        "is_guest": is_guest,
    }

# backend/app.py
"""
Pseudogen V1 API
----------------
FastAPI backend for generating pseudocode using various LLM providers (OpenAI, Claude, Groq, etc.).
This API receives a problem description, pseudocode style, and level of detail,
then returns formatted pseudocode as Markdown text.
"""

import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from typing import Annotated
import logging

from ai_prompts import TEMPLATES
from utils import call_llm

# -----------------------------------------------------------------------------
# Environment setup
# -----------------------------------------------------------------------------

_BACKEND_DIR = Path(__file__).resolve().parent
load_dotenv(dotenv_path=_BACKEND_DIR / ".env")

# Required env vars for startup (PROVIDER + at least one API key for that provider)
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
        raise RuntimeError(f"Missing required env: {', '.join(missing)}. Set them in .env or environment.")
    provider = (os.getenv("PROVIDER") or "").lower()
    key_var = _PROVIDER_KEYS.get(provider)
    if key_var and not os.getenv(key_var):
        raise RuntimeError(f"PROVIDER={provider} requires {key_var}. Set it in .env or environment.")


_check_env()

# -----------------------------------------------------------------------------
# Logging configuration
# -----------------------------------------------------------------------------
_LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, _LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("pseudogen")

# -----------------------------------------------------------------------------
# FastAPI app configuration
# -----------------------------------------------------------------------------

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="Pseudogen V1 API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS: allow_origins from env in production (e.g. CORS_ORIGINS=https://app.example.com), else "*" for dev
_cors_origins = os.getenv("CORS_ORIGINS", "*").strip()
allow_origins = [o.strip() for o in _cors_origins.split(",") if o.strip()] if _cors_origins != "*" else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------------------------
# Plan limits (Free vs Premium)
# -----------------------------------------------------------------------------
FREE_MAX_INPUT_LEN = 4000
PREMIUM_MAX_INPUT_LEN = 12000

# -----------------------------------------------------------------------------
# Request model
# -----------------------------------------------------------------------------

class GenerateRequest(BaseModel):
    """Schema for pseudocode generation requests. Max length 12000 for Premium."""
    problem_description: Annotated[str, Field(min_length=1, max_length=PREMIUM_MAX_INPUT_LEN)]
    style: Annotated[str, Field(pattern="^(Academic|Developer-Friendly|English-Like|Step-by-Step)$")]
    detail: Annotated[str, Field(pattern="^(Concise|Detailed)$")]

# -----------------------------------------------------------------------------
# API Routes
# -----------------------------------------------------------------------------

@app.get("/")
async def root():
    """Health/root endpoint so the backend URL doesn't return 404 when visited."""
    return {"service": "Pseudogen API", "docs": "/docs", "generate": "POST /generate-pseudocode", "v1": "POST /v1/generate-pseudocode"}

# v1 API router (versioned endpoint; same behavior as legacy path)
v1_router = APIRouter(prefix="/v1", tags=["v1"])

@v1_router.post("/generate-pseudocode")
@limiter.limit("30/minute")
async def generate_v1(request: Request, req: GenerateRequest):
    """Same as generate; versioned under /v1."""
    return await generate_impl(request, req)

app.include_router(v1_router)

@app.post("/generate-pseudocode")
@limiter.limit("30/minute")
async def generate(request: Request, req: GenerateRequest):
    """
    Generate pseudocode from a given problem description.
    Free plan: up to 4000 chars. Send X-Plan: premium for up to 12000 chars.
    """
    return await generate_impl(request, req)


async def generate_impl(request: Request, req: GenerateRequest):
    """Shared implementation for generate and generate_v1."""
    plan = (request.headers.get("X-Plan") or "free").strip().lower()
    if plan != "premium" and len(req.problem_description) > FREE_MAX_INPUT_LEN:
        raise HTTPException(
            status_code=400,
            detail=f"Input exceeds Free plan limit ({FREE_MAX_INPUT_LEN} characters). Upgrade to Premium for up to {PREMIUM_MAX_INPUT_LEN}.",
        )

    template = TEMPLATES.get(req.style)
    if template is None:
        raise HTTPException(status_code=400, detail="Unknown style")

    prompt = template.format(user_input=req.problem_description, detail=req.detail)

    try:
        response_text = call_llm(prompt)
    except Exception as e:
        logger.exception("LLM call failed")
        raise HTTPException(status_code=502, detail=str(e))

    return {"markdown": response_text}

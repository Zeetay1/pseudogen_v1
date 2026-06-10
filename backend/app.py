import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Request, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from typing import Annotated
import logging

from ai_prompts import TEMPLATES
from utils import call_llm
from database import init_db
from auth import get_current_user
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
allow_origins = [o.strip() for o in _cors_origins.split(",") if o.strip()] if _cors_origins != "*" else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FREE_MAX_INPUT_LEN = 4000
PREMIUM_MAX_INPUT_LEN = 12000


class GenerateRequest(BaseModel):
    problem_description: Annotated[str, Field(min_length=1, max_length=PREMIUM_MAX_INPUT_LEN)]
    style: Annotated[str, Field(pattern="^(Academic|Developer-Friendly|English-Like|Step-by-Step)$")]
    detail: Annotated[str, Field(pattern="^(Concise|Detailed)$")]


app.include_router(auth_router)

v1_router = APIRouter(prefix="/v1", tags=["v1"])


@app.get("/")
async def root():
    return {"service": "Pseudogen API", "version": "1"}


@v1_router.post("/generate-pseudocode")
@limiter.limit("30/minute")
async def generate_v1(request: Request, req: GenerateRequest, user: dict = Depends(get_current_user)):
    return await _generate(request, req, user)


app.include_router(v1_router)


@app.post("/generate-pseudocode")
@limiter.limit("30/minute")
async def generate(request: Request, req: GenerateRequest, user: dict = Depends(get_current_user)):
    return await _generate(request, req, user)


async def _generate(request: Request, req: GenerateRequest, user: dict):
    plan = (user.get("plan") or "free").strip().lower()
    if plan != "premium" and len(req.problem_description) > FREE_MAX_INPUT_LEN:
        raise HTTPException(
            status_code=400,
            detail=f"Input exceeds the Free plan limit of {FREE_MAX_INPUT_LEN} characters. Upgrade to Premium for up to {PREMIUM_MAX_INPUT_LEN}.",
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

    return {"markdown": response_text}

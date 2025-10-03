# backend/app.py
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, constr
from fastapi.middleware.cors import CORSMiddleware
import os
import time
import logging
import openai
from .ai_prompts import TEMPLATES
from .utils import call_openai_with_retries
from pydantic import BaseModel, constr, Field
from typing import Annotated

from pathlib import Path
from dotenv import load_dotenv

# Force it to load .env from backend folder
load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")


logging.basicConfig(level=logging.INFO)
app = FastAPI(title="Pseudogen V1 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # lock down in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OPENAI_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")  # set as env var

if not OPENAI_KEY:
    logging.warning("OPENAI_API_KEY not found. Set OPENAI_API_KEY in environment.")

openai.api_key = OPENAI_KEY

class GenerateRequest(BaseModel):
    problem_description: Annotated[str, Field(min_length=1, max_length=4000)]
    style: Annotated[str, Field(pattern="^(Academic|Developer-Friendly|English-Like|Step-by-Step)$")]
    detail: Annotated[str, Field(pattern="^(Concise|Detailed)$")]

@app.post("/generate-pseudocode")
async def generate(req: GenerateRequest):
    if not OPENAI_KEY:
        raise HTTPException(status_code=500, detail="Server misconfiguration: OPENAI_API_KEY missing")

    template = TEMPLATES.get(req.style)
    if template is None:
        raise HTTPException(status_code=400, detail="Unknown style")

    prompt = template.format(user_input=req.problem_description, detail=req.detail)
    try:
        response_text = "test response 1234" #call_openai_with_retries(prompt, model=OPENAI_MODEL)
    except Exception as e:
        logging.exception("OpenAI call failed")
        raise HTTPException(status_code=502, detail=str(e))

    return {"markdown": response_text}

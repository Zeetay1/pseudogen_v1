# backend/app.py
"""
Pseudogen V1 API
----------------
FastAPI backend for generating pseudocode using various LLM providers (OpenAI, Claude, Groq, etc.).
This API receives a problem description, pseudocode style, and level of detail,
then returns formatted pseudocode as Markdown text.
"""

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, constr
from fastapi.middleware.cors import CORSMiddleware
from .ai_prompts import TEMPLATES
from .utils import call_llm
from pydantic import BaseModel, constr, Field
from typing import Annotated
from pathlib import Path
from dotenv import load_dotenv
import os
import time
import logging
import openai

# -----------------------------------------------------------------------------
# Environment setup
# -----------------------------------------------------------------------------

# Explicitly load environment variables from the backend/.env file
load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")

# -----------------------------------------------------------------------------
# FastAPI app configuration
# -----------------------------------------------------------------------------

app = FastAPI(title="Pseudogen V1 API")

# Enable CORS (relaxed for now — restrict origins in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------------------------
# Request model
# -----------------------------------------------------------------------------

class GenerateRequest(BaseModel):
    """Schema for pseudocode generation requests."""
    problem_description: Annotated[str, Field(min_length=1, max_length=4000)]
    style: Annotated[str, Field(pattern="^(Academic|Developer-Friendly|English-Like|Step-by-Step)$")]
    detail: Annotated[str, Field(pattern="^(Concise|Detailed)$")]

# -----------------------------------------------------------------------------
# API Routes
# -----------------------------------------------------------------------------

@app.post("/generate-pseudocode")
async def generate(req: GenerateRequest):
    """
    Generate pseudocode from a given problem description.

    Args:
        req (GenerateRequest): User input containing problem description,
                               desired pseudocode style, and level of detail.

    Returns:
        dict: JSON object with Markdown pseudocode output.

    Raises:
        HTTPException: 422 for invalid style,
                       502 if the LLM call fails.
    """
    
    # Retrieve appropriate prompt template
    template = TEMPLATES.get(req.style)
    if template is None:
        raise HTTPException(status_code=400, detail="Unknown style")

    # Fill in the template with user input and level of detail
    prompt = template.format(user_input=req.problem_description, detail=req.detail)
    
    # Call the LLM provider safely
    try:
        response_text = call_llm(prompt)
    except Exception as e:
        logging.exception("LLM call failed")
        raise HTTPException(status_code=502, detail=str(e))

    return {"markdown": response_text}

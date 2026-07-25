import os
import json
import logging
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from groq import Groq

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("backend.main")

# Load environment variables
BASE_DIR = Path(__file__).parent.parent
PROMPT_FILE = BASE_DIR / "prompts" / "extract_action_items.md"
BACKEND_ENV = Path(__file__).parent / ".env"

load_dotenv()
if BACKEND_ENV.exists():
    load_dotenv(BACKEND_ENV)

api_key = os.getenv("GROQ_API_KEY")
groq_client = Groq(api_key=api_key) if api_key else None

app = FastAPI(title="Meeting Notes to Action Items API")

# Configure CORS to allow all origins for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class NotesRequest(BaseModel):
    notes: str


class ActionItem(BaseModel):
    task: str
    owner: str
    due: str


class ProcessNotesResponse(BaseModel):
    summary: List[str] = []
    decisions: List[str] = []
    action_items: List[ActionItem] = []
    error: Optional[str] = None


def get_system_prompt() -> str:
    if PROMPT_FILE.exists():
        with open(PROMPT_FILE, "r", encoding="utf-8") as f:
            return f.read()
    return "Extract summary (3 points), decisions, and action_items from meeting notes into raw JSON."


def clean_and_parse_json(raw_text: str) -> Optional[dict]:
    """Helper to clean markdown fences and attempt json.loads()"""
    if not raw_text:
        return None
    cleaned = raw_text.strip()
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        cleaned = "\n".join(lines).strip()

    try:
        data = json.loads(cleaned)
        if isinstance(data, dict):
            data.setdefault("summary", [])
            data.setdefault("decisions", [])
            data.setdefault("action_items", [])
            return data
    except Exception:
        pass
    return None

@app.get("/", tags=["Root"])
def root():
    return {
        "message": "Meeting Notes to Action Items API is running.",
        "status": "ok",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/api/process-notes", response_model=ProcessNotesResponse)
def process_notes(payload: NotesRequest):
    """
    Accepts meeting notes string, calls Groq API (llama-3.3-70b-versatile),
    and returns structured summary, decisions, and action items.
    Distinguishes between 'api_call_failed' and 'model_output_invalid'.
    """
    raw_notes = payload.notes.strip() if payload.notes else ""
    if not raw_notes:
        raise HTTPException(status_code=400, detail="Meeting notes cannot be empty.")

    if not groq_client:
        logger.error("[API Error] Groq API client is not initialized. Please set GROQ_API_KEY in environment or .env.")
        return ProcessNotesResponse(
            error="api_call_failed",
            summary=[],
            decisions=[],
            action_items=[]
        )

    system_prompt = get_system_prompt()
    full_prompt = f"{system_prompt}\n\nMeeting Notes:\n{raw_notes}"

    raw_text_1 = None
    api_error_1 = None

    # --- Attempt 1 ---
    try:
        completion = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": full_prompt}]
        )
        raw_text_1 = completion.choices[0].message.content.strip() if completion.choices else ""
    except Exception as e:
        api_error_1 = e
        logger.error(f"[Attempt 1 Groq API Error]: {e}")

    # If Attempt 1 API call succeeded, check JSON
    if raw_text_1 is not None:
        parsed_1 = clean_and_parse_json(raw_text_1)
        if parsed_1:
            return ProcessNotesResponse(**parsed_1)
        logger.warning(f"[Attempt 1 Parse Failed] Raw model response could not be parsed as JSON:\n{raw_text_1}")

    # --- Attempt 2 (Retry) ---
    retry_prompt = (
        f"{full_prompt}\n\n"
        "Your last response was not valid JSON. Return ONLY valid JSON, no other text, no markdown fences."
    )

    raw_text_2 = None
    api_error_2 = None

    try:
        retry_completion = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": retry_prompt}]
        )
        raw_text_2 = retry_completion.choices[0].message.content.strip() if retry_completion.choices else ""
    except Exception as e:
        api_error_2 = e
        logger.error(f"[Attempt 2 Groq API Error]: {e}")

    # If Attempt 2 API call succeeded, check JSON
    if raw_text_2 is not None:
        parsed_2 = clean_and_parse_json(raw_text_2)
        if parsed_2:
            return ProcessNotesResponse(**parsed_2)
        logger.warning(f"[Attempt 2 Retry Parse Failed] Raw model response could not be parsed as JSON:\n{raw_text_2}")

    # --- Failure Classification ---
    # If both API calls failed due to API exceptions (or no valid API text returned), classify as 'api_call_failed'
    if raw_text_1 is None and raw_text_2 is None:
        logger.error("[Failure Summary] API call failed on all attempts.")
        return ProcessNotesResponse(
            error="api_call_failed",
            summary=[],
            decisions=[],
            action_items=[]
        )

    # Otherwise, API call succeeded but model output was invalid JSON even after retry
    logger.error("[Failure Summary] Model output was invalid JSON after retry.")
    return ProcessNotesResponse(
        error="model_output_invalid",
        summary=[],
        decisions=[],
        action_items=[]
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

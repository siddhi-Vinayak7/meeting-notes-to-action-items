from typing import List
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

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
    summary: List[str]
    decisions: List[str]
    action_items: List[ActionItem]


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/api/process-notes", response_model=ProcessNotesResponse)
def process_notes(payload: NotesRequest):
    """
    Accepts meeting notes string and returns structured summary, decisions, and action items.
    Currently returns a hardcoded sample payload.
    """
    return ProcessNotesResponse(
        summary=[
            "Discussed project scope and timeline for the upcoming sprint.",
            "Reviewed initial feedback on the frontend component design.",
            "Agreed on API data contracts between client and backend."
        ],
        decisions=[
            "Adopt FastAPI for python backend microservices.",
            "Use vanilla HTML/JS for lightweight, dependency-free frontend MVP."
        ],
        action_items=[
            ActionItem(
                task="Set up database schema and initial migrations",
                owner="Alex",
                due="2026-07-28"
            ),
            ActionItem(
                task="Design UI mockups for multi-user collaboration view",
                owner="Sarah",
                due="2026-07-30"
            ),
            ActionItem(
                task="Implement LLM prompt templates in prompts/ directory",
                owner="Dev Team",
                due="2026-08-01"
            )
        ]
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

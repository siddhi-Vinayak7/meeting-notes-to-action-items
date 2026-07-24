# Meeting Notes to Action Items

Paste raw, messy meeting notes and get back a structured summary, key decisions, and an action items table with owner and due date.

## Live Demo
- Frontend: https://cosmic-taiyaki-5806d0.netlify.app
- Backend API: https://meeting-notes-backend-zrpk.onrender.com
- Note: the backend runs on Render's free tier and spins down after inactivity. The first request after idle time may take 30-60 seconds to respond.

## Architecture
This is a two-part app: a FastAPI backend that receives raw meeting notes, sends them to Groq's LLM API (llama-3.3-70b-versatile) with a structured JSON-extraction prompt, and returns a summary, decisions, and action items. If the model's response isn't valid JSON, the backend retries once with a corrective instruction before failing gracefully. The frontend is plain HTML/JS with no build step, calling the backend over a REST API. Backend is deployed on Render, frontend on Netlify, both on free tiers.

## Tech Stack
- **Backend**: FastAPI, Python, Groq API
- **Frontend**: HTML, vanilla JavaScript, CSS
- **Hosting**: Render (backend), Netlify (frontend)

## Known Limitations
See [FINDINGS.md](./FINDINGS.md) for detailed test results, failure-mode testing, and known limitations.

## Project Structure

```
meeting-notes-to-action-items/
├── backend/
│   ├── main.py              # FastAPI application server
│   ├── test_prompt.py       # Standalone prompt-testing script (not part of the API)
│   ├── requirements.txt     # Python backend dependencies
│   └── .env                 # Local only, not committed — holds GROQ_API_KEY
├── frontend/
│   ├── index.html           # Two-pane HTML layout
│   ├── styles.css           # Dark-theme CSS styles
│   └── app.js                # Frontend JavaScript: API calls, rendering, clipboard logic
├── prompts/
│   └── extract_action_items.md   # LLM prompt used for structured extraction
├── samples/
│   └── sample_1.txt ... sample_5.txt   # Test meeting notes used during prompt/endpoint testing
├── README.md
└── FINDINGS.md
```

---

## Getting Started (Local Development)

### 1. Run the Backend (FastAPI)

1. Open a terminal and navigate to the `backend/` directory:
   ```bash
   cd backend
   ```

2. (Optional) Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. Install required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file inside `backend/` with your Groq API key:
   ```
   GROQ_API_KEY=your_key_here
   ```
   Get a free key at [console.groq.com](https://console.groq.com) — no credit card required.

5. Start the FastAPI server:
   ```bash
   python main.py
   ```
   Alternatively, run with uvicorn directly:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

6. Verify the backend is running by visiting [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health) — it should return `{"status": "ok"}`.

### 2. Run the Frontend

The frontend is plain HTML, CSS, and vanilla JavaScript — no build step or framework required.

By default, `frontend/app.js` points `API_BASE_URL` at the live Render backend. To test against your local backend instead, change `API_BASE_URL` in `app.js` to `http://localhost:8000`.

#### Option A: Open directly in browser
Open `frontend/index.html` in your web browser.

#### Option B: Serve with Python's HTTP server
From the repository root, run:
```bash
python -m http.server 3000 --directory frontend
```
Then open [http://localhost:3000](http://localhost:3000).

---

## API Reference

### `GET /health`
Returns:
```json
{"status": "ok"}
```

### `POST /api/process-notes`

**Request body:**
```json
{
  "notes": "Raw meeting notes text..."
}
```

**Success response:**
```json
{
  "summary": ["point 1", "point 2", "point 3"],
  "decisions": ["decision 1"],
  "action_items": [
    {
      "task": "Set up database schema",
      "owner": "Alex",
      "due": "2026-07-28"
    }
  ],
  "error": null
}
```

**Empty input** (`notes` is empty or whitespace-only) returns HTTP 400:
```json
{"detail": "Meeting notes cannot be empty."}
```

**Model/API failure** returns HTTP 200 (never a 500 or a crash) with one of two error labels:
```json
{
  "summary": [],
  "decisions": [],
  "action_items": [],
  "error": "model_output_invalid"
}
```
- `"model_output_invalid"` — the LLM call succeeded but its response wasn't valid JSON, even after one retry.
- `"api_call_failed"` — the call to the Groq API itself failed (bad key, network issue, rate limit).

See [FINDINGS.md](./FINDINGS.md) for how these failure paths were tested and verified.
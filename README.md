# Meeting Notes to Action Items

Paste raw, messy meeting notes and get back a structured summary, key decisions, and an action items table with owner and due date.

## Project Structure

```
meeting-notes-to-action-items/
├── backend/
│   ├── main.py              # FastAPI application server
│   └── requirements.txt     # Python backend dependencies
├── frontend/
│   ├── index.html           # Two-pane HTML layout
│   ├── styles.css           # Modern dark-theme CSS styles
│   └── app.js               # Frontend JavaScript API & clipboard logic
├── prompts/                 # Prompt templates placeholder
└── samples/                 # Sample meeting notes placeholder
```

---

## Getting Started

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

4. Start the FastAPI server:
   ```bash
   python main.py
   ```
   *Alternatively, run with uvicorn directly:*
   ```bash
   uvicorn main:app --reload --port 8000
   ```

5. Verify backend health by visiting [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health) in your browser.

---

### 2. Run the Frontend

The frontend is built using standard HTML, CSS, and Vanilla JavaScript (no build step or framework required).

#### Option A: Open directly in Browser
Open `frontend/index.html` in your web browser.

#### Option B: Serve using Python HTTP Server
From the root directory or `frontend/` directory, run:
```bash
python -m http.server 3000 --directory frontend
```
Then open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## API Endpoints

- **`GET /health`**
  Returns: `{"status": "ok"}`

- **`POST /api/process-notes`**
  - **Request Body:**
    ```json
    {
      "notes": "Raw text notes..."
    }
    ```
  - **Response:**
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
      ]
    }
    ```

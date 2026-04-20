cla# Setup Project — Dev Environment

## Objective
Get the AI Medical CRM running locally with backend and frontend.

## Prerequisites
- Python 3.10+ installed
- Node.js 18+ installed

## Steps

### 1. Install Python dependencies
```bash
cd "AI Medical"
python -m pip install -r requirements.txt
```

### 2. Generate sample Excel data
```bash
python -m tools.create_sample_data
```
This creates `data/master_leads.xlsx` with 15 sample companies and 25 sample contacts.

### 3. Start the backend
```bash
uvicorn backend.app:app --reload
```
Backend runs at http://localhost:8000. On startup it:
- Connects to Supabase (`SUPABASE_URL` + `SUPABASE_SERVICE_KEY` from `.env`)
- Scans `/imports` for any files already sitting there (`scan_existing`)
- Starts the folder watcher in a background thread
- Starts the email-sync scheduler (every 15 min) if `apscheduler` is installed

### 4. Install frontend dependencies (first time only)
```bash
cd frontend
npm install
```

### 5. Start the frontend
```bash
cd frontend
npm run dev
```
Frontend runs at http://localhost:5173. The Vite dev server proxies `/api` requests to the backend.

### 6. Open the CRM
Navigate to http://localhost:5173 in your browser.

## Verification
- Dashboard shows 15 companies + 25 contacts = 40 total leads
- Companies and Contacts pages show searchable tables
- Pipeline page shows all leads in the "New" stage
- Clicking a lead opens the detail modal where you can change stage and log activities

## Troubleshooting

### Excel file locked
If Excel is open, the backend serves cached data and shows a warning. Close Excel to allow fresh reads.

### Port conflicts
- Backend: change port with `uvicorn backend.app:app --reload --port 8001`
- Frontend: Vite will auto-pick the next available port

### CORS errors
The backend allows requests from `localhost:5173`. If Vite uses a different port, update the `allow_origins` list in `backend/app.py`.

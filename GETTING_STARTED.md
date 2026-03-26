# Getting Started — AI Medical Outreach System

This project follows the **WAT framework**: Workflows → Agents → Tools.

---

## Project Purpose

Automate outreach to the medical industry using data enrichment (Apollo), email (Gmail), and other integrations to be defined.

---

## Directory Structure

```
AI Medical/
├── CLAUDE.md              # Agent instructions (WAT framework rules)
├── GETTING_STARTED.md     # This file
├── .env                   # API keys and secrets — never commit this
├── .gitignore
├── tools/                 # Python scripts for deterministic execution
├── workflows/             # Markdown SOPs — what to do and how
└── .tmp/                  # Temporary/intermediate files — disposable
```

---

## Setup Steps

### 1. Python environment
```bash
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Mac/Linux:
source .venv/bin/activate
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```
> `requirements.txt` will be added as tools are built.

### 3. Fill in your `.env`
Open `.env` and add your API keys:
- **Apollo**: Get from your Apollo account → Settings → API Keys
- **Google/Gmail**: Set up OAuth credentials from Google Cloud Console
- **Database**: Connection string for your DB

### 4. Google OAuth (Gmail)
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Create a project → Enable Gmail API
- Create OAuth 2.0 credentials → Download as `credentials.json`
- Place `credentials.json` in the project root (it's gitignored)
- First run will generate `token.json` automatically

---

## How to Work in This System

1. **Pick a task** → find or create a workflow in `workflows/`
2. **Claude reads the workflow** → determines which tool(s) to run
3. **Tool executes** → output saved to `.tmp/` or delivered to cloud
4. **Review results** → iterate and refine

---

## Planned Integrations

| Integration | Purpose | Status |
|-------------|---------|--------|
| Apollo      | Contact/company data enrichment | Pending setup |
| Gmail API   | Outreach emails | Pending setup |
| Google Sheets | Tracking & reporting | Pending setup |
| Web scraping | Data collection | Pending setup |
| Database    | Contact storage & deduplication | Pending setup |

---

## Adding a New Tool

1. Create `tools/your_tool_name.py`
2. Read API keys from `.env` using `python-dotenv`
3. Accept inputs as CLI args or a JSON config
4. Output results to `.tmp/` or return structured data
5. Document it in the relevant workflow

## Adding a New Workflow

1. Create `workflows/your_workflow_name.md`
2. Define: objective, inputs, tools to call, expected output, edge cases
3. Keep it in plain language — these are instructions for the agent

# Skill: Data Setup

## Objective
Initialize the database schema, generate sample data, and set up the local development environment.

## Tools Used
- `tools/create_sample_data.py` — Generates `data/master_leads.xlsx` with 15 companies + 25 contacts
- `tools/db_manager.py` — Creates SQLite tables via `init_db()`

## Available Functions

| Function | Purpose | Usage |
|----------|---------|-------|
| `init_db(db_path)` | Create `lead_stages` and `activities` tables if they don't exist | Called automatically by `server.py` on startup |
| `create_sample_excel()` | Generate sample Excel file with medical industry leads | Run once: `python -m tools.create_sample_data` |

## Database Schema

### `lead_stages` table
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| lead_type | TEXT | `"company"` or `"contact"` |
| lead_key | TEXT | 12-char hash ID |
| stage | TEXT | Pipeline stage (default: `"new"`) |
| updated_at | TIMESTAMP | Last update time |

### `activities` table
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| lead_type | TEXT | `"company"` or `"contact"` |
| lead_key | TEXT | 12-char hash ID |
| activity_type | TEXT | `email`, `call`, `note`, `stage_change` |
| description | TEXT | Free-text detail |
| created_at | TIMESTAMP | Activity timestamp |

## Sample Data
- **15 companies**: Medical devices, diagnostics, hospitals, pharma, health tech, biotech, etc.
- **25 contacts**: VPs, CTOs, CEOs, directors across those companies
- All data is US-based medical industry

## Notes
- DB uses WAL journal mode for concurrent reads
- `init_db()` is idempotent — safe to call repeatedly
- Sample data is regenerable; `data/` files are intermediate, not deliverables
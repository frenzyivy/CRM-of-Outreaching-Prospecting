# Skill: Lead Management

## Objective
Read, query, filter, and merge lead data from the master Excel file and SQLite database.

## Tools Used
- `tools/excel_reader.py` — Reads and caches leads from `data/master_leads.xlsx`
- `tools/lead_merger.py` — Merges Excel leads with pipeline stages from SQLite

## Available Functions

### From `excel_reader.py`
| Function | Input | Output |
|----------|-------|--------|
| `read_leads(file_path, force=False)` | Excel path, optional force refresh | `{companies: [...], contacts: [...], error: ...}` |
| `get_companies(file_path)` | Excel path | List of company dicts |
| `get_contacts(file_path)` | Excel path | List of contact dicts |
| `get_all_leads(file_path)` | Excel path | Combined list of all leads |

### From `lead_merger.py`
| Function | Input | Output |
|----------|-------|--------|
| `merge_leads_with_stages(excel_path, db_path, lead_type=None)` | Paths + optional filter | Leads with `stage` and `stage_label` attached |
| `get_pipeline_view(excel_path, db_path)` | Paths | `{stages: {...}, stage_counts: {...}, stage_order: [...]}` |
| `get_lead_detail(excel_path, db_path, lead_type, lead_id)` | Paths + lead identifiers | Single lead with full detail + activity history |

## Required Environment
- `EXCEL_FILE_PATH` — defaults to `data/master_leads.xlsx`
- `SQLITE_DB_PATH` — defaults to `data/crm_metadata.db`

## Notes
- Excel reader uses in-memory caching; re-reads only when file is modified or `force=True`
- Handles Windows file locking gracefully (serves cached data if Excel is open)
- Each lead gets a stable hash ID from `_generate_id()` based on company name or email
- Leads without a DB stage record default to `"new"`

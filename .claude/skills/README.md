# Skills Index

Skills define reusable capabilities that agents can invoke. Each skill wraps one or more tools from `tools/` into a higher-level action.

| Skill | Description | Tools Used |
|-------|-------------|------------|
| [Lead Management](lead_management.md) | Read, query, and merge leads from Excel + DB | `excel_reader.py`, `lead_merger.py` |
| [Pipeline Operations](pipeline_operations.md) | Move leads through stages, log activities | `activity_logger.py`, `db_manager.py` |
| [Email Campaign Analytics](email_campaign_analytics.md) | Fetch and analyze Instantly.ai campaign data | `instantly.py` |
| [CRM Reporting](crm_reporting.md) | Generate dashboard stats, chart data, summaries | `db_manager.py`, `lead_merger.py` |
| [Data Setup](data_setup.md) | Initialize DB, generate sample data | `create_sample_data.py`, `db_manager.py` |
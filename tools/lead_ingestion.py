# Backward-compat shim — real implementation moved to services/lead_ingestion.py
from services.lead_ingestion import *  # noqa: F401,F403
from services.lead_ingestion import ingest_file, get_campaigns_for_selection, _push_to_instantly  # noqa: F401

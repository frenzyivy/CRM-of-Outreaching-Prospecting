"""
Backward-compatible re-export.
All database operations now live in core.supabase_client.
"""

from core.supabase_client import *  # noqa: F401,F403
from core.constants import PIPELINE_STAGES, STAGE_LABELS  # noqa: F401

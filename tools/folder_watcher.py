# Backward-compat shim — real implementation moved to services/folder_watcher.py
from services.folder_watcher import start_watcher, scan_existing  # noqa: F401

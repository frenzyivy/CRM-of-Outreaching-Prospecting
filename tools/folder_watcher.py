"""
Folder Watcher Tool
Monitors the /imports directory for new CSV/Excel files.
When a file is dropped, it automatically triggers lead ingestion.

Run standalone:  python -m tools.folder_watcher
Or started automatically by server.py on startup.
"""

import logging
import os
import shutil
import time
from pathlib import Path

from dotenv import load_dotenv
from watchdog.events import FileSystemEventHandler, FileCreatedEvent
from watchdog.observers import Observer

load_dotenv()

WATCH_DIR = os.getenv("IMPORTS_DIR", "imports")
PROCESSED_DIR = os.path.join(WATCH_DIR, "processed")
FAILED_DIR = os.path.join(WATCH_DIR, "failed")
SUPPORTED_EXTENSIONS = {".csv", ".xlsx", ".xls"}

logger = logging.getLogger("folder_watcher")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [FolderWatcher] %(message)s")


def _ensure_dirs() -> None:
    os.makedirs(WATCH_DIR, exist_ok=True)
    os.makedirs(PROCESSED_DIR, exist_ok=True)
    os.makedirs(FAILED_DIR, exist_ok=True)


def process_file(file_path: str) -> None:
    """Ingest a single file and move it to processed/ or failed/."""
    from tools.lead_ingestion import ingest_file

    filename = Path(file_path).name
    campaign_id = os.getenv("DEFAULT_INSTANTLY_CAMPAIGN_ID")  # optional auto-push

    logger.info(f"Processing: {filename}")

    try:
        result = ingest_file(
            file_path=file_path,
            filename=filename,
            source="folder_watch",
            auto_push_campaign_id=campaign_id,
        )

        logger.info(
            f"Done — inserted={result['inserted']}, updated={result['updated']}, "
            f"skipped={result['skipped']}, pushed_to_instantly={result['pushed_to_instantly']}"
        )

        if result["errors"]:
            for err in result["errors"]:
                logger.warning(f"  Warning: {err}")

        # Move to processed/
        dest = os.path.join(PROCESSED_DIR, filename)
        shutil.move(file_path, dest)
        logger.info(f"Moved to processed/: {filename}")

    except Exception as e:
        logger.error(f"Failed to process {filename}: {e}")
        dest = os.path.join(FAILED_DIR, filename)
        try:
            shutil.move(file_path, dest)
        except Exception:
            pass


class LeadFileHandler(FileSystemEventHandler):
    def on_created(self, event: FileCreatedEvent) -> None:
        if event.is_directory:
            return

        path = Path(event.src_path)

        # Ignore files in processed/ or failed/ subdirs
        if path.parent.name in ("processed", "failed"):
            return

        if path.suffix.lower() not in SUPPORTED_EXTENSIONS:
            return

        # Small delay to ensure the file is fully written before reading
        time.sleep(1)
        process_file(str(path))


def start_watcher() -> Observer:
    """Start the folder watcher in a background thread. Returns the Observer."""
    _ensure_dirs()
    handler = LeadFileHandler()
    observer = Observer()
    observer.schedule(handler, path=WATCH_DIR, recursive=False)
    observer.start()
    logger.info(f"Watching for new files in: {os.path.abspath(WATCH_DIR)}")
    return observer


def scan_existing(directory: str | None = None) -> None:
    """Process any files already sitting in the imports folder on startup."""
    watch = directory or WATCH_DIR
    _ensure_dirs()
    for f in Path(watch).iterdir():
        if f.is_file() and f.suffix.lower() in SUPPORTED_EXTENSIONS:
            logger.info(f"Found existing file on startup: {f.name}")
            process_file(str(f))


if __name__ == "__main__":
    # Run standalone
    scan_existing()
    observer = start_watcher()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()

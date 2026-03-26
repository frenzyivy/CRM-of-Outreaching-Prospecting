"""
Database Manager Tool
SQLite schema and CRUD operations for CRM metadata
(pipeline stages, activity logs).
"""

import os
import sqlite3
from datetime import datetime, date
from typing import Any


def _get_connection(db_path: str) -> sqlite3.Connection:
    """Get a SQLite connection with row factory."""
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db(db_path: str) -> None:
    """Create tables if they don't exist."""
    conn = _get_connection(db_path)
    try:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS lead_stages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lead_type TEXT NOT NULL,
                lead_key TEXT NOT NULL,
                stage TEXT NOT NULL DEFAULT 'new',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(lead_type, lead_key)
            );

            CREATE TABLE IF NOT EXISTS activities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lead_type TEXT NOT NULL,
                lead_key TEXT NOT NULL,
                activity_type TEXT NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_activities_date
                ON activities(created_at);
            CREATE INDEX IF NOT EXISTS idx_activities_lead
                ON activities(lead_type, lead_key);
            CREATE INDEX IF NOT EXISTS idx_lead_stages_key
                ON lead_stages(lead_type, lead_key);
        """)
        conn.commit()
    finally:
        conn.close()


# --- Lead Stages ---

def get_lead_stage(db_path: str, lead_type: str, lead_key: str) -> str:
    """Get the pipeline stage for a lead. Returns 'new' if not set."""
    conn = _get_connection(db_path)
    try:
        row = conn.execute(
            "SELECT stage FROM lead_stages WHERE lead_type = ? AND lead_key = ?",
            (lead_type, lead_key),
        ).fetchone()
        return row["stage"] if row else "new"
    finally:
        conn.close()


def get_all_stages(db_path: str) -> list[dict]:
    """Get all lead stage records."""
    conn = _get_connection(db_path)
    try:
        rows = conn.execute("SELECT * FROM lead_stages").fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def set_lead_stage(db_path: str, lead_type: str, lead_key: str, stage: str) -> None:
    """Set or update the pipeline stage for a lead."""
    conn = _get_connection(db_path)
    try:
        conn.execute(
            """INSERT INTO lead_stages (lead_type, lead_key, stage, updated_at)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(lead_type, lead_key)
               DO UPDATE SET stage = ?, updated_at = ?""",
            (lead_type, lead_key, stage, datetime.now().isoformat(),
             stage, datetime.now().isoformat()),
        )
        conn.commit()
    finally:
        conn.close()


# --- Activities ---

def log_activity(
    db_path: str,
    lead_type: str,
    lead_key: str,
    activity_type: str,
    description: str = "",
) -> int:
    """Log a new activity. Returns the activity ID."""
    conn = _get_connection(db_path)
    try:
        cursor = conn.execute(
            """INSERT INTO activities (lead_type, lead_key, activity_type, description, created_at)
               VALUES (?, ?, ?, ?, ?)""",
            (lead_type, lead_key, activity_type, description, datetime.now().isoformat()),
        )
        conn.commit()
        return cursor.lastrowid
    finally:
        conn.close()


def get_activities(
    db_path: str,
    lead_type: str | None = None,
    lead_key: str | None = None,
    activity_type: str | None = None,
    limit: int = 50,
) -> list[dict]:
    """Query activities with optional filters."""
    conn = _get_connection(db_path)
    try:
        query = "SELECT * FROM activities WHERE 1=1"
        params: list[Any] = []

        if lead_type:
            query += " AND lead_type = ?"
            params.append(lead_type)
        if lead_key:
            query += " AND lead_key = ?"
            params.append(lead_key)
        if activity_type:
            query += " AND activity_type = ?"
            params.append(activity_type)

        query += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)

        rows = conn.execute(query, params).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def get_today_stats(db_path: str) -> dict[str, int]:
    """Get activity counts for today."""
    conn = _get_connection(db_path)
    try:
        today = date.today().isoformat()
        rows = conn.execute(
            """SELECT activity_type, COUNT(*) as count
               FROM activities
               WHERE date(created_at) = ?
               GROUP BY activity_type""",
            (today,),
        ).fetchall()

        stats = {row["activity_type"]: row["count"] for row in rows}
        return {
            "emails_today": stats.get("email", 0),
            "calls_today": stats.get("call", 0),
            "outreaches_today": stats.get("email", 0) + stats.get("call", 0),
            "notes_today": stats.get("note", 0),
            "stage_changes_today": stats.get("stage_change", 0),
        }
    finally:
        conn.close()


def get_chart_data(db_path: str, days: int = 30) -> list[dict]:
    """Get daily activity counts for the last N days."""
    conn = _get_connection(db_path)
    try:
        rows = conn.execute(
            """SELECT date(created_at) as day, activity_type, COUNT(*) as count
               FROM activities
               WHERE created_at >= date('now', ?)
               GROUP BY date(created_at), activity_type
               ORDER BY day""",
            (f"-{days} days",),
        ).fetchall()

        # Pivot into { day, emails, calls, notes } format
        day_map: dict[str, dict] = {}
        for row in rows:
            d = row["day"]
            if d not in day_map:
                day_map[d] = {"day": d, "emails": 0, "calls": 0, "notes": 0}
            atype = row["activity_type"]
            if atype == "email":
                day_map[d]["emails"] = row["count"]
            elif atype == "call":
                day_map[d]["calls"] = row["count"]
            elif atype == "note":
                day_map[d]["notes"] = row["count"]

        return list(day_map.values())
    finally:
        conn.close()

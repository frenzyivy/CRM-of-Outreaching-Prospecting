"""
AI Medical CRM — FastAPI Backend (Modular Edition)
Entry point: uvicorn backend.app:app --reload
"""

import logging
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from core.supabase_client import get_client
from services.folder_watcher import start_watcher, scan_existing
from api.auth import get_current_user

from api import (
    agent,
    assistant,
    companies,
    dashboard,
    devices,
    leads,
    pipeline,
    activities,
    email,
    email_accounts,
    sync,
    integrations,
    whatsapp,
    revenue,
    notifications,
    search,
    today,
    leakage,
)

load_dotenv()

logger = logging.getLogger("server")


# --- Lifespan (startup / shutdown) ---

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup — verify Supabase connection
    try:
        get_client()
        logger.info("Supabase connected.")
    except Exception as e:
        logger.error(f"Supabase connection failed: {e}")

    # Process any files already sitting in /imports
    scan_existing()

    # Start the folder watcher in a background thread
    observer = start_watcher()

    # Start email sync scheduler (runs every 15 minutes)
    scheduler = None
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from services.email_sync import run_sync_cycle

        scheduler = BackgroundScheduler(timezone="UTC")
        scheduler.add_job(run_sync_cycle, "interval", minutes=15, id="email_sync",
                          max_instances=1, coalesce=True)
        scheduler.start()
        logger.info("Email sync scheduler started (every 15 min).")
    except ImportError:
        logger.warning("APScheduler not installed — email sync scheduler disabled. "
                       "Run: pip install apscheduler")
    except Exception as e:
        logger.error(f"Email sync scheduler failed to start: {e}")

    yield

    # Shutdown
    if scheduler and scheduler.running:
        scheduler.shutdown(wait=False)
    observer.stop()
    observer.join()


app = FastAPI(title="AI Medical CRM", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Register routers (all protected by JWT auth) ---
auth_dep = [Depends(get_current_user)]

app.include_router(agent.router, dependencies=auth_dep)
app.include_router(assistant.router, dependencies=auth_dep)
app.include_router(companies.router, dependencies=auth_dep)
app.include_router(dashboard.router, dependencies=auth_dep)
app.include_router(leads.router, dependencies=auth_dep)
app.include_router(pipeline.router, dependencies=auth_dep)
app.include_router(activities.router, dependencies=auth_dep)
app.include_router(email.router, dependencies=auth_dep)
app.include_router(email_accounts.router, dependencies=auth_dep)
app.include_router(sync.router, dependencies=auth_dep)
app.include_router(integrations.router, dependencies=auth_dep)
app.include_router(whatsapp.router, dependencies=auth_dep)
app.include_router(revenue.router, dependencies=auth_dep)
app.include_router(notifications.router, dependencies=auth_dep)
app.include_router(devices.router, dependencies=auth_dep)
app.include_router(search.router, dependencies=auth_dep)
app.include_router(today.router, dependencies=auth_dep)
app.include_router(leakage.router, dependencies=auth_dep)

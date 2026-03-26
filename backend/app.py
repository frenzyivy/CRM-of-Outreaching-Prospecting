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
from tools.folder_watcher import start_watcher, scan_existing
from backend.auth import get_current_user

from backend.routers import (
    agent,
    dashboard,
    leads,
    pipeline,
    activities,
    email,
    sync,
    integrations,
    whatsapp,
    revenue,
    notifications,
    search,
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

    yield

    # Shutdown
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
app.include_router(dashboard.router, dependencies=auth_dep)
app.include_router(leads.router, dependencies=auth_dep)
app.include_router(pipeline.router, dependencies=auth_dep)
app.include_router(activities.router, dependencies=auth_dep)
app.include_router(email.router, dependencies=auth_dep)
app.include_router(sync.router, dependencies=auth_dep)
app.include_router(integrations.router, dependencies=auth_dep)
app.include_router(whatsapp.router, dependencies=auth_dep)
app.include_router(revenue.router, dependencies=auth_dep)
app.include_router(notifications.router, dependencies=auth_dep)
app.include_router(search.router, dependencies=auth_dep)

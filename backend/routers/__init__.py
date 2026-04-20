# Backward-compat shim — routers moved to api/
from api import (  # noqa: F401
    agent, assistant, companies, dashboard, leads, pipeline,
    activities, email, sync, integrations, whatsapp,
    revenue, notifications, search,
)

"""
Pydantic request/response models for all API endpoints.
"""

from pydantic import BaseModel


class StageUpdate(BaseModel):
    stage: str
    description: str = ""


class ActivityCreate(BaseModel):
    lead_id: str
    activity_type: str  # email, call, note
    description: str = ""


class SyncPushRequest(BaseModel):
    campaign_id: str
    lead_emails: list[str] | None = None


class ExpenseCreate(BaseModel):
    name: str
    category: str = "tool"  # tool, api, salary, other
    amount: float
    period: str = "monthly"  # monthly, yearly, one-time


class IntegrationConnectRequest(BaseModel):
    integration_id: str
    credentials: dict[str, str]


class IntegrationDisconnectRequest(BaseModel):
    integration_id: str


class WhatsAppSendRequest(BaseModel):
    to_phone: str
    message: str
    lead_id: str | None = None

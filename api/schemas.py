"""
Pydantic request/response models for all API endpoints.
"""

from datetime import date as date_type

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
    base_amount: float
    tax: float = 0
    commission: float = 0
    original_usd: float | None = None
    payment_date: date_type  # required
    period: str = "monthly"  # monthly, yearly, one-time


class ExpenseUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    base_amount: float | None = None
    tax: float | None = None
    commission: float | None = None
    original_usd: float | None = None
    payment_date: date_type | None = None
    period: str | None = None


class IntegrationConnectRequest(BaseModel):
    integration_id: str
    credentials: dict[str, str]


class DeviceRegisterRequest(BaseModel):
    fcm_token: str
    platform: str = "android"  # android | ios | web


class DeviceUnregisterRequest(BaseModel):
    fcm_token: str


class IntegrationDisconnectRequest(BaseModel):
    integration_id: str


class WhatsAppSendRequest(BaseModel):
    to_phone: str
    message: str
    lead_id: str | None = None

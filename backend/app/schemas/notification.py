from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class NotificationSubscriptionCreate(BaseModel):
    """Schema for creating a push notification subscription."""
    endpoint: str = Field(..., description="Push service endpoint URL")
    p256dh_key: str = Field(..., description="P256DH public key for encryption")
    auth_key: str = Field(..., description="Auth secret for encryption")


class NotificationSubscriptionResponse(BaseModel):
    """Schema for notification subscription response."""
    id: int
    user_id: int
    endpoint: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationPreferencesUpdate(BaseModel):
    """Schema for updating notification preferences."""
    budget_warnings_enabled: Optional[bool] = None
    budget_exceeded_enabled: Optional[bool] = None
    warning_threshold: Optional[int] = Field(None, ge=1, le=100, description="Warning threshold percentage (1-100)")


class NotificationPreferencesResponse(BaseModel):
    """Schema for notification preferences response."""
    id: int
    user_id: int
    budget_warnings_enabled: bool
    budget_exceeded_enabled: bool
    warning_threshold: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PushNotificationPayload(BaseModel):
    """Schema for push notification payload."""
    title: str = Field(..., max_length=200)
    message: str = Field(..., description="Notification message body")
    data: Optional[Dict[str, Any]] = Field(None, description="Additional notification data")
    icon: Optional[str] = Field(None, description="Notification icon URL")
    badge: Optional[str] = Field(None, description="Notification badge URL")
    tag: Optional[str] = Field(None, description="Notification tag for grouping")


class BudgetNotificationData(BaseModel):
    """Schema for budget-related notification data."""
    budget_id: int
    category_id: int
    category_name: str
    current_spending: float
    budget_amount: float
    percentage_used: float
    notification_type: str  # 'budget_warning' or 'budget_exceeded'


class NotificationLogResponse(BaseModel):
    """Schema for notification log response."""
    id: int
    user_id: int
    notification_type: str
    title: str
    message: str
    data: Optional[Dict[str, Any]]
    sent_at: datetime
    success: bool
    error_message: Optional[str]

    class Config:
        from_attributes = True


class NotificationTestRequest(BaseModel):
    """Schema for testing notification delivery."""
    title: str = Field(..., max_length=200)
    message: str
    data: Optional[Dict[str, Any]] = None
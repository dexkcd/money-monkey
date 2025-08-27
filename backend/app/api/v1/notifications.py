from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ...core.deps import get_db, get_current_user
from ...models.user import User
from ...services.notification import NotificationService
from ...services.budget_monitor import BudgetMonitorService
from ...schemas.notification import (
    NotificationSubscriptionCreate,
    NotificationSubscriptionResponse,
    NotificationPreferencesUpdate,
    NotificationPreferencesResponse,
    NotificationLogResponse,
    NotificationTestRequest
)

router = APIRouter()


@router.post("/subscriptions", response_model=NotificationSubscriptionResponse)
def create_notification_subscription(
    subscription_data: NotificationSubscriptionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create or update a push notification subscription."""
    notification_service = NotificationService(db)
    subscription = notification_service.create_subscription(subscription_data, current_user.id)
    return subscription


@router.get("/subscriptions", response_model=List[NotificationSubscriptionResponse])
def get_notification_subscriptions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all notification subscriptions for the current user."""
    notification_service = NotificationService(db)
    subscriptions = notification_service.get_user_subscriptions(current_user.id)
    return subscriptions


@router.delete("/subscriptions/{subscription_id}")
def deactivate_notification_subscription(
    subscription_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Deactivate a notification subscription."""
    notification_service = NotificationService(db)
    success = notification_service.deactivate_subscription(subscription_id, current_user.id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )
    
    return {"message": "Subscription deactivated successfully"}


@router.get("/preferences", response_model=NotificationPreferencesResponse)
def get_notification_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get notification preferences for the current user."""
    notification_service = NotificationService(db)
    preferences = notification_service.get_notification_preferences(current_user.id)
    return preferences


@router.put("/preferences", response_model=NotificationPreferencesResponse)
def update_notification_preferences(
    preferences_data: NotificationPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update notification preferences for the current user."""
    notification_service = NotificationService(db)
    preferences = notification_service.update_notification_preferences(current_user.id, preferences_data)
    return preferences


@router.get("/logs", response_model=List[NotificationLogResponse])
def get_notification_logs(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get notification logs for the current user."""
    notification_service = NotificationService(db)
    logs = notification_service.get_notification_logs(current_user.id, limit)
    return logs


@router.post("/test")
def send_test_notification(
    test_request: NotificationTestRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a test notification to all user's active subscriptions."""
    notification_service = NotificationService(db)
    sent_count = notification_service.test_notification(
        current_user.id,
        test_request.title,
        test_request.message,
        test_request.data
    )
    
    return {
        "message": f"Test notification sent to {sent_count} subscription(s)",
        "sent_count": sent_count
    }


@router.post("/check-budget-alerts")
def check_budget_alerts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Manually check budget alerts for the current user and send notifications."""
    budget_monitor = BudgetMonitorService(db)
    results = budget_monitor.check_user_budget_alerts(current_user.id)
    
    total_notifications = sum(result['notifications_sent'] for result in results)
    
    return {
        "message": f"Budget alerts checked. {len(results)} alerts found, {total_notifications} notifications sent.",
        "alerts_found": len(results),
        "notifications_sent": total_notifications,
        "details": results
    }


@router.get("/budget-status")
def get_budget_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive budget status for the current user."""
    budget_monitor = BudgetMonitorService(db)
    status = budget_monitor.get_budget_status_for_user(current_user.id)
    return status


@router.get("/vapid-public-key")
def get_vapid_public_key():
    """Get the VAPID public key for push notification setup."""
    from ...core.config import settings
    
    if not settings.vapid_public_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Push notifications not configured"
        )
    
    return {"vapid_public_key": settings.vapid_public_key}
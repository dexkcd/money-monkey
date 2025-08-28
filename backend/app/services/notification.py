import json
import logging
import base64
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from pywebpush import webpush, WebPushException

from ..models.notification import NotificationSubscription, NotificationLog, NotificationPreferences
from ..models.user import User
from ..models.category import Category
from ..schemas.notification import (
    NotificationSubscriptionCreate,
    NotificationPreferencesUpdate,
    PushNotificationPayload,
    BudgetNotificationData
)
from ..core.config import settings

logger = logging.getLogger(__name__)


class NotificationService:
    def __init__(self, db: Session):
        self.db = db
    
    def _get_vapid_private_key(self) -> str:
        """Get the VAPID private key in PEM format for pywebpush."""
        vapid_key = settings.vapid_private_key
        if not vapid_key:
            raise ValueError("VAPID private key not configured")
        
        try:
            # Decode the base64 encoded key to get the PEM format
            decoded_key = base64.b64decode(vapid_key).decode('utf-8')
            return decoded_key
        except Exception as e:
            logger.error(f"Failed to decode VAPID private key: {e}")
            raise ValueError(f"Invalid VAPID private key format: {e}")

    def create_subscription(self, subscription_data: NotificationSubscriptionCreate, user_id: int) -> NotificationSubscription:
        """Create or update a push notification subscription for a user."""
        # Check if subscription already exists for this endpoint
        existing_subscription = self.db.query(NotificationSubscription).filter(
            NotificationSubscription.user_id == user_id,
            NotificationSubscription.endpoint == subscription_data.endpoint
        ).first()

        if existing_subscription:
            # Update existing subscription
            existing_subscription.p256dh_key = subscription_data.p256dh_key
            existing_subscription.auth_key = subscription_data.auth_key
            existing_subscription.is_active = True
            existing_subscription.updated_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(existing_subscription)
            return existing_subscription

        # Create new subscription
        subscription = NotificationSubscription(
            user_id=user_id,
            endpoint=subscription_data.endpoint,
            p256dh_key=subscription_data.p256dh_key,
            auth_key=subscription_data.auth_key
        )
        
        self.db.add(subscription)
        self.db.commit()
        self.db.refresh(subscription)
        return subscription

    def get_user_subscriptions(self, user_id: int, active_only: bool = True) -> List[NotificationSubscription]:
        """Get all notification subscriptions for a user."""
        query = self.db.query(NotificationSubscription).filter(
            NotificationSubscription.user_id == user_id
        )
        
        if active_only:
            query = query.filter(NotificationSubscription.is_active == True)
        
        return query.all()

    def deactivate_subscription(self, subscription_id: int, user_id: int) -> bool:
        """Deactivate a notification subscription."""
        subscription = self.db.query(NotificationSubscription).filter(
            NotificationSubscription.id == subscription_id,
            NotificationSubscription.user_id == user_id
        ).first()

        if not subscription:
            return False

        subscription.is_active = False
        subscription.updated_at = datetime.utcnow()
        self.db.commit()
        return True

    def get_notification_preferences(self, user_id: int) -> NotificationPreferences:
        """Get notification preferences for a user, creating default if not exists."""
        preferences = self.db.query(NotificationPreferences).filter(
            NotificationPreferences.user_id == user_id
        ).first()

        if not preferences:
            try:
                # Create default preferences
                preferences = NotificationPreferences(
                    user_id=user_id,
                    budget_warnings_enabled=True,
                    budget_exceeded_enabled=True,
                    warning_threshold=80
                )
                self.db.add(preferences)
                self.db.commit()
                self.db.refresh(preferences)
            except Exception as e:
                # Handle race condition - another request might have created the preferences
                self.db.rollback()
                preferences = self.db.query(NotificationPreferences).filter(
                    NotificationPreferences.user_id == user_id
                ).first()
                
                if not preferences:
                    # If still not found, re-raise the original exception
                    raise e

        return preferences

    def update_notification_preferences(self, user_id: int, preferences_data: NotificationPreferencesUpdate) -> NotificationPreferences:
        """Update notification preferences for a user."""
        preferences = self.get_notification_preferences(user_id)
        
        update_data = preferences_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(preferences, field, value)

        preferences.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(preferences)
        return preferences

    def send_push_notification(self, subscription: NotificationSubscription, payload: PushNotificationPayload) -> bool:
        """Send a push notification to a specific subscription."""
        try:
            # Prepare the notification payload
            notification_payload = {
                "title": payload.title,
                "body": payload.message,
                "data": payload.data or {},
                "icon": payload.icon or "/icon-192x192.png",
                "badge": payload.badge or "/badge-72x72.png",
                "tag": payload.tag or "expense-tracker"
            }

            # Get the decoded VAPID private key
            vapid_private_key = self._get_vapid_private_key()
            
            # Send the push notification
            webpush(
                subscription_info={
                    "endpoint": subscription.endpoint,
                    "keys": {
                        "p256dh": subscription.p256dh_key,
                        "auth": subscription.auth_key
                    }
                },
                data=json.dumps(notification_payload),
                vapid_private_key=vapid_private_key,
                vapid_claims={
                    "sub": f"mailto:{settings.vapid_claim_email}"
                }
            )

            # Log successful notification
            self._log_notification(
                user_id=subscription.user_id,
                subscription_id=subscription.id,
                notification_type=payload.data.get('type', 'general') if payload.data else 'general',
                title=payload.title,
                message=payload.message,
                data=payload.data,
                success=True
            )

            logger.info(f"Push notification sent successfully to user {subscription.user_id}")
            return True

        except WebPushException as e:
            error_msg = f"WebPush error: {str(e)}"
            logger.error(f"Failed to send push notification to user {subscription.user_id}: {error_msg}")
            
            # Log failed notification
            self._log_notification(
                user_id=subscription.user_id,
                subscription_id=subscription.id,
                notification_type=payload.data.get('type', 'general') if payload.data else 'general',
                title=payload.title,
                message=payload.message,
                data=payload.data,
                success=False,
                error_message=error_msg
            )

            # If subscription is invalid, deactivate it
            if e.response and e.response.status_code in [410, 404]:
                subscription.is_active = False
                self.db.commit()
                logger.info(f"Deactivated invalid subscription {subscription.id}")

            return False

        except Exception as e:
            error_msg = f"Unexpected error: {str(e)}"
            logger.error(f"Failed to send push notification to user {subscription.user_id}: {error_msg}")
            
            # Log failed notification
            self._log_notification(
                user_id=subscription.user_id,
                subscription_id=subscription.id,
                notification_type=payload.data.get('type', 'general') if payload.data else 'general',
                title=payload.title,
                message=payload.message,
                data=payload.data,
                success=False,
                error_message=error_msg
            )
            return False

    def send_budget_notification(self, user_id: int, notification_data: BudgetNotificationData) -> int:
        """Send budget-related notifications to all user's active subscriptions."""
        # Check user preferences
        preferences = self.get_notification_preferences(user_id)
        
        if notification_data.notification_type == 'budget_warning' and not preferences.budget_warnings_enabled:
            logger.info(f"Budget warnings disabled for user {user_id}")
            return 0
        
        if notification_data.notification_type == 'budget_exceeded' and not preferences.budget_exceeded_enabled:
            logger.info(f"Budget exceeded notifications disabled for user {user_id}")
            return 0

        # Get user's active subscriptions
        subscriptions = self.get_user_subscriptions(user_id, active_only=True)
        
        if not subscriptions:
            logger.info(f"No active subscriptions found for user {user_id}")
            return 0

        # Prepare notification content
        if notification_data.notification_type == 'budget_warning':
            title = f"Budget Warning: {notification_data.category_name}"
            message = f"You've spent ${notification_data.current_spending:.2f} ({notification_data.percentage_used:.1f}%) of your ${notification_data.budget_amount:.2f} budget for {notification_data.category_name}."
        else:  # budget_exceeded
            title = f"Budget Exceeded: {notification_data.category_name}"
            over_amount = notification_data.current_spending - notification_data.budget_amount
            message = f"You've exceeded your ${notification_data.budget_amount:.2f} budget for {notification_data.category_name} by ${over_amount:.2f}."

        payload = PushNotificationPayload(
            title=title,
            message=message,
            data={
                "type": notification_data.notification_type,
                "budget_id": notification_data.budget_id,
                "category_id": notification_data.category_id,
                "category_name": notification_data.category_name,
                "current_spending": notification_data.current_spending,
                "budget_amount": notification_data.budget_amount,
                "percentage_used": notification_data.percentage_used
            },
            tag=f"budget-{notification_data.budget_id}"
        )

        # Send to all active subscriptions
        successful_sends = 0
        for subscription in subscriptions:
            if self.send_push_notification(subscription, payload):
                successful_sends += 1

        logger.info(f"Sent budget notification to {successful_sends}/{len(subscriptions)} subscriptions for user {user_id}")
        return successful_sends

    def _log_notification(self, user_id: int, subscription_id: Optional[int], notification_type: str,
                         title: str, message: str, data: Optional[Dict[str, Any]] = None,
                         success: bool = False, error_message: Optional[str] = None):
        """Log a notification attempt."""
        log_entry = NotificationLog(
            user_id=user_id,
            subscription_id=subscription_id,
            notification_type=notification_type,
            title=title,
            message=message,
            data=data,
            success=success,
            error_message=error_message
        )
        
        self.db.add(log_entry)
        self.db.commit()

    def get_notification_logs(self, user_id: int, limit: int = 50) -> List[NotificationLog]:
        """Get notification logs for a user."""
        return self.db.query(NotificationLog).filter(
            NotificationLog.user_id == user_id
        ).order_by(NotificationLog.sent_at.desc()).limit(limit).all()

    def test_notification(self, user_id: int, title: str, message: str, data: Optional[Dict[str, Any]] = None) -> int:
        """Send a test notification to all user's active subscriptions."""
        subscriptions = self.get_user_subscriptions(user_id, active_only=True)
        
        if not subscriptions:
            return 0

        payload = PushNotificationPayload(
            title=title,
            message=message,
            data=data or {"type": "test"},
            tag="test-notification"
        )

        successful_sends = 0
        for subscription in subscriptions:
            if self.send_push_notification(subscription, payload):
                successful_sends += 1

        return successful_sends
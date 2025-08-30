"""
Unit tests for NotificationService
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime
from decimal import Decimal
import json
import base64

from app.services.notification import NotificationService
from app.models.notification import NotificationSubscription, NotificationPreferences, NotificationLog
from app.schemas.notification import (
    NotificationSubscriptionCreate, 
    NotificationPreferencesUpdate,
    PushNotificationPayload,
    BudgetNotificationData
)
from tests.factories import UserFactory, NotificationSubscriptionFactory


class TestNotificationService:
    
    @pytest.fixture
    def notification_service(self, db_session):
        return NotificationService(db_session)
    
    @pytest.fixture
    def mock_vapid_keys(self):
        """Mock VAPID keys for testing"""
        private_key_pem = """-----BEGIN EC PRIVATE KEY-----
MHcCAQEEIBhTCCE1l8ZbkOjFWcNgWwzKzH5rZGZkZGZkZGZkZGZkoAoGCCqGSM49
AwEHoUQDQgAEZGZkZGZkZGZkZGZkZGZkZGZkZGZkZGZkZGZkZGZkZGZkZGZkZGZk
ZGZkZGZkZGZkZGZkZGZkZGZkZGZkZGZkZA==
-----END EC PRIVATE KEY-----"""
        
        # Base64 encode the PEM key
        encoded_key = base64.b64encode(private_key_pem.encode()).decode()
        
        with patch('app.core.config.settings') as mock_settings:
            mock_settings.vapid_private_key = encoded_key
            mock_settings.vapid_public_key = "test_public_key"
            mock_settings.vapid_claim_email = "test@example.com"
            yield mock_settings
    
    def test_create_subscription_new(self, db_session, notification_service):
        """Test creating a new notification subscription"""
        user = UserFactory(sqlalchemy_session=db_session)
        
        subscription_data = NotificationSubscriptionCreate(
            endpoint="https://fcm.googleapis.com/fcm/send/test",
            p256dh_key="test_p256dh_key",
            auth_key="test_auth_key"
        )
        
        result = notification_service.create_subscription(subscription_data, user.id)
        
        assert result.user_id == user.id
        assert result.endpoint == "https://fcm.googleapis.com/fcm/send/test"
        assert result.p256dh_key == "test_p256dh_key"
        assert result.auth_key == "test_auth_key"
        assert result.is_active is True
    
    def test_create_subscription_update_existing(self, db_session, notification_service):
        """Test updating an existing notification subscription"""
        user = UserFactory(sqlalchemy_session=db_session)
        
        # Create existing subscription
        existing_subscription = NotificationSubscriptionFactory(
            sqlalchemy_session=db_session,
            user_id=user.id,
            endpoint="https://fcm.googleapis.com/fcm/send/test",
            p256dh_key="old_key",
            auth_key="old_auth"
        )
        
        subscription_data = NotificationSubscriptionCreate(
            endpoint="https://fcm.googleapis.com/fcm/send/test",
            p256dh_key="new_p256dh_key",
            auth_key="new_auth_key"
        )
        
        result = notification_service.create_subscription(subscription_data, user.id)
        
        assert result.id == existing_subscription.id
        assert result.p256dh_key == "new_p256dh_key"
        assert result.auth_key == "new_auth_key"
        assert result.is_active is True
    
    def test_get_user_subscriptions(self, db_session, notification_service):
        """Test getting user subscriptions"""
        user = UserFactory(sqlalchemy_session=db_session)
        
        # Create active subscription
        active_sub = NotificationSubscriptionFactory(
            sqlalchemy_session=db_session,
            user_id=user.id,
            is_active=True
        )
        
        # Create inactive subscription
        inactive_sub = NotificationSubscriptionFactory(
            sqlalchemy_session=db_session,
            user_id=user.id,
            is_active=False
        )
        
        # Test active only (default)
        active_subscriptions = notification_service.get_user_subscriptions(user.id)
        assert len(active_subscriptions) == 1
        assert active_subscriptions[0].id == active_sub.id
        
        # Test all subscriptions
        all_subscriptions = notification_service.get_user_subscriptions(user.id, active_only=False)
        assert len(all_subscriptions) == 2
    
    def test_deactivate_subscription(self, db_session, notification_service):
        """Test deactivating a subscription"""
        user = UserFactory(sqlalchemy_session=db_session)
        subscription = NotificationSubscriptionFactory(
            sqlalchemy_session=db_session,
            user_id=user.id,
            is_active=True
        )
        
        result = notification_service.deactivate_subscription(subscription.id, user.id)
        
        assert result is True
        
        # Verify subscription is deactivated
        db_session.refresh(subscription)
        assert subscription.is_active is False
    
    def test_deactivate_subscription_not_found(self, db_session, notification_service):
        """Test deactivating non-existent subscription returns False"""
        user = UserFactory(sqlalchemy_session=db_session)
        
        result = notification_service.deactivate_subscription(999, user.id)
        
        assert result is False
    
    def test_get_notification_preferences_create_default(self, db_session, notification_service):
        """Test getting notification preferences creates default if not exists"""
        user = UserFactory(sqlalchemy_session=db_session)
        
        preferences = notification_service.get_notification_preferences(user.id)
        
        assert preferences.user_id == user.id
        assert preferences.budget_warnings_enabled is True
        assert preferences.budget_exceeded_enabled is True
        assert preferences.warning_threshold == 80
    
    def test_get_notification_preferences_existing(self, db_session, notification_service):
        """Test getting existing notification preferences"""
        user = UserFactory(sqlalchemy_session=db_session)
        
        # Create existing preferences
        existing_prefs = NotificationPreferences(
            user_id=user.id,
            budget_warnings_enabled=False,
            budget_exceeded_enabled=True,
            warning_threshold=90
        )
        db_session.add(existing_prefs)
        db_session.commit()
        
        preferences = notification_service.get_notification_preferences(user.id)
        
        assert preferences.budget_warnings_enabled is False
        assert preferences.warning_threshold == 90
    
    def test_update_notification_preferences(self, db_session, notification_service):
        """Test updating notification preferences"""
        user = UserFactory(sqlalchemy_session=db_session)
        
        # Create initial preferences
        notification_service.get_notification_preferences(user.id)
        
        update_data = NotificationPreferencesUpdate(
            budget_warnings_enabled=False,
            warning_threshold=90
        )
        
        result = notification_service.update_notification_preferences(user.id, update_data)
        
        assert result.budget_warnings_enabled is False
        assert result.warning_threshold == 90
        assert result.budget_exceeded_enabled is True  # Should remain unchanged
    
    @patch('app.services.notification.webpush')
    def test_send_push_notification_success(self, mock_webpush, db_session, notification_service, mock_vapid_keys):
        """Test successful push notification sending"""
        user = UserFactory(sqlalchemy_session=db_session)
        subscription = NotificationSubscriptionFactory(
            sqlalchemy_session=db_session,
            user_id=user.id
        )
        
        payload = PushNotificationPayload(
            title="Test Notification",
            message="This is a test message",
            data={"type": "test"}
        )
        
        mock_webpush.return_value = None  # Success
        
        result = notification_service.send_push_notification(subscription, payload)
        
        assert result is True
        mock_webpush.assert_called_once()
        
        # Verify notification log was created
        log_entry = db_session.query(NotificationLog).filter(
            NotificationLog.user_id == user.id
        ).first()
        assert log_entry is not None
        assert log_entry.success is True
        assert log_entry.title == "Test Notification"
    
    @patch('app.services.notification.webpush')
    def test_send_push_notification_failure(self, mock_webpush, db_session, notification_service, mock_vapid_keys):
        """Test push notification sending failure"""
        from pywebpush import WebPushException
        
        user = UserFactory(sqlalchemy_session=db_session)
        subscription = NotificationSubscriptionFactory(
            sqlalchemy_session=db_session,
            user_id=user.id
        )
        
        payload = PushNotificationPayload(
            title="Test Notification",
            message="This is a test message"
        )
        
        # Mock WebPush exception
        mock_response = Mock()
        mock_response.status_code = 410
        mock_webpush.side_effect = WebPushException("Subscription expired", response=mock_response)
        
        result = notification_service.send_push_notification(subscription, payload)
        
        assert result is False
        
        # Verify subscription was deactivated
        db_session.refresh(subscription)
        assert subscription.is_active is False
        
        # Verify error log was created
        log_entry = db_session.query(NotificationLog).filter(
            NotificationLog.user_id == user.id
        ).first()
        assert log_entry is not None
        assert log_entry.success is False
        assert "WebPush error" in log_entry.error_message
    
    def test_send_budget_notification_warning_enabled(self, db_session, notification_service):
        """Test sending budget warning notification when enabled"""
        user = UserFactory(sqlalchemy_session=db_session)
        subscription = NotificationSubscriptionFactory(
            sqlalchemy_session=db_session,
            user_id=user.id
        )
        
        # Create preferences with warnings enabled
        prefs = NotificationPreferences(
            user_id=user.id,
            budget_warnings_enabled=True,
            budget_exceeded_enabled=True
        )
        db_session.add(prefs)
        db_session.commit()
        
        notification_data = BudgetNotificationData(
            budget_id=1,
            category_id=1,
            category_name="Food",
            current_spending=Decimal("80.00"),
            budget_amount=Decimal("100.00"),
            percentage_used=80.0,
            notification_type="budget_warning"
        )
        
        with patch.object(notification_service, 'send_push_notification', return_value=True) as mock_send:
            result = notification_service.send_budget_notification(user.id, notification_data)
        
        assert result == 1
        mock_send.assert_called_once()
        
        # Check the payload
        call_args = mock_send.call_args
        payload = call_args[0][1]  # Second argument is the payload
        assert "Budget Warning: Food" in payload.title
        assert "80%" in payload.message
    
    def test_send_budget_notification_warning_disabled(self, db_session, notification_service):
        """Test budget warning notification when disabled"""
        user = UserFactory(sqlalchemy_session=db_session)
        subscription = NotificationSubscriptionFactory(
            sqlalchemy_session=db_session,
            user_id=user.id
        )
        
        # Create preferences with warnings disabled
        prefs = NotificationPreferences(
            user_id=user.id,
            budget_warnings_enabled=False,
            budget_exceeded_enabled=True
        )
        db_session.add(prefs)
        db_session.commit()
        
        notification_data = BudgetNotificationData(
            budget_id=1,
            category_id=1,
            category_name="Food",
            current_spending=Decimal("80.00"),
            budget_amount=Decimal("100.00"),
            percentage_used=80.0,
            notification_type="budget_warning"
        )
        
        result = notification_service.send_budget_notification(user.id, notification_data)
        
        assert result == 0  # No notifications sent
    
    def test_send_budget_notification_exceeded(self, db_session, notification_service):
        """Test sending budget exceeded notification"""
        user = UserFactory(sqlalchemy_session=db_session)
        subscription = NotificationSubscriptionFactory(
            sqlalchemy_session=db_session,
            user_id=user.id
        )
        
        # Create preferences
        prefs = NotificationPreferences(
            user_id=user.id,
            budget_warnings_enabled=True,
            budget_exceeded_enabled=True
        )
        db_session.add(prefs)
        db_session.commit()
        
        notification_data = BudgetNotificationData(
            budget_id=1,
            category_id=1,
            category_name="Food",
            current_spending=Decimal("120.00"),
            budget_amount=Decimal("100.00"),
            percentage_used=120.0,
            notification_type="budget_exceeded"
        )
        
        with patch.object(notification_service, 'send_push_notification', return_value=True) as mock_send:
            result = notification_service.send_budget_notification(user.id, notification_data)
        
        assert result == 1
        mock_send.assert_called_once()
        
        # Check the payload
        call_args = mock_send.call_args
        payload = call_args[0][1]
        assert "Budget Exceeded: Food" in payload.title
        assert "exceeded" in payload.message
        assert "$20.00" in payload.message  # Over amount
    
    def test_send_budget_notification_no_subscriptions(self, db_session, notification_service):
        """Test budget notification with no active subscriptions"""
        user = UserFactory(sqlalchemy_session=db_session)
        
        notification_data = BudgetNotificationData(
            budget_id=1,
            category_id=1,
            category_name="Food",
            current_spending=Decimal("80.00"),
            budget_amount=Decimal("100.00"),
            percentage_used=80.0,
            notification_type="budget_warning"
        )
        
        result = notification_service.send_budget_notification(user.id, notification_data)
        
        assert result == 0
    
    def test_get_notification_logs(self, db_session, notification_service):
        """Test getting notification logs"""
        user = UserFactory(sqlalchemy_session=db_session)
        
        # Create notification logs
        log1 = NotificationLog(
            user_id=user.id,
            notification_type="budget_warning",
            title="Test 1",
            message="Message 1",
            success=True
        )
        log2 = NotificationLog(
            user_id=user.id,
            notification_type="budget_exceeded",
            title="Test 2",
            message="Message 2",
            success=False,
            error_message="Test error"
        )
        
        db_session.add_all([log1, log2])
        db_session.commit()
        
        logs = notification_service.get_notification_logs(user.id)
        
        assert len(logs) == 2
        # Should be ordered by sent_at desc (most recent first)
        assert logs[0].title in ["Test 1", "Test 2"]
        assert logs[1].title in ["Test 1", "Test 2"]
    
    def test_test_notification(self, db_session, notification_service):
        """Test sending a test notification"""
        user = UserFactory(sqlalchemy_session=db_session)
        subscription = NotificationSubscriptionFactory(
            sqlalchemy_session=db_session,
            user_id=user.id
        )
        
        with patch.object(notification_service, 'send_push_notification', return_value=True) as mock_send:
            result = notification_service.test_notification(
                user.id, 
                "Test Title", 
                "Test Message",
                {"custom": "data"}
            )
        
        assert result == 1
        mock_send.assert_called_once()
        
        # Check the payload
        call_args = mock_send.call_args
        payload = call_args[0][1]
        assert payload.title == "Test Title"
        assert payload.message == "Test Message"
        assert payload.data["custom"] == "data"
        assert payload.tag == "test-notification"
"""
Test helper functions for creating test data
"""
from decimal import Decimal
from datetime import date, datetime
from app.models.user import User
from app.models.category import Category
from app.models.expense import Expense
from app.models.budget import Budget
from app.models.notification import NotificationSubscription
from app.core.security import get_password_hash


def create_test_user(db_session, email="test@example.com", password="testpassword123"):
    """Create a test user"""
    user = User(
        email=email,
        password_hash=get_password_hash(password)
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def create_test_category(db_session, name="Test Category", color="#FF0000", is_default=False, user_id=None):
    """Create a test category"""
    category = Category(
        name=name,
        color=color,
        is_default=is_default,
        user_id=user_id
    )
    db_session.add(category)
    db_session.commit()
    db_session.refresh(category)
    return category


def create_test_expense(db_session, user_id, category_id, amount=Decimal("25.50"), 
                       description="Test expense", expense_date=None):
    """Create a test expense"""
    if expense_date is None:
        expense_date = date.today()
    
    expense = Expense(
        user_id=user_id,
        category_id=category_id,
        amount=amount,
        description=description,
        expense_date=expense_date
    )
    db_session.add(expense)
    db_session.commit()
    db_session.refresh(expense)
    return expense


def create_test_budget(db_session, user_id, category_id, amount=Decimal("500.00"), 
                      period_type="MONTHLY", start_date=None, end_date=None):
    """Create a test budget"""
    if start_date is None:
        start_date = date.today()
    if end_date is None:
        end_date = date.today().replace(day=28)
    
    budget = Budget(
        user_id=user_id,
        category_id=category_id,
        amount=amount,
        period_type=period_type,
        start_date=start_date,
        end_date=end_date
    )
    db_session.add(budget)
    db_session.commit()
    db_session.refresh(budget)
    return budget


def create_test_notification_subscription(db_session, user_id, 
                                         endpoint="https://fcm.googleapis.com/fcm/send/test",
                                         p256dh_key="test_p256dh_key", auth_key="test_auth_key"):
    """Create a test notification subscription"""
    subscription = NotificationSubscription(
        user_id=user_id,
        endpoint=endpoint,
        p256dh_key=p256dh_key,
        auth_key=auth_key,
        is_active=True
    )
    db_session.add(subscription)
    db_session.commit()
    db_session.refresh(subscription)
    return subscription
"""
Test data factories using factory_boy
"""
import factory
from datetime import date, datetime
from decimal import Decimal
from factory.alchemy import SQLAlchemyModelFactory

from app.models.user import User
from app.models.category import Category
from app.models.expense import Expense
from app.models.budget import Budget
from app.models.notification import NotificationSubscription
from app.services.auth import get_password_hash


class UserFactory(SQLAlchemyModelFactory):
    class Meta:
        model = User
        sqlalchemy_session_persistence = "commit"

    email = factory.Sequence(lambda n: f"user{n}@example.com")
    hashed_password = factory.LazyFunction(lambda: get_password_hash("testpassword123"))
    created_at = factory.LazyFunction(datetime.utcnow)


class CategoryFactory(SQLAlchemyModelFactory):
    class Meta:
        model = Category
        sqlalchemy_session_persistence = "commit"

    name = factory.Faker("word")
    color = "#6B7280"
    is_default = False
    user_id = None


class ExpenseFactory(SQLAlchemyModelFactory):
    class Meta:
        model = Expense
        sqlalchemy_session_persistence = "commit"

    amount = factory.LazyFunction(lambda: Decimal("25.50"))
    description = factory.Faker("sentence", nb_words=4)
    expense_date = factory.LazyFunction(date.today)
    receipt_url = None
    ai_confidence = None
    created_at = factory.LazyFunction(datetime.utcnow)
    updated_at = factory.LazyFunction(datetime.utcnow)

    user_id = factory.SubFactory(UserFactory)
    category_id = factory.SubFactory(CategoryFactory)


class BudgetFactory(SQLAlchemyModelFactory):
    class Meta:
        model = Budget
        sqlalchemy_session_persistence = "commit"

    amount = factory.LazyFunction(lambda: Decimal("500.00"))
    period_type = "MONTHLY"
    start_date = factory.LazyFunction(date.today)
    end_date = factory.LazyFunction(lambda: date.today().replace(day=28))
    created_at = factory.LazyFunction(datetime.utcnow)

    user_id = factory.SubFactory(UserFactory)
    category_id = factory.SubFactory(CategoryFactory)


class NotificationSubscriptionFactory(SQLAlchemyModelFactory):
    class Meta:
        model = NotificationSubscription
        sqlalchemy_session_persistence = "commit"

    endpoint = "https://fcm.googleapis.com/fcm/send/test"
    p256dh_key = "test_p256dh_key"
    auth_key = "test_auth_key"
    is_active = True
    created_at = factory.LazyFunction(datetime.utcnow)

    user_id = factory.SubFactory(UserFactory)
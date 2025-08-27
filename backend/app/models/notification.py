from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .user import Base


class NotificationSubscription(Base):
    """Model for storing push notification subscriptions."""
    __tablename__ = "notification_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    endpoint = Column(String(500), nullable=False)
    p256dh_key = Column(String(200), nullable=False)
    auth_key = Column(String(200), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationship
    user = relationship("User", back_populates="notification_subscriptions")


class NotificationLog(Base):
    """Model for logging sent notifications."""
    __tablename__ = "notification_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    subscription_id = Column(Integer, ForeignKey("notification_subscriptions.id"), nullable=True)
    notification_type = Column(String(50), nullable=False)  # 'budget_warning', 'budget_exceeded'
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    data = Column(JSON, nullable=True)  # Additional data like budget_id, category_id, etc.
    sent_at = Column(DateTime(timezone=True), server_default=func.now())
    success = Column(Boolean, default=False)
    error_message = Column(Text, nullable=True)

    # Relationships
    user = relationship("User")
    subscription = relationship("NotificationSubscription")


class NotificationPreferences(Base):
    """Model for user notification preferences."""
    __tablename__ = "notification_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    budget_warnings_enabled = Column(Boolean, default=True)
    budget_exceeded_enabled = Column(Boolean, default=True)
    warning_threshold = Column(Integer, default=80)  # Percentage threshold for warnings
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationship
    user = relationship("User", back_populates="notification_preferences")
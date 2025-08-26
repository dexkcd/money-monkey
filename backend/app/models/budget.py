from sqlalchemy import Column, Integer, Numeric, String, Date, DateTime, ForeignKey, func, CheckConstraint
from sqlalchemy.orm import relationship
from ..core.database import Base


class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    period_type = Column(String(10), nullable=False)  # 'WEEKLY' or 'MONTHLY'
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Add constraint to ensure period_type is valid
    __table_args__ = (
        CheckConstraint(
            period_type.in_(['WEEKLY', 'MONTHLY']),
            name='check_period_type'
        ),
    )

    # Relationships
    user = relationship("User", back_populates="budgets")
    category = relationship("Category", back_populates="budgets")
from sqlalchemy import Column, Integer, String, Numeric, Date, DateTime, ForeignKey, func, Text
from sqlalchemy.orm import relationship
from ..core.database import Base


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    description = Column(Text)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    expense_date = Column(Date, nullable=False)
    receipt_url = Column(String(500))
    ai_confidence = Column(Numeric(3, 2))  # 0.00 to 1.00
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="expenses")
    category = relationship("Category", back_populates="expenses")
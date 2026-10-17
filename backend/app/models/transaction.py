from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Index, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Transaction(Base):
    __tablename__ = "transactions"
    # Almost every query filters by user and a date range (lists, summaries).
    __table_args__ = (Index("ix_transactions_user_id_date", "user_id", "date"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(3), default="COP")
    type = Column(String, nullable=False)  # income | expense
    description = Column(String, nullable=True)
    date = Column(Date, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")
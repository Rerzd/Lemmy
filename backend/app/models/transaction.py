from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Transaction(Base):
    __tablename__ = "transactions"

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
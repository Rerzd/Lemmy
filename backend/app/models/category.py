from sqlalchemy import Boolean, Column, Integer, String, ForeignKey, false
from sqlalchemy.orm import relationship
from app.core.categories import DEFAULT_COLOR, DEFAULT_ICON
from app.core.database import Base

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # income | expense
    color = Column(String, default=DEFAULT_COLOR)
    icon = Column(String, default=DEFAULT_ICON)
    # Fixed monthly cost (rent, utilities...). Only meaningful for expense categories.
    is_fixed = Column(Boolean, nullable=False, default=False, server_default=false())

    user = relationship("User", back_populates="categories")
    transactions = relationship("Transaction", back_populates="category")
    budgets = relationship("Budget", back_populates="category")
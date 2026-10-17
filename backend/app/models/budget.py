from sqlalchemy import Column, Integer, String, Float, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base

class Budget(Base):
    __tablename__ = "budgets"
    # One budget per category per month — enforced by the DB, not only the service.
    __table_args__ = (
        UniqueConstraint("user_id", "category_id", "month", "year", name="uq_budgets_user_category_month"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(3), default="COP")
    month = Column(Integer, nullable=False)  # 1-12
    year = Column(Integer, nullable=False)

    user = relationship("User", back_populates="budgets")
    category = relationship("Category", back_populates="budgets")
from sqlalchemy.orm import Session
from app.models.category import Category


def get_all_by_user(db: Session, user_id: int) -> list[Category]:
    return db.query(Category).filter(Category.user_id == user_id).all()


def get_by_id(db: Session, category_id: int, user_id: int) -> Category | None:
    return (
        db.query(Category)
        .filter(Category.id == category_id, Category.user_id == user_id)
        .first()
    )


def create(db: Session, user_id: int, name: str, type: str, color: str, icon: str) -> Category:
    category = Category(user_id=user_id, name=name, type=type, color=color, icon=icon)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def update(db: Session, category: Category, name: str, type: str, color: str, icon: str) -> Category:
    category.name = name
    category.type = type
    category.color = color
    category.icon = icon
    db.commit()
    db.refresh(category)
    return category


def delete(db: Session, category: Category) -> None:
    db.delete(category)
    db.commit()

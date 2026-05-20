from sqlalchemy.orm import Session
from app.models.user import User


def get_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def get_by_id(db: Session, user_id: int) -> User | None:
    return db.query(User).filter(User.id == user_id).first()


def create(db: Session, name: str, email: str, password_hash: str, currency: str) -> User:
    user = User(name=name, email=email, password_hash=password_hash, currency=currency)
    db.add(user)
    db.commit()
    db.refresh(user)  # loads the generated id and created_at from the DB
    return user

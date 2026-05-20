from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password, create_access_token
from app.models.user import User
from app.repositories import user_repository


def register(db: Session, name: str, email: str, password: str, currency: str) -> User:
    # Emails must be unique — two accounts sharing one email would cause
    # login ambiguity and data leaks.
    if user_repository.get_by_email(db, email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists.",
        )

    hashed = hash_password(password)
    return user_repository.create(db, name=name, email=email, password_hash=hashed, currency=currency)


def login(db: Session, email: str, password: str) -> str:
    user = user_repository.get_by_email(db, email)

    # We give the same vague error whether the email doesn't exist or the
    # password is wrong. This prevents user enumeration attacks — an attacker
    # shouldn't be able to tell which emails are registered.
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials.",
        )

    # The JWT payload (called "claims") contains the user id as the subject.
    # The token is signed with SECRET_KEY so the server can verify it wasn't tampered with.
    return create_access_token({"sub": str(user.id)})

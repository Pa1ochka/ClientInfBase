# 6. crud.py
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List
from fastapi import HTTPException, status
from . import models, schemas
from .security import get_password_hash


# Проверка прав администратора
def check_admin_privileges(current_user: models.User) -> None:
    """Проверка, является ли пользователь администратором."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )


def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    """Получить пользователя по email."""
    return db.query(models.User).filter(models.User.email == email).first()


def create_user(db: Session, user: schemas.UserCreate, current_user: models.User) -> models.User:
    """Создать нового пользователя (доступно только администратору)."""
    check_admin_privileges(current_user)
    existing_user = get_user_by_email(db, user.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        username=user.username,
        hashed_password=hashed_password,
        is_admin=False,
        is_active=True
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def create_client(db: Session, client: schemas.ClientCreate, current_user: models.User) -> models.Client:
    """Создать нового клиента (доступно только администратору)."""
    check_admin_privileges(current_user)
    existing_client = get_client_by_account_number(db, client.account_number)
    if existing_client:
        raise HTTPException(status_code=400, detail="Account number already exists")

    db_client = models.Client(**client.dict(), created_by=current_user.id)
    db.add(db_client)
    db.commit()
    db.refresh(db_client)
    return db_client


def get_clients(db: Session, skip: int = 0, limit: int = 100) -> List[models.Client]:
    """Получить список клиентов (доступно всем)."""
    return db.query(models.Client).offset(skip).limit(limit).all()


def get_client_by_account_number(db: Session, account_number: str) -> Optional[models.Client]:
    """Получить клиента по номеру счета (доступно всем)."""
    return db.query(models.Client).filter(models.Client.account_number == account_number).first()


def update_client(db: Session, account_number: str, client: schemas.ClientUpdate, current_user: models.User) -> \
Optional[models.Client]:
    """Обновить клиента (доступно только администратору)."""
    check_admin_privileges(current_user)
    db_client = get_client_by_account_number(db, account_number)
    if not db_client:
        raise HTTPException(status_code=404, detail="Client not found")

    for var, value in client.dict(exclude_unset=True).items():
        setattr(db_client, var, value)
    db.commit()
    db.refresh(db_client)
    return db_client


def search_clients(db: Session, search_term: Optional[str] = None, skip: int = 0, limit: int = 10) -> List[
    models.Client]:
    """Поиск клиентов по заданному термину (доступно всем)."""
    query = db.query(models.Client)

    if search_term:
        try:
            search_term = str(search_term).strip()
            search_pattern = f"%{search_term}%"
            query = query.filter(
                or_(
                    models.Client.account_number.ilike(search_pattern),
                    models.Client.owner_name.ilike(search_pattern),
                    models.Client.email.ilike(search_pattern),
                    models.Client.phone_number.ilike(search_pattern),
                    models.Client.inn.ilike(search_pattern),
                    models.Client.postal_address.ilike(search_pattern),
                    models.Client.passport_data.ilike(search_pattern),
                    models.Client.snils.ilike(search_pattern),
                    models.Client.power_source.ilike(search_pattern),
                    models.Client.additional_info.ilike(search_pattern)
                )
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error processing search term: {str(e)}"
            )

    try:
        return query.offset(skip).limit(limit).all()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database query error: {str(e)}"
        )
# 6. crud.py
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List
from datetime import timedelta
from fastapi import HTTPException
from . import models, schemas
from .security import get_password_hash, create_access_token
from .config import settings


def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()


def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        username=user.username,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def create_client(db: Session, client: schemas.ClientCreate, current_user_id: int):
    db_client = models.Client(**client.dict(), created_by=current_user_id)
    db.add(db_client)
    db.commit()
    db.refresh(db_client)
    return db_client


def get_clients(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Client).offset(skip).limit(limit).all()


def get_client_by_account_number(db: Session, account_number: str):
    return db.query(models.Client).filter(models.Client.account_number == account_number).first()


def update_client(db: Session, account_number: str, client: schemas.ClientUpdate):
    db_client = db.query(models.Client).filter(models.Client.account_number == account_number).first()
    if db_client:
        for var, value in vars(client).items():
            if value is not None:
                setattr(db_client, var, value)
        db.commit()
        db.refresh(db_client)
        return db_client
    return None


def search_clients(
        db: Session,
        search_term: Optional[str] = None,
        skip: int = 0,
        limit: int = 10
):
    query = db.query(models.Client)

    if search_term:
        query = query.filter(
            or_(
                models.Client.account_number.ilike(f"%{search_term}%"),
                models.Client.owner_name.ilike(f"%{search_term}%"),
                models.Client.email.ilike(f"%{search_term}%"),
                models.Client.phone_number.ilike(f"%{search_term}%"),
                models.Client.inn.ilike(f"%{search_term}%"),
                models.Client.postal_address.ilike(f"%{search_term}%")
            )
        )

    return query.offset(skip).limit(limit).all()
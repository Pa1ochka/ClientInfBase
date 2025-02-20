# 5. schemas.py
from pydantic import BaseModel, EmailStr, validator
from typing import Optional
from datetime import date
import re

class UserBase(BaseModel):
    email: EmailStr
    username: str

class UserCreate(UserBase):
    password: str

    @validator('password')
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Пароль должен содержать минимум 8 символов')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Пароль должен содержать хотя бы одну заглавную букву')
        if not re.search(r'[a-z]', v):
            raise ValueError('Пароль должен содержать хотя бы одну строчную букву')
        if not re.search(r'\d', v):
            raise ValueError('Пароль должен содержать хотя бы одну цифру')
        return v

class User(UserBase):
    id: int
    is_admin: bool
    is_active: bool

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class ClientBase(BaseModel):
    account_number: str
    postal_address: str
    owner_name: str
    phone_number: str
    email: Optional[EmailStr] = None
    connected_power: float
    passport_data: Optional[str] = None
    inn: Optional[str] = None
    snils: Optional[str] = None
    connection_date: date
    power_source: Optional[str] = None
    additional_info: Optional[str] = None

    @validator('phone_number')
    def validate_phone(cls, v):
        if not re.match(r'^\+?7\d{10}$', v):
            raise ValueError('Неверный формат номера телефона. Используйте формат +7XXXXXXXXXX')
        return v

    @validator('inn')
    def validate_inn(cls, v):
        if v and not re.match(r'^\d{10}|\d{12}$', v):
            raise ValueError('Неверный формат ИНН')
        return v

class ClientCreate(ClientBase):
    pass

class ClientUpdate(ClientBase):
    account_number: Optional[str] = None
    postal_address: Optional[str] = None
    owner_name: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[EmailStr] = None
    connected_power: Optional[float] = None

class Client(ClientBase):
    id: int
    created_by: int

    class Config:
        from_attributes = True
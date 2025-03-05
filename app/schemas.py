from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import date, datetime

class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserUpdate(UserBase):
    current_password: str = Field(..., min_length=8, description="Текущий пароль для подтверждения изменений")
    password: Optional[str] = Field(None, min_length=8, description="Новый пароль (опционально)")
    is_admin: Optional[bool] = None  # Добавлено для редактирования прав

class User(UserBase):
    id: int
    is_admin: bool
    is_active: bool
    avatar_url: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ClientBase(BaseModel):
    postal_address: str = Field(..., min_length=5, max_length=200, description="Уникальный адрес в формате 'Город, Улица, Дом'")
    account_number: str = Field(..., min_length=1, max_length=50)
    owner_name: str = Field(..., min_length=1, max_length=100)
    phone_number: str = Field(..., min_length=5, max_length=20)
    email: EmailStr
    connected_power: Optional[float] = None
    passport_data: Optional[str] = Field(None, max_length=50)
    inn: str = Field(..., min_length=10, max_length=12)
    snils: Optional[str] = Field(None, max_length=12)
    connection_date: Optional[date] = None
    power_source: Optional[str] = Field(None, max_length=100)
    additional_info: Optional[str] = Field(None, max_length=500)

class ClientCreate(ClientBase):
    pass

class ClientUpdate(BaseModel):
    owner_name: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[EmailStr] = None
    connected_power: Optional[float] = None
    passport_data: Optional[str] = None
    inn: Optional[str] = None
    snils: Optional[str] = None
    connection_date: Optional[date] = None
    power_source: Optional[str] = None
    additional_info: Optional[str] = None
    account_number: Optional[str] = None

class Client(ClientBase):
    id: int
    created_by: int

    class Config:
        from_attributes = True
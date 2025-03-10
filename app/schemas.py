from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import date, datetime
from enum import Enum

class DepartmentEnum(str, Enum):
    YES = "YES"
    CES = "CES"
    SES = "SES"

MANDATORY_CLIENT_FIELDS = ["postal_address", "account_number", "owner_name", "department", "email"]

# Все возможные поля клиента
ALL_CLIENT_FIELDS = [
    "postal_address", "account_number", "owner_name", "phone_number", "email",
    "connected_power", "passport_data", "inn", "snils", "connection_date",
    "power_source", "additional_info", "department"
]

class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    department: DepartmentEnum

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    visible_client_fields: Optional[List[str]] = None  # Список видимых полей клиента

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}

class UserUpdate(UserBase):
    current_password: str = Field(..., min_length=8)
    password: Optional[str] = Field(None, min_length=8)
    is_admin: Optional[bool] = None
    department: Optional[DepartmentEnum] = None
    visible_client_fields: Optional[List[str]] = None  # Список видимых полей клиента

class User(UserBase):
    id: int
    is_admin: bool
    is_active: bool
    avatar_url: Optional[str] = None
    created_at: Optional[datetime] = None
    created_by_admin: Optional[int] = None
    visible_client_fields: Optional[List[str]] = None

    class Config:
        from_attributes = True

class ClientBase(BaseModel):
    postal_address: str = Field(..., min_length=5, max_length=200)
    account_number: str = Field(..., min_length=1, max_length=50)
    owner_name: str = Field(..., min_length=1, max_length=100)
    phone_number: str = Field(..., min_length=5, max_length=100)
    email: EmailStr
    connected_power: Optional[float] = None
    passport_data: Optional[str] = Field(None, max_length=50)
    inn: str = Field(..., min_length=10, max_length=12)
    snils: Optional[str] = Field(None, max_length=12)
    connection_date: Optional[date] = None
    power_source: Optional[str] = Field(None, max_length=100)
    additional_info: Optional[str] = Field(None, max_length=500)
    department: DepartmentEnum  # Добавляем отдел

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
    department: Optional[DepartmentEnum] = None  # Опционально при обновлении
    postal_address: Optional[str] = None

class Client(ClientBase):
    id: int
    created_by: int

    class Config:
        from_attributes = True


class ClientFiltered(BaseModel):
    id: int
    created_by: int
    postal_address: Optional[str] = None
    account_number: Optional[str] = None
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
    department: Optional[DepartmentEnum] = None

    class Config:
        from_attributes = True
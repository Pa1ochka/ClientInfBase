from pydantic import BaseModel
from datetime import date
from typing import Optional

class ClientBase(BaseModel):
    account_number: str
    postal_address: str
    owner_name: str
    phone_number: str
    email: Optional[str] = None
    connected_power: float
    passport_data: Optional[str] = None
    inn: Optional[str] = None
    snils: Optional[str] = None
    connection_date: date
    power_source: Optional[str] = None
    additional_info: Optional[str] = None

class ClientCreate(ClientBase):
    pass

class Client(ClientBase):
    id: int

    class Config:
        orm_mode = True

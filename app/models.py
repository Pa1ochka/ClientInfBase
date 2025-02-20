# 4. models.py
from sqlalchemy import Column, Integer, String, Date, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base
from .security import verify_password, pwd_context


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)

    def verify_password(self, password: str):
        return verify_password(password, self.hashed_password)


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    account_number = Column(String, unique=True, index=True)
    postal_address = Column(String)
    owner_name = Column(String, index=True)
    phone_number = Column(String)
    email = Column(String, index=True)
    connected_power = Column(Float)
    passport_data = Column(String)
    inn = Column(String, index=True)
    snils = Column(String)
    connection_date = Column(Date)
    power_source = Column(String)
    additional_info = Column(String)
    created_by = Column(Integer, ForeignKey("users.id"))

    creator = relationship("User")
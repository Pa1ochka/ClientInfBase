from sqlalchemy import Column, Integer, String, Date, Float, Boolean, ForeignKey, func, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    reset_code = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    created_by_admin = Column(Integer, ForeignKey("users.id"), nullable=True)  # Кто назначил администратором

    clients = relationship("Client", back_populates="creator")
    creator = relationship("User", remote_side=[id])  # Связь с создателем

    def __repr__(self):
        return f"<User(email='{self.email}', username='{self.username}', is_admin={self.is_admin})>"

class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    account_number = Column(String, unique=True, index=True, nullable=False)
    postal_address = Column(String, nullable=False)
    owner_name = Column(String, index=True, nullable=False)
    phone_number = Column(String, nullable=False)
    email = Column(String, index=True, nullable=False)
    connected_power = Column(Float, nullable=True)
    passport_data = Column(String, nullable=True)
    inn = Column(String, index=True, nullable=False)
    snils = Column(String, nullable=True)
    connection_date = Column(Date, nullable=True)
    power_source = Column(String, nullable=True)
    additional_info = Column(String, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    creator = relationship("User", back_populates="clients")

    def __repr__(self):
        return f"<Client(account_number='{self.account_number}', owner_name='{self.owner_name}')>"
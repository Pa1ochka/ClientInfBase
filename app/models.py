from sqlalchemy import Column, Integer, String, Date, Float
from app.database import Base

class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    account_number = Column(String, unique=True, index=True)  # Лицевой счет
    postal_address = Column(String)  # Почтовый адрес
    owner_name = Column(String)  # ФИО собственника
    phone_number = Column(String)  # Номер телефона
    email = Column(String, unique=True, index=True)  # Электронная почта
    connected_power = Column(Float)  # Присоедининная мощность (кВт)
    passport_data = Column(String)  # Паспортные данные
    inn = Column(String)  # ИНН
    snils = Column(String)  # СНИЛС
    connection_date = Column(Date)  # Дата присоединения
    power_source = Column(String)  # Источник питания
    additional_info = Column(String)  # Дополнительная информация

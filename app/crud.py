from sqlalchemy.orm import Session
from app import models, schemas

def create_client(db: Session, client: schemas.ClientCreate):
    db_client = models.Client(
        account_number=client.account_number,
        postal_address=client.postal_address,
        owner_name=client.owner_name,
        phone_number=client.phone_number,
        email=client.email,
        connected_power=client.connected_power,
        passport_data=client.passport_data,
        inn=client.inn,
        snils=client.snils,
        connection_date=client.connection_date,
        power_source=client.power_source,
        additional_info=client.additional_info
    )
    db.add(db_client)
    db.commit()
    db.refresh(db_client)
    return db_client

def get_clients(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Client).offset(skip).limit(limit).all()

# Функция для получения всех клиентов
def get_clients(db: Session):
    return db.query(models.Client).all()


# Функция для получения клиента по account_number
def get_client_by_account_number(db: Session, account_number: str):
    return db.query(models.Client).filter(models.Client.account_number == account_number).first()


# Функция для обновления данных клиента
def update_client(db: Session, account_number: str, client: schemas.Client):
    db_client = db.query(models.Client).filter(models.Client.account_number == account_number).first()
    if db_client:
        db_client.postal_address = client.postal_address
        db_client.owner_name = client.owner_name
        db_client.phone_number = client.phone_number
        db_client.email = client.email
        db_client.connected_power = client.connected_power
        db_client.passport_data = client.passport_data
        db_client.inn = client.inn
        db_client.snils = client.snils
        db_client.connection_date = client.connection_date
        db_client.power_source = client.power_source
        db_client.additional_info = client.additional_info

        db.commit()
        db.refresh(db_client)
    return db_client

def search_clients(db: Session, owner_name: str = None, account_number: str = None):
    query = db.query(models.Client)
    if owner_name:
        query = query.filter(models.Client.owner_name.contains(owner_name))
    if account_number:
        query = query.filter(models.Client.account_number == account_number)
    return query.all()

def get_clients(db: Session, skip: int = 0, limit: int = 10):
    return db.query(models.Client).offset(skip).limit(limit).all()
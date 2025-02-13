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

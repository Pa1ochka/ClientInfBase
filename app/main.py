from typing import List
from app import database
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from . import models, crud, schemas
from .database import SessionLocal, engine
import logging

app = FastAPI()

# Создание таблиц в базе данных
models.Base.metadata.create_all(bind=database.engine)

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Роут для добавления нового клиента
@app.post("/clients/", response_model=schemas.Client)
def create_client(client: schemas.ClientCreate, db: Session = Depends(get_db)):
    return crud.create_client(db=db, client=client)

# Эндпоинт для получения всех клиентов
@app.get("/clients/", response_model=List[schemas.Client])
def read_clients(db: Session = Depends(get_db)):
    clients = crud.get_clients(db)
    return clients


# Эндпоинт для обновления данных клиента
@app.put("/clients/{account_number}", response_model=schemas.Client)
def update_client(account_number: str, client: schemas.Client, db: Session = Depends(get_db)):
    db_client = crud.get_client_by_account_number(db, account_number)
    if db_client is None:
        raise HTTPException(status_code=404, detail="Client not found")

    # Обновляем данные клиента
    return crud.update_client(db, account_number, client)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.get("/clients/{account_number}")
def get_client(account_number: str, db: Session = Depends(get_db)):
    db_client = crud.get_client_by_account_number(db, account_number)
    if db_client is None:
        logger.warning(f"Client with account_number {account_number} not found.")
        raise HTTPException(status_code=404, detail="Client not found")
    return db_client
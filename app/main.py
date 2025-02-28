from fastapi import FastAPI, Depends, HTTPException, status
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from typing import List, Optional
from . import crud, models, schemas
from .database import engine, get_db
from .security import create_access_token, verify_password, get_password_hash
from .config import settings
from datetime import timedelta
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import secrets
import smtplib
from email.mime.text import MIMEText
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

app = FastAPI(title="Система учета клиентов")


# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://clients.aores.ru"],  # Разрешённый источник
    allow_credentials=True,
    allow_methods=["*"],  # Разрешить все методы (GET, POST и т.д.)
    allow_headers=["*"],  # Разрешить все заголовки
)

app.mount("/static", StaticFiles(directory="frontend/templates"), name="static")

models.Base.metadata.create_all(bind=engine)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = crud.get_user_by_email(db, email)
    if user is None or not user.is_active:
        raise credentials_exception
    return user


@app.get("/")
async def read_index():
    return FileResponse("frontend/templates/index.html")



@app.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/forgot-password")
async def forgot_password(request: dict, db: Session = Depends(get_db)):
    email = request.get("email")
    user = crud.get_user_by_email(db, email)
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь с таким email не найден")

    reset_code = secrets.token_hex(8)
    user.reset_code = reset_code
    db.commit()

    msg = MIMEText(f"Ваш код для сброса пароля: {reset_code}")
    msg['Subject'] = 'Сброс пароля'
    msg['From'] = "your-email@gmail.com"
    msg['To'] = email

    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls()
        server.login("your-email@gmail.com", "your-app-password")
        server.send_message(msg)

    return {"message": "Код отправлен на ваш email"}

@app.post("/reset-password")
async def reset_password(request: dict, db: Session = Depends(get_db)):
    email = request.get("email")
    code = request.get("code")
    new_password = request.get("new_password")

    user = crud.get_user_by_email(db, email)
    if not user or user.reset_code != code:
        raise HTTPException(status_code=400, detail="Неверный код или email")

    user.hashed_password = get_password_hash(new_password)
    user.reset_code = None
    db.commit()

    return {"message": "Пароль успешно сброшен"}

@app.get("/users/me", response_model=schemas.User)
def read_current_user(current_user: models.User = Depends(get_current_user)):
    return current_user

@app.put("/users/me", response_model=schemas.User)
def update_current_user(
    user: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.update_user(db, user, current_user)

@app.post("/users/", response_model=schemas.User)
def create_user(
    user: schemas.UserCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.create_user(db, user, current_user)

@app.post("/clients/", response_model=schemas.Client)
def create_client(
    client: schemas.ClientCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.create_client(db, client, current_user)

@app.get("/clients/", response_model=List[schemas.Client])
def read_clients(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    print(f"User {current_user.username} requested client list")
    try:
        clients = crud.get_clients(db, skip, limit)
        return clients
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"detail": f"Ошибка загрузки списка клиентов: {str(e)}"}
        )

@app.get("/clients/{postal_address}", response_model=schemas.Client)
def read_client(
    postal_address: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    print(f"User {current_user.username} requested client {postal_address}")
    client = crud.get_client_by_address(db, postal_address)
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")
    return client

@app.put("/clients/{postal_address}", response_model=schemas.Client)
def update_client(
    postal_address: str,
    client: schemas.ClientUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Только администраторы могут редактировать данные клиентов")
    updated_client = crud.update_client(db, postal_address, client, current_user)
    if updated_client is None:
        raise HTTPException(status_code=404, detail="Client not found")
    return updated_client

@app.get("/clients/search/", response_model=List[schemas.Client])
def search_clients(
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    print(f"User {current_user.username} searched for: {search}")
    return crud.search_clients(db, search, skip, limit)


# from .crud import get_password_hash
# from .database import get_db
# from . import models

def create_first_admin():
    db = next(get_db())
    # Проверяем, есть ли уже пользователи
    if not db.query(models.User).first():
        hashed_password = get_password_hash("armen000")
        admin = models.User(
            email="ab@aores.ru",
            username="Armen",
            hashed_password=hashed_password,
            is_admin=True,
            is_active=True
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        print("Первый администратор создан: admin@example.com / adminpass123")
    db.close()

# Вызываем функцию при запуске
#create_first_admin()
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import secrets
import smtplib
from email.mime.text import MIMEText
import shutil
import os
from datetime import timedelta
from . import crud, models, schemas
from .database import engine, get_db
from .security import create_access_token, verify_password, get_password_hash
from .config import settings

app = FastAPI(title="Система учета клиентов")

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://clients.aores.ru"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключение статических файлов
app.mount("/static", StaticFiles(directory="frontend/templates"), name="static")

# Создание таблиц в базе данных
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

@app.get("/config")
async def get_config():
    return {"api_url": settings.API_URL}

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
    msg['From'] = "your-email@gmail.com"  # Замените на ваш email
    msg['To'] = email

    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls()
        server.login("your-email@gmail.com", "your-app-password")  # Замените на ваш email и пароль приложения
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


@app.post("/users/me/avatar", response_model=schemas.User)
async def upload_avatar(
        avatar: UploadFile = File(...),
        db: Session = Depends(get_db),
        current_user: models.User = Depends(get_current_user)
):
    print(f"Received file: {avatar.filename}, size: {avatar.size}, content_type: {avatar.content_type}")

    # Проверка размера файла (макс. 20MB)
    if avatar.size > 20 * 1024 * 1024:
        print(f"File size {avatar.size} exceeds 20MB limit")
        raise HTTPException(status_code=400, detail="File size exceeds 20MB")

    # Проверка типа файла
    allowed_types = ["image/jpeg", "image/png", "image/gif"]
    if avatar.content_type not in allowed_types:
        print(f"Invalid content type: {avatar.content_type}. Allowed: {allowed_types}")
        raise HTTPException(status_code=400,
                            detail=f"Only JPEG, PNG, or GIF files are allowed. Got: {avatar.content_type}")

    # Путь для сохранения аватаров (исправлен на frontend/templates/img/avatars)
    upload_dir = "frontend/templates/img/avatars"  # Изменено с static/img/avatars
    os.makedirs(upload_dir, exist_ok=True)

    # Генерируем уникальное имя файла
    file_extension = avatar.filename.split('.')[-1]
    file_name = f"{current_user.id}_{secrets.token_hex(8)}.{file_extension}"
    file_path = os.path.join(upload_dir, file_name)

    # Удаляем старый аватар, если он существует
    if current_user.avatar_url and os.path.exists(f"frontend/templates{current_user.avatar_url}"):
        os.remove(f"frontend/templates{current_user.avatar_url}")

    # Сохраняем новый файл
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(avatar.file, buffer)

    # Обновляем путь к аватару в базе данных
    avatar_url = f"/static/img/avatars/{file_name}"  # Оставляем путь для фронтенда
    current_user.avatar_url = avatar_url
    db.commit()
    db.refresh(current_user)

    print(f"Avatar uploaded successfully: {avatar_url}")
    return current_user


@app.delete("/users/me/avatar", response_model=schemas.User)
async def delete_avatar(
        db: Session = Depends(get_db),
        current_user: models.User = Depends(get_current_user)
):
    # Удаляем файл аватара, если он существует
    if current_user.avatar_url and os.path.exists(f"frontend/templates{current_user.avatar_url}"):
        os.remove(f"frontend/templates{current_user.avatar_url}")

    # Сбрасываем avatar_url в базе данных
    current_user.avatar_url = None
    db.commit()
    db.refresh(current_user)

    print(f"Avatar deleted for user {current_user.username}")
    return current_user

@app.put("/users/me/password", response_model=schemas.User)
def update_password(
    password_data: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    old_password = password_data.get("old_password")
    new_password = password_data.get("new_password")

    if not verify_password(old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect old password")

    current_user.hashed_password = get_password_hash(new_password)
    db.commit()
    db.refresh(current_user)
    return current_user

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

def create_first_admin():
    db = next(get_db())
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
        print("Первый администратор создан: ab@aores.ru / armen000")
    db.close()

# Вызов при запуске (раскомментируйте, если нужно)
# create_first_admin()
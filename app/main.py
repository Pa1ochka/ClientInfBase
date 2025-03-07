from jose import jwt, JWTError
from sqlalchemy.orm import Session
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Query
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import secrets
import smtplib
from email.mime.text import MIMEText
import shutil
import os
from datetime import timedelta, date
from . import crud, models, schemas
from .database import engine, get_db
from .security import create_access_token, verify_password, get_password_hash
from .config import settings

app = FastAPI(title="Система учета клиентов")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://clients.aores.ru"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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

@app.post("/users/me/avatar", response_model=schemas.User)
async def upload_avatar(
    avatar: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if avatar.size > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 20MB")

    allowed_types = ["image/jpeg", "image/png", "image/gif"]
    if avatar.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Only JPEG, PNG, or GIF files are allowed. Got: {avatar.content_type}")

    upload_dir = "frontend/templates/img/avatars"
    os.makedirs(upload_dir, exist_ok=True)

    file_extension = avatar.filename.split('.')[-1]
    file_name = f"{current_user.id}_{secrets.token_hex(8)}.{file_extension}"
    file_path = os.path.join(upload_dir, file_name)

    if current_user.avatar_url:
        old_file_path = os.path.join(upload_dir, os.path.basename(current_user.avatar_url))
        if os.path.exists(old_file_path):
            os.remove(old_file_path)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(avatar.file, buffer)

    avatar_url = f"/static/img/avatars/{file_name}"
    current_user.avatar_url = avatar_url
    db.commit()
    db.refresh(current_user)
    return current_user

@app.delete("/users/me/avatar", response_model=schemas.User)
async def delete_avatar(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.avatar_url:
        file_path = os.path.join("frontend/templates/img/avatars", os.path.basename(current_user.avatar_url))
        if os.path.exists(file_path):
            os.remove(file_path)
    current_user.avatar_url = None
    db.commit()
    db.refresh(current_user)
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

@app.get("/clients/", response_model=None)
def read_clients(
    skip: int = Query(0, ge=0, description="Сколько записей пропустить"),
    limit: int = Query(10, ge=1, le=100, description="Максимальное количество записей"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    result = crud.get_clients(db, current_user, skip=skip, limit=limit)
    return JSONResponse(status_code=200, content=result)

@app.get("/clients/{postal_address}", response_model=schemas.Client)
def read_client(
    postal_address: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    client = crud.get_client_by_address(db, postal_address)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    if not current_user.is_admin and client.department != current_user.department:
        raise HTTPException(status_code=403, detail="Вы не можете просматривать клиентов из других отделов")

    # Фильтруем поля
    visible_fields = current_user.visible_client_fields or schemas.MANDATORY_CLIENT_FIELDS if not current_user.is_admin else schemas.ALL_CLIENT_FIELDS
    client_dict = schemas.Client.from_orm(client).dict()
    filtered_client = {k: v for k, v in client_dict.items() if k in visible_fields or k in ["id", "created_by"]}
    return filtered_client

@app.put("/clients/{postal_address}", response_model=schemas.Client)
def update_client(
    postal_address: str,
    client: schemas.ClientUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    print(f"Received postal_address: {postal_address}")  # Логирование
    return crud.update_client(db, postal_address, client, current_user)

@app.get("/clients/search/", response_model=None)
def search_clients(
    search: Optional[str] = Query(None, description="Поиск по любому полю"),
    connection_date: Optional[date] = Query(None, description="Фильтр по дате подключения"),
    connected_power_min: Optional[float] = Query(None, ge=0, description="Минимальная мощность"),
    connected_power_max: Optional[float] = Query(None, ge=0, description="Максимальная мощность"),
    skip: int = Query(0, ge=0, description="Сколько записей пропустить"),
    limit: int = Query(10, ge=1, le=100, description="Максимальное количество записей"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    clients = crud.search_clients(
        db,
        current_user,
        search_term=search,
        connection_date=connection_date,
        connected_power_min=connected_power_min,
        connected_power_max=connected_power_max,
        skip=skip,
        limit=limit
    )
    total_clients = db.query(models.Client).count() if current_user.is_admin else \
        db.query(models.Client).filter(models.Client.department == current_user.department).count()

    clients_data = [schemas.Client.from_orm(client).dict() for client in clients]
    for client_dict in clients_data:
        if client_dict["connection_date"]:
            client_dict["connection_date"] = client_dict["connection_date"].isoformat()

    return JSONResponse(
        status_code=200,
        content={
            "clients": clients_data,
            "total": total_clients,
            "skip": skip,
            "limit": limit
        }
    )

@app.delete("/clients/{postal_address}", status_code=204)
def delete_client(
    postal_address: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Только администраторы могут удалять клиентов")
    db_client = crud.get_client_by_address(db, postal_address)
    if not db_client:
        raise HTTPException(status_code=404, detail="Client not found")
    db.delete(db_client)
    db.commit()
    return None

@app.get("/users/", response_model=List[schemas.User])
def read_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Только администраторы могут просматривать список пользователей")
    return db.query(models.User).all()

@app.get("/users/{user_id}", response_model=schemas.User)
def read_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Только администраторы могут просматривать данные пользователей")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.put("/users/{user_id}", response_model=schemas.User)
def update_user(
    user_id: int,
    user: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Только администраторы могут редактировать пользователей")

    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    if not verify_password(user.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")

    if 'is_admin' in user.dict(exclude_unset=True):
        if db_user.is_admin and db_user.created_by_admin != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="Вы не можете изменить статус администратора, которого не назначали"
            )
        if user.is_admin and not db_user.is_admin:
            db_user.created_by_admin = current_user.id
        elif not user.is_admin and db_user.is_admin and db_user.created_by_admin == current_user.id:
            db_user.created_by_admin = None

    if db_user.email != user.email and crud.get_user_by_email(db, user.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    if db_user.username != user.username and db.query(models.User).filter(
        models.User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    db_user.email = user.email
    db_user.username = user.username
    if user.password:
        db_user.hashed_password = get_password_hash(user.password)
    if 'is_admin' in user.dict(exclude_unset=True):
        db_user.is_admin = user.is_admin
    if user.department:
        db_user.department = user.department

    db.commit()
    db.refresh(db_user)
    return db_user

@app.delete("/users/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Только администраторы могут удалять пользователей")

    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    if db_user.is_admin and db_user.created_by_admin != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Вы не можете удалить этого администратора, так как не являетесь его создателем"
        )

    db.delete(db_user)
    db.commit()
    return None

def create_first_admin():
    db = next(get_db())
    if not db.query(models.User).first():
        hashed_password = get_password_hash("armen000")
        admin = models.User(
            email="ab@aores.ru",
            username="Armen",
            hashed_password=hashed_password,
            is_admin=True,
            is_active=True,
            department=models.DepartmentEnum.YES  # Указываем отдел для первого админа
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        print("Первый администратор создан: ab@aores.ru / armen000")
    db.close()

create_first_admin()
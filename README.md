# ClientInfBase

ClientInfBase — это веб-приложение для управления данными клиентов, построенное на FastAPI (бэкенд) и HTML/CSS/JavaScript (фронтенд). Приложение поддерживает авторизацию, разграничение прав доступа и управление клиентами.

## Структура проекта
```
project/
├── app/                # Бэкенд (FastAPI)
│   ├── __init__.py
│   ├── main.py        # Главный файл FastAPI
│   ├── models.py      # Модели SQLAlchemy
│   ├── schemas.py     # Схемы Pydantic
│   ├── crud.py        # Логика CRUD
│   ├── database.py    # Настройка базы данных
│   ├── security.py    # Функции безопасности (хеширование, JWT)
│   └── config.py      # Конфигурация (настройки)
├── frontend/           # Фронтенд
│   ├── assets/        # Статические ресурсы
│   └── templates/     # HTML шаблоны
│       ├── index.html
│       ├── auth.html
│       ├── clients.html
│       ├── profile.html
│       ├── css/
│       └── js/
├── requirements.txt   # Зависимости Python
└── README.md          # Документация проекта
```

## Функциональность
- **Авторизация**: JWT-токены
- **Восстановление пароля**: Код через email
- **Профиль**: Просмотр и редактирование
- **Клиенты**:
  - **Администратор**: создание, редактирование, просмотр
  - **Пользователь**: только просмотр
- **Поиск клиентов** по параметрам

## Установка
```bash
git clone <repository-url>
cd ClientInfBase
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
pip install -r requirements.txt
```

### Настройка
Отредактируйте `app/config.py`:
```python
class Settings:
    SECRET_KEY = "your-secret-key"
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 30
settings = Settings()
```

### Инициализация базы данных
База создается автоматически при первом запуске.

### Запуск
```bash
uvicorn app.main:app --reload
```
Перейдите в браузере: [http://127.0.0.1:8000/static/index.html](http://127.0.0.1:8000/static/index.html).

## Использование
### Создание администратора
```bash
curl -X POST "http://127.0.0.1:8000/users/" \
     -H "Authorization: Bearer <admin-token>" \
     -H "Content-Type: application/json" \
     -d '{"email": "admin@example.com", "password": "password", "is_admin": true}'
```

### Вход
Введите email и пароль на главной странице.

### Управление клиентами
- **Администраторы** могут создавать и редактировать клиентов.
- **Пользователи** могут только просматривать список клиентов.

## Разграничение прав
- **Администраторы**: Полный доступ
- **Пользователи**: Только просмотр

## Зависимости
- **FastAPI** — веб-фреймворк
- **PostgreSQL** — база данных
- **PyJWT** — аутентификация
- **Passlib** — хеширование паролей
- **Axios** — HTTP-запросы

## Настройка SMTP
```python
with smtplib.SMTP("smtp.gmail.com", 587) as server:
    server.starttls()
    server.login("your-email@gmail.com", "your-app-password")
    server.send_message(msg)
```

## Лицензия
MIT License

## Контакты
- Автор: [Ваше имя]
- Email: [Ваш email]
- GitHub: [Ваш профиль]

from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int

    # Указываем путь к файлу .env и настройки загрузки
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",  # Кодировка файла
        extra="ignore",  # Игнорировать лишние переменные в .env
    )

# Создаем экземпляр настроек
settings = Settings()
# 1. config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:admin12345@localhost/Client_Inf_Base"
    SECRET_KEY: str = "dsfhsdjkfhsdghfuysdgfgs7dtfsdfgsdfg9s8fg9sfg"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    class Config:
        env_file = ".env"

settings = Settings()
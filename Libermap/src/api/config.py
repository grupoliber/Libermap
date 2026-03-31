"""Configurações da aplicação via variáveis de ambiente."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Servidor
    server_host: str = "0.0.0.0"
    server_port: int = 8000
    debug: bool = True

    # Banco de Dados
    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str = "libermap"
    db_user: str = "libermap"
    db_password: str = "libermap"

    # Mapa
    map_default_lat: float = -14.79
    map_default_lng: float = -39.27
    map_default_zoom: int = 14
    map_tile_provider: str = "openstreetmap"

    # Segurança
    secret_key: str = "dev-secret-key"
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:8000"]

    # Licença
    license_server_url: str = "https://license.libernet.com.br"
    license_key: str = ""

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()

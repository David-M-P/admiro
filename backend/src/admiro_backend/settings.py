from functools import lru_cache
from typing import List, Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Load .env locally if present; in Azure it will just use real env vars
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    admiro_env: str = Field(default="dev", alias="ADMIRO_ENV")
    cors_origins_raw: str = Field(default="*", alias="ADMIRO_CORS_ORIGINS")

    # Data sources
    local_v1_root: Optional[str] = Field(default=None, alias="ADMIRO_LOCAL_V1_ROOT")

    parquet_storage_account: Optional[str] = Field(
        default=None, alias="ADMIRO_PARQUET_STORAGE_ACCOUNT"
    )
    parquet_container: str = Field(
        default="admiro-data", alias="ADMIRO_PARQUET_CONTAINER"
    )
    parquet_prefix: str = Field(default="v1", alias="ADMIRO_PARQUET_PREFIX")

    @property
    def cors_origins(self) -> List[str]:
        raw = (self.cors_origins_raw or "").strip()
        if raw == "*" or raw == "":
            return ["*"]
        return [x.strip() for x in raw.split(",") if x.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()

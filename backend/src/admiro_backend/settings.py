# admiro_backend/settings.py
from functools import lru_cache
from typing import List, Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    admiro_env: str = Field(default="dev", alias="ADMIRO_ENV")
    cors_origins_raw: str = Field(default="*", alias="ADMIRO_CORS_ORIGINS")

    # Local mirror of blob (mount this in local dev)
    local_data_root: Optional[str] = Field(default=None, alias="ADMIRO_LOCAL_DATA_ROOT")

    # Blob config (used when local_data_root is not set)
    parquet_storage_account: Optional[str] = Field(
        default=None, alias="ADMIRO_PARQUET_STORAGE_ACCOUNT"
    )
    parquet_container: str = Field(
        default="admiro-data", alias="ADMIRO_PARQUET_CONTAINER"
    )
    parquet_prefix: str = Field(default="v1", alias="ADMIRO_PARQUET_PREFIX")
    parquet_anon: bool = Field(default=True, alias="ADMIRO_PARQUET_ANON")
    fragvisreg_max_concurrency: int = Field(
        default=2, ge=1, alias="ADMIRO_FRAGVISREG_MAX_CONCURRENCY"
    )
    response_cache_enabled: bool = Field(
        default=True, alias="ADMIRO_RESPONSE_CACHE_ENABLED"
    )
    response_cache_ttl_seconds: int = Field(
        default=600, ge=1, alias="ADMIRO_RESPONSE_CACHE_TTL_SECONDS"
    )
    response_cache_max_entries_summ_stats: int = Field(
        default=16, ge=1, alias="ADMIRO_RESPONSE_CACHE_MAX_ENTRIES_SUMM_STATS"
    )
    response_cache_max_entries_fragvisreg: int = Field(
        default=8, ge=1, alias="ADMIRO_RESPONSE_CACHE_MAX_ENTRIES_FRAG_VIS_REG"
    )
    server_timing_enabled: bool = Field(
        default=True, alias="ADMIRO_SERVER_TIMING_ENABLED"
    )
    gzip_minimum_size: int = Field(default=1000, ge=0, alias="ADMIRO_GZIP_MINIMUM_SIZE")
    gzip_compresslevel: int = Field(default=5, ge=1, le=9, alias="ADMIRO_GZIP_COMPRESSLEVEL")

    @property
    def cors_origins(self) -> List[str]:
        raw = (self.cors_origins_raw or "").strip()
        if raw in ("*", ""):
            return ["*"]
        return [x.strip() for x in raw.split(",") if x.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()

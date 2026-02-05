from io import BytesIO
from pathlib import Path
from functools import lru_cache

import polars as pl
from azure.identity import DefaultAzureCredential
from azure.storage.blob import BlobServiceClient

from admiro_backend.settings import get_settings
import os
from functools import lru_cache
from azure.storage.blob import BlobServiceClient

PARQ_LOCAL_V1_ROOT = os.getenv("ADMIRO_LOCAL_V1_ROOT")
PARQ_ACCOUNT = os.getenv("ADMIRO_PARQUET_STORAGE_ACCOUNT")
PARQ_CONTAINER = os.getenv("ADMIRO_PARQUET_CONTAINER", "admiro-data")
PARQ_PREFIX = os.getenv("ADMIRO_PARQUET_PREFIX", "v1")
PARQ_ANON = os.getenv("ADMIRO_PARQUET_ANON", "1") == "1"
BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
METADATA_PATH = STATIC_DIR / "metadata.parquet"


@lru_cache(maxsize=1)
def _parq_container_client():
    if PARQ_LOCAL_V1_ROOT:
        return None
    if not PARQ_ACCOUNT:
        raise RuntimeError(
            "Set ADMIRO_PARQUET_STORAGE_ACCOUNT (or ADMIRO_LOCAL_V1_ROOT)."
        )

    account_url = f"https://{PARQ_ACCOUNT}.blob.core.windows.net"

    if PARQ_ANON:
        # Anonymous client (public container)
        bsc = BlobServiceClient(account_url=account_url)
    else:
        # Private container path (keep for later)
        from azure.identity import DefaultAzureCredential

        bsc = BlobServiceClient(
            account_url=account_url, credential=DefaultAzureCredential()
        )

    return bsc.get_container_client(PARQ_CONTAINER)


def _parq_blob_path(rel_path: str) -> str:
    s = get_settings()
    rel_path = rel_path.lstrip("/")
    return f"{s.parquet_prefix}/{rel_path}" if s.parquet_prefix else rel_path


def _parq_read_parquet(rel_path: str) -> pl.DataFrame:
    s = get_settings()

    # Local fragments
    if s.local_v1_root:
        p = Path(s.local_v1_root) / rel_path
        return pl.read_parquet(p)

    # Blob fragments
    cc = _parq_container_client()
    blob_client = cc.get_blob_client(_parq_blob_path(rel_path))
    data = blob_client.download_blob().readall()
    return pl.read_parquet(BytesIO(data))


@lru_cache(maxsize=1)
def _parq_metadata() -> pl.DataFrame:
    # baked into the image
    if not METADATA_PATH.exists():
        raise RuntimeError(f"Missing metadata parquet at {METADATA_PATH}")
    return pl.read_parquet(METADATA_PATH)

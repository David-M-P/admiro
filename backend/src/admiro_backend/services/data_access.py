from __future__ import annotations

from io import BytesIO
from pathlib import Path
from functools import lru_cache

import polars as pl
from azure.storage.blob import BlobServiceClient

from admiro_backend.settings import get_settings

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
METADATA_PATH = STATIC_DIR / "metadata.parquet"


def _parq_blob_path(prefix: str, rel_path: str) -> str:
    rel_path = rel_path.lstrip("/")
    return f"{prefix}/{rel_path}" if prefix else rel_path


@lru_cache(maxsize=1)
def _parq_container_client():
    """
    Cached because in cloud settings won't change while the app is running.
    Safe because it reads Settings only once per process.
    """
    s = get_settings()

    if s.local_data_root:
        # local mode: no container client
        return None

    if not s.parquet_storage_account:
        raise RuntimeError(
            "Set ADMIRO_PARQUET_STORAGE_ACCOUNT (or ADMIRO_LOCAL_DATA_ROOT)."
        )

    account_url = f"https://{s.parquet_storage_account}.blob.core.windows.net"

    if s.parquet_anon:
        bsc = BlobServiceClient(account_url=account_url)
    else:
        # keep for later; requires RBAC/identity to work in ACA
        from azure.identity import DefaultAzureCredential

        bsc = BlobServiceClient(
            account_url=account_url, credential=DefaultAzureCredential()
        )

    return bsc.get_container_client(s.parquet_container)


def _parq_read_parquet(rel_path: str) -> pl.DataFrame:
    s = get_settings()

    # Local mode
    if s.local_data_root:
        p = Path(s.local_data_root) / rel_path
        return pl.read_parquet(p)

    # Blob mode
    cc = _parq_container_client()
    assert cc is not None
    blob_path = _parq_blob_path(s.parquet_prefix, rel_path)
    blob_client = cc.get_blob_client(blob_path)
    data = blob_client.download_blob().readall()
    return pl.read_parquet(BytesIO(data))


@lru_cache(maxsize=1)
def _parq_metadata() -> pl.DataFrame:
    # baked into the image
    if not METADATA_PATH.exists():
        raise RuntimeError(f"Missing metadata parquet at {METADATA_PATH}")
    return pl.read_parquet(METADATA_PATH)

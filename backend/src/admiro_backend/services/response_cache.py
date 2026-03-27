from __future__ import annotations

import json
import threading
import time
from collections import OrderedDict
from dataclasses import dataclass
from typing import Any, Mapping


def build_cache_key(endpoint: str, payload: Mapping[str, Any]) -> str:
    canonical_payload = json.dumps(
        payload,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    )
    return f"{endpoint}:{canonical_payload}"


@dataclass
class CacheResult:
    value: Any | None
    hit: bool


class ResponseTtlCache:
    def __init__(self, enabled: bool, ttl_seconds: int, max_entries: int) -> None:
        self._enabled = enabled
        self._ttl_seconds = max(1, int(ttl_seconds))
        self._max_entries = max(1, int(max_entries))
        self._lock = threading.Lock()
        self._entries: OrderedDict[str, tuple[float, Any]] = OrderedDict()

    def get(self, key: str) -> CacheResult:
        if not self._enabled:
            return CacheResult(value=None, hit=False)

        now = time.monotonic()
        with self._lock:
            self._purge_expired_locked(now)
            stored = self._entries.get(key)
            if stored is None:
                return CacheResult(value=None, hit=False)

            expires_at, value = stored
            if expires_at <= now:
                self._entries.pop(key, None)
                return CacheResult(value=None, hit=False)

            # LRU touch
            self._entries.move_to_end(key)
            return CacheResult(value=value, hit=True)

    def set(self, key: str, value: Any) -> None:
        if not self._enabled:
            return

        expires_at = time.monotonic() + self._ttl_seconds
        with self._lock:
            self._entries[key] = (expires_at, value)
            self._entries.move_to_end(key)
            self._purge_expired_locked(time.monotonic())
            while len(self._entries) > self._max_entries:
                self._entries.popitem(last=False)

    def clear(self) -> None:
        with self._lock:
            self._entries.clear()

    def _purge_expired_locked(self, now: float) -> None:
        expired = [key for key, (expires_at, _) in self._entries.items() if expires_at <= now]
        for key in expired:
            self._entries.pop(key, None)

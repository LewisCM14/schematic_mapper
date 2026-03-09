"""Lightweight in-memory TTL cache for read-through caching of external data."""

import threading
import time
from typing import Generic, TypeVar

T = TypeVar("T")


class TTLCache(Generic[T]):
    """A thread-safe in-memory cache with per-entry TTL expiry.

    Storage maps ``str`` keys to ``(expiry_timestamp, value)`` tuples.
    Expired entries are lazily evicted on the next ``get`` call.
    """

    def __init__(self) -> None:
        self._store: dict[str, tuple[float, T]] = {}
        self._lock = threading.Lock()

    def get(self, key: str) -> T | None:
        """Return the cached value for *key*, or ``None`` if missing/expired."""
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            expiry, value = entry
            if time.monotonic() > expiry:
                del self._store[key]
                return None
            return value

    def set(self, key: str, value: T, ttl_seconds: float) -> None:
        """Store *value* under *key* with a TTL of *ttl_seconds*."""
        with self._lock:
            self._store[key] = (time.monotonic() + ttl_seconds, value)

    def clear(self) -> None:
        """Remove all entries."""
        with self._lock:
            self._store.clear()

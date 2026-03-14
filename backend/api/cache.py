"""Lightweight in-memory TTL cache for read-through caching of external data."""

import threading
import time
from typing import Generic, TypeVar

T = TypeVar("T")


class TTLCache(Generic[T]):
    """
    A thread-safe in-memory cache with per-entry TTL expiry.

    - Storage maps ``str`` keys to ``(expiry_timestamp, value)`` tuples.
    - Expired entries are lazily evicted on the next ``get`` call.
    - Thread safety is ensured via a lock for all operations.
    - Suitable for lightweight, short-lived caching of external API or DB lookups.
    """

    def __init__(self) -> None:
        # Internal store: key -> (expiry_timestamp, value)
        self._store: dict[str, tuple[float, T]] = {}
        # Lock to ensure thread safety for all cache operations
        self._lock = threading.Lock()

    def get(self, key: str) -> T | None:
        """
        Return the cached value for *key*, or ``None`` if missing/expired.
        Expired entries are removed on access (lazy eviction).
        Thread-safe.
        """
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None  # Key not found
            expiry, value = entry
            if time.monotonic() > expiry:
                # Entry expired: evict and return None
                del self._store[key]
                return None
            return value  # Entry valid

    def set(self, key: str, value: T, ttl_seconds: float) -> None:
        """
        Store *value* under *key* with a TTL of *ttl_seconds* (seconds).
        Overwrites any existing entry for the key.
        Thread-safe.
        """
        with self._lock:
            self._store[key] = (time.monotonic() + ttl_seconds, value)

    def clear(self) -> None:
        """
        Remove all entries from the cache.
        Thread-safe.
        """
        with self._lock:
            self._store.clear()

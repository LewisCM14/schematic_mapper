"""Asset adapter: queries the mock asset database for fitting position details."""

import threading
import time
from dataclasses import dataclass, field
from typing import Any, Literal

from django.db import OperationalError, ProgrammingError, connections

from api.cache import TTLCache


@dataclass
class AssetRecord:
    asset_record_id: str
    fitting_position: str
    high_level_component: str
    sub_system_name: str
    sub_component_name: str


@dataclass
class AssetResult:
    source_status: Literal["ok", "degraded"]
    record: AssetRecord | None


@dataclass
class AssetSearchRow:
    fitting_position: str
    high_level_component: str
    sub_system_name: str
    sub_component_name: str


@dataclass
class AssetSearchResult:
    source_status: Literal["ok", "degraded"]
    rows: list[AssetSearchRow] = field(default_factory=list)


# Columns searched by search_assets(); changing this list is the only thing
# required to add or remove searchable asset fields.
_SEARCHABLE_COLUMNS: list[str] = [
    "high_level_component",
    "sub_system_name",
    "sub_component_name",
]

# ── Query timeout (seconds) ──────────────────────────────────────────────────
QUERY_TIMEOUT_SECONDS = 5

# ── Read-through cache ───────────────────────────────────────────────────────
CACHE_TTL_SECONDS = 300  # 5 minutes
_asset_cache: TTLCache[AssetResult | AssetSearchResult] = TTLCache()


def clear_asset_cache() -> None:
    """Clear the asset adapter cache — intended for tests."""
    _asset_cache.clear()


# ── Circuit breaker settings ─────────────────────────────────────────────────
FAILURE_THRESHOLD = 3
COOLDOWN_SECONDS = 30

_cb_lock = threading.Lock()
_cb_consecutive_failures = 0
_cb_open_until: float = 0.0


def _circuit_is_open() -> bool:
    """Return True if the circuit breaker is currently open (tripped)."""
    with _cb_lock:
        if _cb_consecutive_failures >= FAILURE_THRESHOLD:
            return time.monotonic() < _cb_open_until
    return False


def _record_success() -> None:
    global _cb_consecutive_failures  # noqa: PLW0603
    with _cb_lock:
        _cb_consecutive_failures = 0


def _record_failure() -> None:
    global _cb_consecutive_failures, _cb_open_until  # noqa: PLW0603
    with _cb_lock:
        _cb_consecutive_failures += 1
        if _cb_consecutive_failures >= FAILURE_THRESHOLD:
            _cb_open_until = time.monotonic() + COOLDOWN_SECONDS


def reset_circuit_breaker() -> None:
    """Reset the circuit breaker — intended for tests."""
    global _cb_consecutive_failures, _cb_open_until  # noqa: PLW0603
    with _cb_lock:
        _cb_consecutive_failures = 0
        _cb_open_until = 0.0


def search_assets(
    labels: list[str], query: str, *, table_name: str = "asset_information"
) -> AssetSearchResult:
    """Search asset rows whose fitting_position is in *labels*
    and whose searchable columns contain *query* (case-insensitive LIKE).

    *table_name* is read from ``SourceSearchConfig.table_name``.

    Returns ``source_status="degraded"`` with an empty row list if the asset
    database is unreachable or the query fails.
    """
    if _circuit_is_open():
        return AssetSearchResult(source_status="degraded")

    cache_key = f"search:{','.join(sorted(labels))}:{query.lower()}:{table_name}"
    cached = _asset_cache.get(cache_key)
    if cached is not None:
        return cached  # type: ignore[return-value]

    like_query = f"%{query.lower()}%"
    col_list = ", ".join(_SEARCHABLE_COLUMNS)
    like_clauses = " OR ".join(f"LOWER({col}) LIKE %s" for col in _SEARCHABLE_COLUMNS)
    sql = f"""
        SELECT fitting_position, {col_list}
        FROM {table_name}
        WHERE fitting_position = ANY(%s)
          AND ({like_clauses})
    """  # noqa: S608  — col/table names are from internal config, not user input
    params: list[Any] = [labels] + [like_query] * len(_SEARCHABLE_COLUMNS)
    try:
        with connections["asset"].cursor() as cursor:
            cursor.execute(
                f"SET LOCAL statement_timeout = '{QUERY_TIMEOUT_SECONDS * 1000}'"  # noqa: S608
            )
            cursor.execute(sql, params)
            raw_rows = cursor.fetchall()
    except (OperationalError, ProgrammingError):
        _record_failure()
        return AssetSearchResult(source_status="degraded")

    _record_success()
    result = AssetSearchResult(
        source_status="ok",
        rows=[
            AssetSearchRow(
                fitting_position=row[0],
                high_level_component=row[1],
                sub_system_name=row[2],
                sub_component_name=row[3],
            )
            for row in raw_rows
        ],
    )
    _asset_cache.set(cache_key, result, CACHE_TTL_SECONDS)
    return result


def fetch_asset_details(fitting_position_id: str) -> AssetResult:
    """Return asset information for the given fitting position label.

    Returns ``source_status="degraded"`` with ``record=None`` if the asset
    database is unreachable or the query fails.
    """
    if _circuit_is_open():
        return AssetResult(source_status="degraded", record=None)

    cache_key = f"details:{fitting_position_id}"
    cached = _asset_cache.get(cache_key)
    if cached is not None:
        return cached  # type: ignore[return-value]

    try:
        with connections["asset"].cursor() as cursor:
            cursor.execute(
                f"SET LOCAL statement_timeout = '{QUERY_TIMEOUT_SECONDS * 1000}'"  # noqa: S608
            )
            cursor.execute(
                """
                SELECT
                    asset_record_id,
                    fitting_position,
                    high_level_component,
                    sub_system_name,
                    sub_component_name
                FROM asset_information
                WHERE fitting_position = %s
                LIMIT 1
                """,
                [fitting_position_id],
            )
            row = cursor.fetchone()
    except (OperationalError, ProgrammingError):
        _record_failure()
        return AssetResult(source_status="degraded", record=None)

    _record_success()

    if row is None:
        return AssetResult(source_status="ok", record=None)

    result = AssetResult(
        source_status="ok",
        record=AssetRecord(
            asset_record_id=row[0],
            fitting_position=row[1],
            high_level_component=row[2],
            sub_system_name=row[3],
            sub_component_name=row[4],
        ),
    )
    _asset_cache.set(cache_key, result, CACHE_TTL_SECONDS)
    return result

"""Asset adapter: queries the mock asset database for fitting position details."""

from dataclasses import dataclass, field
from typing import Any, Literal

from django.db import OperationalError, ProgrammingError, connections


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


def search_assets(labels: list[str], query: str) -> AssetSearchResult:
    """Search asset_information rows whose fitting_position is in *labels*
    and whose searchable columns contain *query* (case-insensitive LIKE).

    Returns ``source_status="degraded"`` with an empty row list if the asset
    database is unreachable or the query fails.
    """
    like_query = f"%{query.lower()}%"
    col_list = ", ".join(_SEARCHABLE_COLUMNS)
    like_clauses = " OR ".join(f"LOWER({col}) LIKE %s" for col in _SEARCHABLE_COLUMNS)
    sql = f"""
        SELECT fitting_position, {col_list}
        FROM asset_information
        WHERE fitting_position = ANY(%s)
          AND ({like_clauses})
    """  # noqa: S608  — col names are from internal config, not user input
    params: list[Any] = [labels] + [like_query] * len(_SEARCHABLE_COLUMNS)
    try:
        with connections["asset"].cursor() as cursor:
            cursor.execute(sql, params)
            raw_rows = cursor.fetchall()
    except (OperationalError, ProgrammingError):
        return AssetSearchResult(source_status="degraded")

    return AssetSearchResult(
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


def fetch_asset_details(fitting_position_id: str) -> AssetResult:
    """Return asset information for the given fitting position label.

    Returns ``source_status="degraded"`` with ``record=None`` if the asset
    database is unreachable or the query fails.
    """
    try:
        with connections["asset"].cursor() as cursor:
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
        return AssetResult(source_status="degraded", record=None)

    if row is None:
        return AssetResult(source_status="ok", record=None)

    return AssetResult(
        source_status="ok",
        record=AssetRecord(
            asset_record_id=row[0],
            fitting_position=row[1],
            high_level_component=row[2],
            sub_system_name=row[3],
            sub_component_name=row[4],
        ),
    )

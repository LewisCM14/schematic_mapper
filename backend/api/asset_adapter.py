"""Asset adapter: queries the mock asset database for fitting position details."""

from dataclasses import dataclass
from typing import Literal

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

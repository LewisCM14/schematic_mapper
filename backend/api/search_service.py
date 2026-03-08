"""SearchService: ranks and paginates fitting-position results across sources."""

import base64
import json
import uuid
from dataclasses import dataclass
from typing import Literal

from .asset_adapter import search_assets
from .models import FittingPosition, Image

MatchType = Literal["exact", "prefix", "partial"]
SourceName = Literal["internal", "asset"]

_MATCH_RANK: dict[MatchType, int] = {"exact": 0, "prefix": 1, "partial": 2}


@dataclass
class SearchResultItem:
    fitting_position_id: str
    label_text: str
    image_id: uuid.UUID
    x_coordinate: object  # Decimal from DB
    y_coordinate: object  # Decimal from DB
    component_name: str
    matched_source: SourceName
    matched_field: str
    match_type: MatchType


@dataclass
class SearchResponse:
    query: str
    image_id: uuid.UUID
    limit: int
    results: list[SearchResultItem]
    source_status: dict[str, str]
    has_more: bool
    next_cursor: str | None
    request_id: str


def _match_type(value: str, query: str) -> MatchType | None:
    lower_val = value.lower()
    lower_q = query.lower()
    if lower_val == lower_q:
        return "exact"
    if lower_val.startswith(lower_q):
        return "prefix"
    if lower_q in lower_val:
        return "partial"
    return None


def _encode_cursor(offset: int) -> str:
    return base64.b64encode(json.dumps({"offset": offset}).encode()).decode()


def _decode_cursor(cursor: str | None) -> int:
    if not cursor:
        return 0
    try:
        return int(json.loads(base64.b64decode(cursor)).get("offset", 0))
    except Exception:
        return 0


def search(
    image_id: uuid.UUID,
    query: str,
    sources: list[str],
    limit: int,
    cursor: str | None,
    request_id: str,
) -> SearchResponse:
    image = Image.objects.select_related("drawing_type").get(pk=image_id)
    positions = list(FittingPosition.objects.filter(image_id=image_id, is_active=True))

    # Map label_text → FittingPosition for joining external results
    fp_by_label: dict[str, FittingPosition] = {fp.label_text: fp for fp in positions}

    source_status: dict[str, str] = {}
    # keyed by fitting_position_id; lowest match_rank wins
    hits: dict[str, tuple[int, SearchResultItem]] = {}

    def _upsert(item: SearchResultItem) -> None:
        rank = _MATCH_RANK[item.match_type]
        existing = hits.get(item.fitting_position_id)
        if existing is None or rank < existing[0]:
            hits[item.fitting_position_id] = (rank, item)

    # ── Internal ──────────────────────────────────────────────────────────────
    if "internal" in sources:
        source_status["internal"] = "ok"
        for fp in positions:
            for field, value in [
                ("label_text", fp.label_text),
                ("component_name", image.component_name),
            ]:
                mt = _match_type(value, query)
                if mt:
                    _upsert(
                        SearchResultItem(
                            fitting_position_id=fp.fitting_position_id,
                            label_text=fp.label_text,
                            image_id=image_id,
                            x_coordinate=fp.x_coordinate,
                            y_coordinate=fp.y_coordinate,
                            component_name=image.component_name,
                            matched_source="internal",
                            matched_field=field,
                            match_type=mt,
                        )
                    )

    # ── Asset ─────────────────────────────────────────────────────────────────
    if "asset" in sources and positions:
        labels = [fp.label_text for fp in positions]
        asset_result = search_assets(labels, query)
        source_status["asset"] = asset_result.source_status
        for row in asset_result.rows:
            fp_maybe = fp_by_label.get(row.fitting_position)
            if fp_maybe is None:
                continue
            fp = fp_maybe
            for asset_field, value in [
                ("high_level_component", row.high_level_component),
                ("sub_system_name", row.sub_system_name),
                ("sub_component_name", row.sub_component_name),
            ]:
                mt = _match_type(value, query)
                if mt:
                    _upsert(
                        SearchResultItem(
                            fitting_position_id=fp.fitting_position_id,
                            label_text=fp.label_text,
                            image_id=image_id,
                            x_coordinate=fp.x_coordinate,
                            y_coordinate=fp.y_coordinate,
                            component_name=image.component_name,
                            matched_source="asset",
                            matched_field=asset_field,
                            match_type=mt,
                        )
                    )

    # ── Rank + paginate ───────────────────────────────────────────────────────
    ranked = sorted(
        hits.values(),
        key=lambda t: (t[0], t[1].label_text),
    )
    all_results = [item for _, item in ranked]

    offset = _decode_cursor(cursor)
    page = all_results[offset : offset + limit]
    has_more = (offset + limit) < len(all_results)
    next_cursor = _encode_cursor(offset + limit) if has_more else None

    return SearchResponse(
        query=query,
        image_id=image_id,
        limit=limit,
        results=page,
        source_status=source_status,
        has_more=has_more,
        next_cursor=next_cursor,
        request_id=request_id,
    )

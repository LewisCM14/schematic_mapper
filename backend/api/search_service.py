"""SearchService: ranks and paginates fitting-position results across sources."""

import base64
import json
import uuid
from dataclasses import dataclass
from typing import Literal

from .asset_adapter import search_assets
from .search_config_service import SearchConfigService, SourceSearchConfig
from .search_index_service import SearchIndexService, SearchProjectionRow

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


def normalize(value: str, rules: list[str]) -> str:
    """Apply configured normalization rules to *value*."""
    result = value
    for rule in rules:
        if rule == "case_fold":
            result = result.casefold()
        elif rule == "trim":
            result = result.strip()
    return result


def _match_type(value: str, query: str, config: SourceSearchConfig | None = None) -> MatchType | None:
    rules = config.normalization_rules if config else ["case_fold", "trim"]
    norm_val = normalize(value, rules)
    norm_q = normalize(query, rules)
    if norm_val == norm_q:
        return "exact"
    if norm_val.startswith(norm_q):
        return "prefix"
    if norm_q in norm_val:
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
    config_service = SearchConfigService()
    index_service = SearchIndexService(config_service)

    internal_degraded = False
    try:
        projection_rows = index_service.get_searchable_fields(image_id)
    except Exception:
        projection_rows = []
        internal_degraded = True

    row_by_label: dict[str, SearchProjectionRow] = {
        row.label_text: row for row in projection_rows
    }

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
        if internal_degraded:
            source_status["internal"] = "degraded"
        else:
            source_status["internal"] = "ok"
            internal_config = config_service.get_config("internal")
            for proj_row in projection_rows:
                for col_name in internal_config.searchable_columns:
                    value = str(getattr(proj_row, col_name))
                    mt = _match_type(value, query, internal_config)
                    if mt:
                        _upsert(
                            SearchResultItem(
                                fitting_position_id=proj_row.fitting_position_id,
                                label_text=proj_row.label_text,
                                image_id=image_id,
                                x_coordinate=proj_row.x_coordinate,
                                y_coordinate=proj_row.y_coordinate,
                                component_name=proj_row.component_name,
                                matched_source="internal",
                                matched_field=col_name,
                                match_type=mt,
                            )
                        )

    # ── Asset ─────────────────────────────────────────────────────────────────
    if "asset" in sources:
        if not projection_rows:
            source_status["asset"] = "degraded" if internal_degraded else "ok"
        else:
            labels = [row.label_text for row in projection_rows]
            asset_config = config_service.get_config("asset")
            asset_table = asset_config.table_name or "asset_information"
            asset_result = search_assets(labels, query, table_name=asset_table)
            source_status["asset"] = asset_result.source_status
            for asset_row in asset_result.rows:
                proj_row_maybe = row_by_label.get(asset_row.fitting_position)
                if proj_row_maybe is None:
                    continue
                proj_row = proj_row_maybe
                for col_name in asset_config.searchable_columns:
                    value = str(getattr(asset_row, col_name))
                    mt = _match_type(value, query, asset_config)
                    if mt:
                        _upsert(
                            SearchResultItem(
                                fitting_position_id=proj_row.fitting_position_id,
                                label_text=proj_row.label_text,
                                image_id=image_id,
                                x_coordinate=proj_row.x_coordinate,
                                y_coordinate=proj_row.y_coordinate,
                                component_name=proj_row.component_name,
                                matched_source="asset",
                                matched_field=col_name,
                                match_type=mt,
                            )
                        )

    # ── Rank + paginate ───────────────────────────────────────────────────────
    ranked = sorted(
        hits.values(),
        key=lambda t: (
            t[0],
            -config_service.get_field_weight(t[1].matched_source, t[1].matched_field),
            t[1].label_text,
        ),
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

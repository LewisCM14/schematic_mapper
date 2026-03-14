"""
SearchService: orchestrates multi-source search for fitting positions (POIs) on a drawing.
Implements ranking, deduplication, and pagination for search results across internal and asset sources.

This service is the main entry point for the /api/search endpoint.
"""

import base64
import json
import uuid
from dataclasses import dataclass
from typing import Literal

from api.adapters.asset_adapter import search_assets
from api.services.search_config_service import SearchConfigService, SourceSearchConfig
from api.services.search_index_service import SearchIndexService, SearchProjectionRow
from api.constants import _MATCH_RANK

# --- Type aliases for clarity ---
MatchType = Literal["exact", "prefix", "partial"]
SourceName = Literal["internal", "asset"]


@dataclass
class SearchResultItem:
    """
    Represents a single search result for a fitting position (POI).
    Includes the match type, source, and all metadata needed for UI display.
    """

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
    """
    Full response returned to the UI for a search query.
    Includes results, pagination info, and per-source status.
    """

    query: str
    image_id: uuid.UUID
    limit: int
    results: list[SearchResultItem]
    source_status: dict[str, str]
    has_more: bool
    next_cursor: str | None
    request_id: str


def normalize(value: str, rules: list[str]) -> str:
    """
    Apply configured normalization rules (e.g. case folding, trimming) to a value.
    Used to ensure consistent search and matching.
    """
    result = value
    for rule in rules:
        if rule == "case_fold":
            result = result.casefold()
        elif rule == "trim":
            result = result.strip()
    return result


def _match_type(
    value: str, query: str, config: SourceSearchConfig | None = None
) -> MatchType | None:
    """
    Determine the match type between a value and the search query.
    Returns 'exact', 'prefix', 'partial', or None if no match.
    """
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
    """
    Encode a pagination offset as a base64 cursor string for stateless paging.
    """
    return base64.b64encode(json.dumps({"offset": offset}).encode()).decode()


def _decode_cursor(cursor: str | None) -> int:
    """
    Decode a base64 cursor string to an integer offset.
    Returns 0 if the cursor is missing or invalid.
    """
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
    """
    Main search entry point. Aggregates and ranks results from internal and asset sources.
    - image_id: restricts search to a single drawing
    - query: user search string
    - sources: list of enabled sources (e.g. ["internal", "asset"])
    - limit: max results per page
    - cursor: pagination cursor (for infinite scroll)
    - request_id: correlation ID for logging/tracing
    Returns: SearchResponse for the UI
    """
    config_service = SearchConfigService()
    index_service = SearchIndexService(config_service)

    # Try to load the search projection for this image (internal DB only)
    internal_degraded = False
    try:
        projection_rows = index_service.get_searchable_fields(image_id)
    except Exception:
        projection_rows = []
        internal_degraded = True

    # Map label_text to projection row for fast lookup
    row_by_label: dict[str, SearchProjectionRow] = {
        row.label_text: row for row in projection_rows
    }

    source_status: dict[str, str] = {}
    # Results keyed by fitting_position_id; lowest match_rank wins (deduplication)
    hits: dict[str, tuple[int, SearchResultItem]] = {}

    def _upsert(item: SearchResultItem) -> None:
        """Insert or update a result, keeping only the best match per POI."""
        rank = _MATCH_RANK[item.match_type]
        existing = hits.get(item.fitting_position_id)
        if existing is None or rank < existing[0]:
            hits[item.fitting_position_id] = (rank, item)

    # --- Internal DB search ---
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

    # --- Asset DB search (external) ---
    if "asset" in sources:
        if not projection_rows:
            # If internal DB is degraded, asset search is also degraded
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
                    continue  # Only include asset rows that map to a known POI
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

    # --- Rank, deduplicate, and paginate results ---
    ranked = sorted(
        hits.values(),
        key=lambda t: (
            t[0],  # match rank (exact < prefix < partial)
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

"""
Projection builder for search: creates a unified, denormalized set of searchable fields for a given image.
Builds and caches a list of SearchProjectionRow objects for fast POI search.
Used by the search service to power internal DB lookups and deduplication.
"""

import uuid
from dataclasses import dataclass

from api.cache import TTLCache
from api.models import FittingPosition, Image
from api.services.search_config_service import SearchConfigService


# Import projection TTL from centralized constants
from api.constants import PROJECTION_TTL_SECONDS


@dataclass
class SearchProjectionRow:
    """
    Represents a single row in the search projection for an image.
    Each row corresponds to a FittingPosition (POI) and includes all fields needed for search and display.
    """

    fitting_position_id: str
    label_text: str
    x_coordinate: object  # Decimal from DB
    y_coordinate: object  # Decimal from DB
    component_name: str


class SearchIndexService:
    """
    Builds and caches a reduced projection over FittingPosition rows for searching.
    - Caches projections per image for fast repeated queries (TTL-based)
    - Used by the search service to get all searchable POIs for an image
    - Supports cache invalidation and refresh for admin/maintenance
    """

    _cache: TTLCache[list[SearchProjectionRow]] = TTLCache()

    def __init__(self, config_service: SearchConfigService | None = None) -> None:
        # Optionally accept a config service (for testability)
        self._config = config_service or SearchConfigService()

    def get_searchable_fields(self, image_id: uuid.UUID) -> list[SearchProjectionRow]:
        """
        Get the list of searchable POI rows for a given image.
        Uses a TTL cache for performance; builds projection if not cached.
        """
        key = str(image_id)
        cached = self._cache.get(key)
        if cached is not None:
            return cached

        rows = self._build_projection(image_id)
        self._cache.set(key, rows, PROJECTION_TTL_SECONDS)
        return rows

    def invalidate(self, image_id: uuid.UUID) -> None:
        """
        Remove the cached projection for a single image (forces rebuild on next access).
        """
        self._cache.set(str(image_id), [], 0)  # expires immediately
        self._cache.get(str(image_id))  # trigger lazy eviction

    def refresh(self, image_id: uuid.UUID) -> list[SearchProjectionRow]:
        """
        Force-rebuild and cache the projection for *image_id* (used by admin/maintenance).
        """
        rows = self._build_projection(image_id)
        self._cache.set(str(image_id), rows, PROJECTION_TTL_SECONDS)
        return rows

    @classmethod
    def clear_cache(cls) -> None:
        """
        Remove all cached projections (intended for tests or full reindex).
        """
        cls._cache.clear()

    def _build_projection(self, image_id: uuid.UUID) -> list[SearchProjectionRow]:
        """
        Build the projection for a given image by joining FittingPosition and Image.
        Returns a list of SearchProjectionRow objects for all active POIs.
        """
        image = Image.objects.select_related("drawing_type").get(pk=image_id)
        positions = list(
            FittingPosition.objects.filter(image_id=image_id, is_active=True)
        )
        return [
            SearchProjectionRow(
                fitting_position_id=fp.fitting_position_id,
                label_text=fp.label_text,
                x_coordinate=fp.x_coordinate,
                y_coordinate=fp.y_coordinate,
                component_name=image.component_name,
            )
            for fp in positions
        ]

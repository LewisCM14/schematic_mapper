"""Projection builder: unified searchable field rows for a given image."""

import uuid
from dataclasses import dataclass

from api.cache import TTLCache
from api.models import FittingPosition, Image
from api.services.search_config_service import SearchConfigService

PROJECTION_TTL_SECONDS = 600  # 10 minutes


@dataclass
class SearchProjectionRow:
    fitting_position_id: str
    label_text: str
    x_coordinate: object  # Decimal from DB
    y_coordinate: object  # Decimal from DB
    component_name: str


class SearchIndexService:
    """Builds a reduced projection over FittingPosition rows for searching."""

    _cache: TTLCache[list[SearchProjectionRow]] = TTLCache()

    def __init__(self, config_service: SearchConfigService | None = None) -> None:
        self._config = config_service or SearchConfigService()

    def get_searchable_fields(self, image_id: uuid.UUID) -> list[SearchProjectionRow]:
        key = str(image_id)
        cached = self._cache.get(key)
        if cached is not None:
            return cached

        rows = self._build_projection(image_id)
        self._cache.set(key, rows, PROJECTION_TTL_SECONDS)
        return rows

    def invalidate(self, image_id: uuid.UUID) -> None:
        """Remove the cached projection for a single image."""
        self._cache.set(str(image_id), [], 0)  # expires immediately
        self._cache.get(str(image_id))  # trigger lazy eviction

    def refresh(self, image_id: uuid.UUID) -> list[SearchProjectionRow]:
        """Force-rebuild and cache the projection for *image_id*."""
        rows = self._build_projection(image_id)
        self._cache.set(str(image_id), rows, PROJECTION_TTL_SECONDS)
        return rows

    @classmethod
    def clear_cache(cls) -> None:
        """Remove all cached projections — intended for tests."""
        cls._cache.clear()

    def _build_projection(self, image_id: uuid.UUID) -> list[SearchProjectionRow]:
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

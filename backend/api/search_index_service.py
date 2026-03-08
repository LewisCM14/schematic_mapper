"""Projection builder: unified searchable field rows for a given image."""

import uuid
from dataclasses import dataclass

from .models import FittingPosition, Image
from .search_config_service import SearchConfigService


@dataclass
class SearchProjectionRow:
    fitting_position_id: str
    label_text: str
    x_coordinate: object  # Decimal from DB
    y_coordinate: object  # Decimal from DB
    component_name: str


class SearchIndexService:
    """Builds a reduced projection over FittingPosition rows for searching."""

    def __init__(self, config_service: SearchConfigService | None = None) -> None:
        self._config = config_service or SearchConfigService()

    def get_searchable_fields(self, image_id: uuid.UUID) -> list[SearchProjectionRow]:
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

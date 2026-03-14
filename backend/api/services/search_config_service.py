"""
Configuration-driven registry for search sources and their fields.
Defines which fields are searchable, their weights, and normalization rules for each source.
Used by the search service to orchestrate multi-source POI search.
"""

from dataclasses import dataclass, field
from typing import final


@dataclass
class SourceSearchConfig:
    """
    Configuration for a single search source (e.g., 'internal', 'asset').
    - source_name: Unique name of the source
    - enabled: If this source is active for search
    - searchable_columns: List of fields to search in this source
    - field_weights: Dict mapping field name to ranking weight
    - table_name: DB table for external sources (None for internal)
    - normalization_rules: List of normalization steps (e.g., case folding, trim)
    """

    source_name: str
    enabled: bool
    searchable_columns: list[str]
    field_weights: dict[str, int]
    table_name: str | None = None
    normalization_rules: list[str] = field(
        default_factory=lambda: ["case_fold", "trim"]
    )


@final
class SearchConfigService:
    """
    Holds per-source search configuration, seeded in-process.
    Provides lookup for which fields to search, their weights, and normalization rules.
    Used by the search service to drive ranking and field selection.
    """

    # Registry of all search sources and their configs
    _configs: dict[str, SourceSearchConfig] = {
        "internal": SourceSearchConfig(
            source_name="internal",
            enabled=True,
            searchable_columns=["label_text", "component_name"],
            field_weights={"label_text": 10, "component_name": 5},
            table_name=None,  # Internal DB
        ),
        "asset": SourceSearchConfig(
            source_name="asset",
            enabled=True,
            searchable_columns=[
                "sub_component_name",
                "high_level_component",
                "sub_system_name",
            ],
            field_weights={
                "sub_component_name": 8,
                "high_level_component": 6,
                "sub_system_name": 5,
            },
            table_name="asset_information",  # External asset DB
        ),
    }

    def get_config(self, source_name: str) -> SourceSearchConfig:
        """
        Look up the config for a given source (raises KeyError if unknown).
        """
        if source_name not in self._configs:
            raise KeyError(f"Unknown source: {source_name!r}")
        return self._configs[source_name]

    def get_field_weight(self, source_name: str, column: str) -> int:
        """
        Get the ranking weight for a field in a given source.
        Returns 0 if the field is not weighted.
        """
        config = self.get_config(source_name)
        return config.field_weights.get(column, 0)

    def get_enabled_sources(self) -> list[SourceSearchConfig]:
        """
        Return all enabled search sources (for UI or search orchestration).
        """
        return [c for c in self._configs.values() if c.enabled]

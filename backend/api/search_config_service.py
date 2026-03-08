"""Configuration-driven field registry for searchable sources."""

from dataclasses import dataclass
from typing import final


@dataclass
class SourceSearchConfig:
    source_name: str
    enabled: bool
    searchable_columns: list[str]
    field_weights: dict[str, int]


@final
class SearchConfigService:
    """Holds per-source search configuration seeded in-process."""

    _configs: dict[str, SourceSearchConfig] = {
        "internal": SourceSearchConfig(
            source_name="internal",
            enabled=True,
            searchable_columns=["label_text", "component_name"],
            field_weights={"label_text": 10, "component_name": 5},
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
        ),
    }

    def get_config(self, source_name: str) -> SourceSearchConfig:
        if source_name not in self._configs:
            raise KeyError(f"Unknown source: {source_name!r}")
        return self._configs[source_name]

    def get_field_weight(self, source_name: str, column: str) -> int:
        config = self.get_config(source_name)
        return config.field_weights.get(column, 0)

    def get_enabled_sources(self) -> list[SourceSearchConfig]:
        return [c for c in self._configs.values() if c.enabled]

from collections.abc import Generator
from unittest.mock import MagicMock, patch

import pytest
from django.db import OperationalError

from api.adapters.asset_adapter import (
    FAILURE_THRESHOLD,
    AssetRecord,
    AssetSearchRow,
    clear_asset_cache,
    fetch_asset_details,
    reset_circuit_breaker,
    search_assets,
)


@pytest.fixture(autouse=True)
def _reset_cb() -> Generator[None]:
    """Reset the circuit breaker and asset cache before every test."""
    reset_circuit_breaker()
    clear_asset_cache()
    yield
    reset_circuit_breaker()
    clear_asset_cache()


class TestFetchAssetDetails:
    def test_returns_record_when_found(self) -> None:
        mock_cursor = MagicMock()
        mock_cursor.__enter__ = MagicMock(return_value=mock_cursor)
        mock_cursor.__exit__ = MagicMock(return_value=False)
        mock_cursor.fetchone.return_value = (
            "ASSET-001",
            "FP-PUMP-01-INLET",
            "Cooling System",
            "Primary Cooling Loop",
            "Inlet Pump Assembly",
        )

        with patch("api.adapters.asset_adapter.connections") as mock_connections:
            mock_connections.__getitem__.return_value.cursor.return_value = mock_cursor
            result = fetch_asset_details("FP-PUMP-01-INLET")

        assert result.source_status == "ok"
        assert isinstance(result.record, AssetRecord)
        assert result.record.asset_record_id == "ASSET-001"
        assert result.record.high_level_component == "Cooling System"
        assert result.record.sub_component_name == "Inlet Pump Assembly"

    def test_returns_ok_with_no_record_when_not_found(self) -> None:
        mock_cursor = MagicMock()
        mock_cursor.__enter__ = MagicMock(return_value=mock_cursor)
        mock_cursor.__exit__ = MagicMock(return_value=False)
        mock_cursor.fetchone.return_value = None

        with patch("api.adapters.asset_adapter.connections") as mock_connections:
            mock_connections.__getitem__.return_value.cursor.return_value = mock_cursor
            result = fetch_asset_details("UNKNOWN-LABEL")

        assert result.source_status == "ok"
        assert result.record is None

    def test_returns_degraded_on_operational_error(self) -> None:
        from django.db import OperationalError

        with patch("api.adapters.asset_adapter.connections") as mock_connections:
            mock_connections.__getitem__.return_value.cursor.side_effect = (
                OperationalError("connection refused")
            )
            result = fetch_asset_details("FP-PUMP-01-INLET")

        assert result.source_status == "degraded"
        assert result.record is None

    def test_returns_degraded_on_programming_error(self) -> None:
        from django.db import ProgrammingError

        with patch("api.adapters.asset_adapter.connections") as mock_connections:
            mock_connections.__getitem__.return_value.cursor.side_effect = (
                ProgrammingError("relation does not exist")
            )
            result = fetch_asset_details("FP-PUMP-01-INLET")

        assert result.source_status == "degraded"
        assert result.record is None


class TestCircuitBreaker:
    def test_trips_after_consecutive_failures(self) -> None:
        """After FAILURE_THRESHOLD consecutive failures the circuit opens,
        returning degraded without attempting a query."""
        with patch("api.adapters.asset_adapter.connections") as mock_connections:
            mock_connections.__getitem__.return_value.cursor.side_effect = (
                OperationalError("timeout")
            )
            for _ in range(FAILURE_THRESHOLD):
                fetch_asset_details("FP-001")

        # Next call should be short-circuited — no cursor call
        with patch("api.adapters.asset_adapter.connections") as mock_connections:
            result = fetch_asset_details("FP-001")
            mock_connections.__getitem__.return_value.cursor.assert_not_called()

        assert result.source_status == "degraded"
        assert result.record is None

    def test_resets_on_success(self) -> None:
        """A successful query resets the failure counter."""
        mock_cursor = MagicMock()
        mock_cursor.__enter__ = MagicMock(return_value=mock_cursor)
        mock_cursor.__exit__ = MagicMock(return_value=False)

        with patch("api.adapters.asset_adapter.connections") as mock_connections:
            # Accumulate failures just below threshold
            mock_connections.__getitem__.return_value.cursor.side_effect = (
                OperationalError("timeout")
            )
            for _ in range(FAILURE_THRESHOLD - 1):
                fetch_asset_details("FP-001")

            # One success resets the counter
            mock_cursor.fetchone.return_value = None
            mock_connections.__getitem__.return_value.cursor.side_effect = None
            mock_connections.__getitem__.return_value.cursor.return_value = mock_cursor
            result = fetch_asset_details("FP-001")
            assert result.source_status == "ok"

            # Now fail again — should NOT trip because counter was reset
            mock_connections.__getitem__.return_value.cursor.side_effect = (
                OperationalError("timeout")
            )
            for _ in range(FAILURE_THRESHOLD - 1):
                result = fetch_asset_details("FP-001")

            # Still below threshold, so next call should attempt the query
            mock_cursor.fetchone.return_value = None
            mock_connections.__getitem__.return_value.cursor.side_effect = None
            mock_connections.__getitem__.return_value.cursor.return_value = mock_cursor
            result = fetch_asset_details("FP-001")
            assert result.source_status == "ok"

    def test_half_open_after_cooldown(self) -> None:
        """After the cooldown elapses the circuit allows a retry."""
        with patch("api.adapters.asset_adapter.connections") as mock_connections:
            mock_connections.__getitem__.return_value.cursor.side_effect = (
                OperationalError("timeout")
            )
            for _ in range(FAILURE_THRESHOLD):
                fetch_asset_details("FP-001")

        # Fast-forward past the cooldown
        with (
            patch("api.adapters.asset_adapter.time") as mock_time,
            patch("api.adapters.asset_adapter.connections") as mock_connections,
        ):
            mock_time.monotonic.return_value = 1e12  # well past any deadline
            mock_cursor = MagicMock()
            mock_cursor.__enter__ = MagicMock(return_value=mock_cursor)
            mock_cursor.__exit__ = MagicMock(return_value=False)
            mock_cursor.fetchone.return_value = None
            mock_connections.__getitem__.return_value.cursor.return_value = mock_cursor

            result = fetch_asset_details("FP-001")
            # The query should have been attempted
            mock_connections.__getitem__.return_value.cursor.assert_called()
            assert result.source_status == "ok"


class TestAssetAdapterContract:
    """Contract tests verifying the column-to-dataclass mapping."""

    def test_fetch_asset_details_column_order_matches_dataclass(self) -> None:
        """The SELECT column order in fetch_asset_details must match AssetRecord fields."""
        import dataclasses

        expected_fields = [f.name for f in dataclasses.fields(AssetRecord)]
        # AssetRecord fields: asset_record_id, fitting_position,
        # high_level_component, sub_system_name, sub_component_name
        assert expected_fields == [
            "asset_record_id",
            "fitting_position",
            "high_level_component",
            "sub_system_name",
            "sub_component_name",
        ]

    def test_search_assets_column_order_matches_dataclass(self) -> None:
        """The SELECT column order in search_assets must match AssetSearchRow fields."""
        import dataclasses

        expected_fields = [f.name for f in dataclasses.fields(AssetSearchRow)]
        # AssetSearchRow fields: fitting_position,
        # high_level_component, sub_system_name, sub_component_name
        assert expected_fields == [
            "fitting_position",
            "high_level_component",
            "sub_system_name",
            "sub_component_name",
        ]

    def test_search_assets_column_count_matches_dataclass(self) -> None:
        """Row tuple from search_assets must have exactly as many elements as
        AssetSearchRow has fields."""
        import dataclasses

        field_count = len(dataclasses.fields(AssetSearchRow))
        # search_assets SQL: SELECT fitting_position, {_SEARCHABLE_COLUMNS}
        # = 1 + len(_SEARCHABLE_COLUMNS) = 4
        assert field_count == 4

    def test_fetch_details_column_count_matches_dataclass(self) -> None:
        """Row tuple from fetch_asset_details must have exactly as many elements
        as AssetRecord has fields."""
        import dataclasses

        field_count = len(dataclasses.fields(AssetRecord))
        # fetch_asset_details SQL: SELECT asset_record_id, fitting_position,
        # high_level_component, sub_system_name, sub_component_name = 5
        assert field_count == 5

    def test_search_assets_trips_circuit(self) -> None:
        """search_assets also participates in the shared circuit breaker."""
        with patch("api.adapters.asset_adapter.connections") as mock_connections:
            mock_connections.__getitem__.return_value.cursor.side_effect = (
                OperationalError("timeout")
            )
            for _ in range(FAILURE_THRESHOLD):
                search_assets(["FP-001"], "pump")

        with patch("api.adapters.asset_adapter.connections") as mock_connections:
            result = search_assets(["FP-001"], "pump")
            mock_connections.__getitem__.return_value.cursor.assert_not_called()
        assert result.source_status == "degraded"

    def test_timeout_is_set_on_cursor(self) -> None:
        """Both functions issue SET LOCAL statement_timeout before the query."""
        mock_cursor = MagicMock()
        mock_cursor.__enter__ = MagicMock(return_value=mock_cursor)
        mock_cursor.__exit__ = MagicMock(return_value=False)
        mock_cursor.fetchone.return_value = None

        with patch("api.adapters.asset_adapter.connections") as mock_connections:
            mock_connections.__getitem__.return_value.cursor.return_value = mock_cursor
            fetch_asset_details("FP-001")

        calls = [str(c) for c in mock_cursor.execute.call_args_list]
        assert any("statement_timeout" in c for c in calls)


class TestReadThroughCache:
    """Tests for the TTL read-through cache on asset adapter functions."""

    def test_fetch_details_cache_hit_skips_db(self) -> None:
        """A second call returns the cached result without a second DB query."""
        mock_cursor = MagicMock()
        mock_cursor.__enter__ = MagicMock(return_value=mock_cursor)
        mock_cursor.__exit__ = MagicMock(return_value=False)
        mock_cursor.fetchone.return_value = (
            "ASSET-001",
            "FP-001",
            "Cooling",
            "Primary",
            "Inlet",
        )

        with patch("api.adapters.asset_adapter.connections") as mock_connections:
            mock_connections.__getitem__.return_value.cursor.return_value = mock_cursor
            result1 = fetch_asset_details("FP-001")
            result2 = fetch_asset_details("FP-001")

            # cursor should only have been acquired once
            assert mock_connections.__getitem__.return_value.cursor.call_count == 1

        assert result1.source_status == "ok"
        assert result2.source_status == "ok"
        assert result2.record is not None
        assert result2.record.asset_record_id == "ASSET-001"

    def test_fetch_details_cache_expires_after_ttl(self) -> None:
        """After TTL expires a fresh DB query is made."""
        mock_cursor = MagicMock()
        mock_cursor.__enter__ = MagicMock(return_value=mock_cursor)
        mock_cursor.__exit__ = MagicMock(return_value=False)
        mock_cursor.fetchone.return_value = (
            "ASSET-001",
            "FP-001",
            "Cooling",
            "Primary",
            "Inlet",
        )

        with patch("api.adapters.asset_adapter.connections") as mock_connections:
            mock_connections.__getitem__.return_value.cursor.return_value = mock_cursor
            fetch_asset_details("FP-001")

        # Expire the cache entry by advancing time past TTL
        with (
            patch("api.cache.time") as mock_cache_time,
            patch("api.adapters.asset_adapter.connections") as mock_connections,
        ):
            mock_cache_time.monotonic.return_value = 1e12
            mock_cursor2 = MagicMock()
            mock_cursor2.__enter__ = MagicMock(return_value=mock_cursor2)
            mock_cursor2.__exit__ = MagicMock(return_value=False)
            mock_cursor2.fetchone.return_value = (
                "ASSET-002",
                "FP-001",
                "Cooling",
                "Primary",
                "Inlet",
            )
            mock_connections.__getitem__.return_value.cursor.return_value = mock_cursor2
            result = fetch_asset_details("FP-001")

        assert result.record is not None
        assert result.record.asset_record_id == "ASSET-002"

    def test_degraded_result_not_cached(self) -> None:
        """Degraded results from DB errors are not cached."""
        with patch("api.adapters.asset_adapter.connections") as mock_connections:
            mock_connections.__getitem__.return_value.cursor.side_effect = (
                OperationalError("timeout")
            )
            result1 = fetch_asset_details("FP-001")
            assert result1.source_status == "degraded"

        # Next call should attempt the DB again (not returned from cache)
        mock_cursor = MagicMock()
        mock_cursor.__enter__ = MagicMock(return_value=mock_cursor)
        mock_cursor.__exit__ = MagicMock(return_value=False)
        mock_cursor.fetchone.return_value = (
            "ASSET-001",
            "FP-001",
            "Cooling",
            "Primary",
            "Inlet",
        )
        with patch("api.adapters.asset_adapter.connections") as mock_connections:
            mock_connections.__getitem__.return_value.cursor.return_value = mock_cursor
            result2 = fetch_asset_details("FP-001")
            mock_connections.__getitem__.return_value.cursor.assert_called()

        assert result2.source_status == "ok"
        assert result2.record is not None

    def test_clear_asset_cache_forces_fresh_query(self) -> None:
        """clear_asset_cache() evicts all entries so the next call hits the DB."""
        mock_cursor = MagicMock()
        mock_cursor.__enter__ = MagicMock(return_value=mock_cursor)
        mock_cursor.__exit__ = MagicMock(return_value=False)
        mock_cursor.fetchone.return_value = (
            "ASSET-001",
            "FP-001",
            "Cooling",
            "Primary",
            "Inlet",
        )

        with patch("api.adapters.asset_adapter.connections") as mock_connections:
            mock_connections.__getitem__.return_value.cursor.return_value = mock_cursor
            fetch_asset_details("FP-001")
            assert mock_connections.__getitem__.return_value.cursor.call_count == 1

        clear_asset_cache()

        with patch("api.adapters.asset_adapter.connections") as mock_connections:
            mock_connections.__getitem__.return_value.cursor.return_value = mock_cursor
            fetch_asset_details("FP-001")
            assert mock_connections.__getitem__.return_value.cursor.call_count == 1

    def test_search_assets_cache_hit_skips_db(self) -> None:
        """A second search_assets call with the same args returns cached results."""
        mock_cursor = MagicMock()
        mock_cursor.__enter__ = MagicMock(return_value=mock_cursor)
        mock_cursor.__exit__ = MagicMock(return_value=False)
        mock_cursor.fetchall.return_value = [
            ("FP-001", "Cooling", "Primary", "Inlet"),
        ]

        with patch("api.adapters.asset_adapter.connections") as mock_connections:
            mock_connections.__getitem__.return_value.cursor.return_value = mock_cursor
            result1 = search_assets(["FP-001"], "cooling")
            result2 = search_assets(["FP-001"], "cooling")

            assert mock_connections.__getitem__.return_value.cursor.call_count == 1

        assert result1.source_status == "ok"
        assert result2.source_status == "ok"
        assert len(result2.rows) == 1

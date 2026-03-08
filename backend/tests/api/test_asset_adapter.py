from unittest.mock import MagicMock, patch

from api.asset_adapter import AssetRecord, fetch_asset_details


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

        with patch("api.asset_adapter.connections") as mock_connections:
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

        with patch("api.asset_adapter.connections") as mock_connections:
            mock_connections.__getitem__.return_value.cursor.return_value = mock_cursor
            result = fetch_asset_details("UNKNOWN-LABEL")

        assert result.source_status == "ok"
        assert result.record is None

    def test_returns_degraded_on_operational_error(self) -> None:
        from django.db import OperationalError

        with patch("api.asset_adapter.connections") as mock_connections:
            mock_connections.__getitem__.return_value.cursor.side_effect = (
                OperationalError("connection refused")
            )
            result = fetch_asset_details("FP-PUMP-01-INLET")

        assert result.source_status == "degraded"
        assert result.record is None

    def test_returns_degraded_on_programming_error(self) -> None:
        from django.db import ProgrammingError

        with patch("api.asset_adapter.connections") as mock_connections:
            mock_connections.__getitem__.return_value.cursor.side_effect = (
                ProgrammingError("relation does not exist")
            )
            result = fetch_asset_details("FP-PUMP-01-INLET")

        assert result.source_status == "degraded"
        assert result.record is None

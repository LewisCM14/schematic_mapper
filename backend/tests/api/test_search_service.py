"""Tests for the search service."""

from unittest.mock import patch

import pytest

from api.asset_adapter import AssetSearchResult
from api.models import DrawingType, FittingPosition, Image
from api.search_service import _decode_cursor, _encode_cursor, _match_type, search


class TestMatchType:
    def test_exact_match(self) -> None:
        assert _match_type("PUMP-01", "pump-01") == "exact"

    def test_prefix_match(self) -> None:
        assert _match_type("PUMP-01-INLET", "pump") == "prefix"

    def test_partial_match(self) -> None:
        assert _match_type("inlet-pump-01", "pump") == "partial"

    def test_no_match(self) -> None:
        assert _match_type("valve-03", "pump") is None

    def test_case_insensitive(self) -> None:
        assert _match_type("CoolingPump", "coolingpump") == "exact"


class TestCursorEncoding:
    def test_encode_decode_roundtrip(self) -> None:
        assert _decode_cursor(_encode_cursor(42)) == 42

    def test_decode_none_returns_zero(self) -> None:
        assert _decode_cursor(None) == 0

    def test_decode_invalid_returns_zero(self) -> None:
        assert _decode_cursor("not-valid-base64!!!") == 0


@pytest.mark.django_db
class TestSearchService:
    def _setup(self) -> tuple[Image, list[FittingPosition]]:
        dt = DrawingType.objects.create(type_name="composite-search")
        img = Image.objects.create(
            drawing_type=dt,
            component_name="Cooling Pump Assembly",
            image_binary=b"<svg/>",
            content_hash="hash",
            width_px=800,
            height_px=600,
        )
        fps = [
            FittingPosition.objects.create(
                fitting_position_id="FP-001",
                image=img,
                x_coordinate="100.000",
                y_coordinate="200.000",
                label_text="PUMP-01-INLET",
            ),
            FittingPosition.objects.create(
                fitting_position_id="FP-002",
                image=img,
                x_coordinate="150.000",
                y_coordinate="250.000",
                label_text="PUMP-01-OUTLET",
            ),
            FittingPosition.objects.create(
                fitting_position_id="FP-003",
                image=img,
                x_coordinate="200.000",
                y_coordinate="300.000",
                label_text="VALVE-02",
            ),
        ]
        return img, fps

    def test_internal_exact_match_ranks_first(self) -> None:
        img, fps = self._setup()
        result = search(
            image_id=img.image_id,
            query="PUMP-01-INLET",
            sources=["internal"],
            limit=25,
            cursor=None,
            request_id="test-req",
        )
        assert result.results[0].fitting_position_id == "FP-001"
        assert result.results[0].match_type == "exact"

    def test_internal_prefix_match_returned(self) -> None:
        img, fps = self._setup()
        result = search(
            image_id=img.image_id,
            query="pump",
            sources=["internal"],
            limit=25,
            cursor=None,
            request_id="test-req",
        )
        ids = [r.fitting_position_id for r in result.results]
        assert "FP-001" in ids
        assert "FP-002" in ids
        # FP-003 (VALVE-02) also matches via component_name "Cooling Pump Assembly"
        assert "FP-003" in ids

    def test_no_results_when_no_match(self) -> None:
        img, _ = self._setup()
        result = search(
            image_id=img.image_id,
            query="ZZZNOTHERE",
            sources=["internal"],
            limit=25,
            cursor=None,
            request_id="req",
        )
        assert result.results == []

    def test_pagination_has_more(self) -> None:
        img, _ = self._setup()
        result = search(
            image_id=img.image_id,
            query="pump",
            sources=["internal"],
            limit=1,
            cursor=None,
            request_id="req",
        )
        assert len(result.results) == 1
        assert result.has_more is True
        assert result.next_cursor is not None

    def test_pagination_last_page(self) -> None:
        img, _ = self._setup()
        # 3 total results (FP-001, FP-002, FP-003 all match via component_name)
        # Cursor at offset=2 returns 1 item with no more pages
        result = search(
            image_id=img.image_id,
            query="pump",
            sources=["internal"],
            limit=1,
            cursor=_encode_cursor(2),
            request_id="req",
        )
        assert len(result.results) == 1
        assert result.has_more is False

    def test_asset_source_degraded_on_db_error(self) -> None:
        img, _ = self._setup()
        with patch("api.search_service.search_assets") as mock_search_assets:
            mock_search_assets.return_value = AssetSearchResult(source_status="degraded")
            result = search(
                image_id=img.image_id,
                query="pump",
                sources=["internal", "asset"],
                limit=25,
                cursor=None,
                request_id="req",
            )
        assert result.source_status.get("asset") == "degraded"
        assert result.source_status.get("internal") == "ok"

    def test_component_name_match_internal(self) -> None:
        img, _ = self._setup()
        result = search(
            image_id=img.image_id,
            query="Cooling",
            sources=["internal"],
            limit=25,
            cursor=None,
            request_id="req",
        )
        # component_name "Cooling Pump Assembly" matches all 3 FPs
        ids = {r.fitting_position_id for r in result.results}
        assert {"FP-001", "FP-002", "FP-003"} == ids

    def test_deduplication_keeps_best_match(self) -> None:
        img, _ = self._setup()
        # PUMP-01-INLET has both exact label match and partial component match
        result = search(
            image_id=img.image_id,
            query="pump-01-inlet",
            sources=["internal"],
            limit=25,
            cursor=None,
            request_id="req",
        )
        fp_ids = [r.fitting_position_id for r in result.results]
        # Each FP should appear at most once
        assert len(fp_ids) == len(set(fp_ids))
        # FP-001 should be exact match
        fp001 = next(r for r in result.results if r.fitting_position_id == "FP-001")
        assert fp001.match_type == "exact"

    def test_source_status_internal_ok(self) -> None:
        img, _ = self._setup()
        result = search(
            image_id=img.image_id,
            query="pump",
            sources=["internal"],
            limit=25,
            cursor=None,
            request_id="req",
        )
        assert result.source_status["internal"] == "ok"

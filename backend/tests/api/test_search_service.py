"""Tests for the search service."""

from io import StringIO
from unittest.mock import patch

import pytest
from django.core.management import call_command

from api.asset_adapter import AssetSearchResult
from api.models import DrawingType, FittingPosition, Image
from api.search_config_service import SearchConfigService
from api.search_index_service import SearchIndexService
from api.search_service import (
    _decode_cursor,
    _encode_cursor,
    _match_type,
    normalize,
    search,
)


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
    @pytest.fixture(autouse=True)
    def _clear_index_cache(self) -> None:
        SearchIndexService.clear_cache()

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
            mock_search_assets.return_value = AssetSearchResult(
                source_status="degraded"
            )
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

    def test_higher_weight_field_ranks_before_lower_weight(self) -> None:
        """label_text (weight 10) must outrank component_name (weight 5) same match type."""
        dt = DrawingType.objects.create(type_name="weight-test")
        # FP-A: query matches via component_name only (weight 5)
        img_a = Image.objects.create(
            drawing_type=dt,
            component_name="pump-alpha",
            image_binary=b"<svg/>",
            content_hash="wa1",
            width_px=800,
            height_px=600,
        )
        FittingPosition.objects.create(
            fitting_position_id="WA-001",
            image=img_a,
            x_coordinate="1.000",
            y_coordinate="1.000",
            label_text="valve-zz",
        )
        # FP-B: query matches via label_text (weight 10)
        FittingPosition.objects.create(
            fitting_position_id="WA-002",
            image=img_a,
            x_coordinate="2.000",
            y_coordinate="2.000",
            label_text="pump-beta",
        )
        result = search(
            image_id=img_a.image_id,
            query="pump",
            sources=["internal"],
            limit=25,
            cursor=None,
            request_id="req",
        )
        ids = [r.fitting_position_id for r in result.results]
        # WA-002 matched label_text (weight 10); WA-001 matched component_name (weight 5)
        assert ids.index("WA-002") < ids.index("WA-001")

    def test_both_sources_degraded(self) -> None:
        img, _ = self._setup()
        with (
            patch.object(
                SearchIndexService,
                "get_searchable_fields",
                side_effect=RuntimeError("db down"),
            ),
            patch("api.search_service.search_assets") as mock_search_assets,
        ):
            mock_search_assets.return_value = AssetSearchResult(
                source_status="degraded"
            )
            result = search(
                image_id=img.image_id,
                query="pump",
                sources=["internal", "asset"],
                limit=25,
                cursor=None,
                request_id="req-degraded",
            )
        assert result.results == []
        assert result.source_status["internal"] == "degraded"
        assert result.source_status["asset"] == "degraded"


class TestSearchConfigService:
    def test_known_source_returns_config(self) -> None:
        svc = SearchConfigService()
        config = svc.get_config("internal")
        assert config.source_name == "internal"
        assert "label_text" in config.searchable_columns
        assert "component_name" in config.searchable_columns

    def test_asset_source_returns_correct_columns(self) -> None:
        svc = SearchConfigService()
        config = svc.get_config("asset")
        assert "high_level_component" in config.searchable_columns
        assert "sub_system_name" in config.searchable_columns
        assert "sub_component_name" in config.searchable_columns

    def test_unknown_source_raises_key_error(self) -> None:
        svc = SearchConfigService()
        with pytest.raises(KeyError):
            svc.get_config("nonexistent")

    def test_get_enabled_sources_excludes_disabled(self) -> None:
        svc = SearchConfigService()
        enabled = svc.get_enabled_sources()
        assert all(c.enabled for c in enabled)
        names = {c.source_name for c in enabled}
        assert "internal" in names
        assert "asset" in names

    def test_field_weights_present(self) -> None:
        svc = SearchConfigService()
        config = svc.get_config("internal")
        assert (
            config.field_weights["label_text"] > config.field_weights["component_name"]
        )

    def test_get_field_weight_returns_configured_value(self) -> None:
        svc = SearchConfigService()
        assert svc.get_field_weight("internal", "label_text") == 10
        assert svc.get_field_weight("internal", "component_name") == 5

    def test_get_field_weight_unknown_column_returns_zero(self) -> None:
        svc = SearchConfigService()
        assert svc.get_field_weight("internal", "nonexistent_col") == 0

    def test_asset_table_name_is_asset_information(self) -> None:
        svc = SearchConfigService()
        assert svc.get_config("asset").table_name == "asset_information"

    def test_internal_table_name_is_none(self) -> None:
        svc = SearchConfigService()
        assert svc.get_config("internal").table_name is None

    def test_normalization_rules_default_for_internal(self) -> None:
        svc = SearchConfigService()
        assert svc.get_config("internal").normalization_rules == ["case_fold", "trim"]

    def test_normalization_rules_default_for_asset(self) -> None:
        svc = SearchConfigService()
        assert svc.get_config("asset").normalization_rules == ["case_fold", "trim"]


class TestNormalize:
    def test_case_fold(self) -> None:
        assert normalize("HELLO", ["case_fold"]) == "hello"

    def test_trim(self) -> None:
        assert normalize("  hello  ", ["trim"]) == "hello"

    def test_case_fold_and_trim(self) -> None:
        assert normalize("  HELLO  ", ["case_fold", "trim"]) == "hello"

    def test_empty_rules(self) -> None:
        assert normalize("  HELLO  ", []) == "  HELLO  "

    def test_unknown_rule_ignored(self) -> None:
        assert normalize("hello", ["unknown_rule"]) == "hello"


@pytest.mark.django_db
class TestSearchIndexService:
    @pytest.fixture(autouse=True)
    def _clear_index_cache(self) -> None:
        SearchIndexService.clear_cache()

    def _setup(self) -> tuple[Image, list[FittingPosition]]:
        dt = DrawingType.objects.create(type_name="index-test")
        img = Image.objects.create(
            drawing_type=dt,
            component_name="Index Test Assembly",
            image_binary=b"<svg/>",
            content_hash="idx-hash",
            width_px=800,
            height_px=600,
        )
        fps = [
            FittingPosition.objects.create(
                fitting_position_id="IDX-001",
                image=img,
                x_coordinate="10.000",
                y_coordinate="20.000",
                label_text="IDX-PUMP-01",
            ),
            FittingPosition.objects.create(
                fitting_position_id="IDX-002",
                image=img,
                x_coordinate="30.000",
                y_coordinate="40.000",
                label_text="IDX-VALVE-01",
                is_active=False,
            ),
        ]
        return img, fps

    def test_returns_only_active_positions(self) -> None:
        img, _ = self._setup()
        svc = SearchIndexService()
        rows = svc.get_searchable_fields(img.image_id)
        ids = {r.fitting_position_id for r in rows}
        assert "IDX-001" in ids
        assert "IDX-002" not in ids  # is_active=False excluded

    def test_projection_includes_component_name(self) -> None:
        img, _ = self._setup()
        svc = SearchIndexService()
        rows = svc.get_searchable_fields(img.image_id)
        assert all(r.component_name == "Index Test Assembly" for r in rows)

    def test_projection_includes_label_text(self) -> None:
        img, _ = self._setup()
        svc = SearchIndexService()
        rows = svc.get_searchable_fields(img.image_id)
        labels = {r.label_text for r in rows}
        assert "IDX-PUMP-01" in labels

    def test_empty_image_returns_empty_list(self) -> None:
        dt = DrawingType.objects.create(type_name="empty-test")
        img = Image.objects.create(
            drawing_type=dt,
            component_name="Empty Assembly",
            image_binary=b"<svg/>",
            content_hash="empty-hash",
            width_px=100,
            height_px=100,
        )
        svc = SearchIndexService()
        rows = svc.get_searchable_fields(img.image_id)
        assert rows == []

    def test_cached_on_second_call(self) -> None:
        """get_searchable_fields returns cached results on second call."""
        img, _ = self._setup()
        svc = SearchIndexService()
        rows1 = svc.get_searchable_fields(img.image_id)
        rows2 = svc.get_searchable_fields(img.image_id)
        assert rows1 is rows2  # same object from cache

    def test_invalidate_causes_fresh_query(self) -> None:
        """invalidate() clears a single image's projection."""
        img, _ = self._setup()
        svc = SearchIndexService()
        rows1 = svc.get_searchable_fields(img.image_id)
        svc.invalidate(img.image_id)
        rows2 = svc.get_searchable_fields(img.image_id)
        assert rows1 is not rows2
        assert len(rows2) == len(rows1)

    def test_refresh_pre_populates_cache(self) -> None:
        """refresh() pre-populates the cache for an image."""
        img, _ = self._setup()
        svc = SearchIndexService()
        refreshed = svc.refresh(img.image_id)
        cached = svc.get_searchable_fields(img.image_id)
        assert refreshed is cached


@pytest.mark.django_db
class TestRefreshSearchProjectionCommand:
    @pytest.fixture(autouse=True)
    def _clear_index_cache(self) -> None:
        SearchIndexService.clear_cache()

    def test_refreshes_all_images(self) -> None:
        dt = DrawingType.objects.create(type_name="cmd-test")
        img1 = Image.objects.create(
            drawing_type=dt,
            component_name="Assembly A",
            image_binary=b"<svg/>",
            content_hash="cmd-a",
            width_px=100,
            height_px=100,
        )
        img2 = Image.objects.create(
            drawing_type=dt,
            component_name="Assembly B",
            image_binary=b"<svg/>",
            content_hash="cmd-b",
            width_px=100,
            height_px=100,
        )
        out = StringIO()
        call_command("refresh_search_projection", stdout=out)
        output = out.getvalue()
        assert "Refreshed projections" in output
        # Both images should now be cached
        svc = SearchIndexService()
        assert svc.get_searchable_fields(img1.image_id) is not None
        assert svc.get_searchable_fields(img2.image_id) is not None

    def test_refreshes_single_image(self) -> None:
        dt = DrawingType.objects.create(type_name="cmd-single")
        img = Image.objects.create(
            drawing_type=dt,
            component_name="Single Assembly",
            image_binary=b"<svg/>",
            content_hash="cmd-single",
            width_px=100,
            height_px=100,
        )
        out = StringIO()
        call_command(
            "refresh_search_projection",
            "--image-id",
            str(img.image_id),
            stdout=out,
        )
        output = out.getvalue()
        assert "Refreshed projection for 1 image" in output

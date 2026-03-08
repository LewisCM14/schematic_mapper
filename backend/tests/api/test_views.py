import base64
import hashlib
import json
import uuid
from unittest.mock import patch

import pytest
from django.test import Client

from api.asset_adapter import AssetRecord, AssetResult
from api.models import DrawingType, FittingPosition, Image, ImageUpload


@pytest.mark.django_db
class TestHealthView:
    def test_returns_200(self, client: Client) -> None:
        response = client.get("/api/health")
        assert response.status_code == 200

    def test_response_shape(self, client: Client) -> None:
        response = client.get("/api/health")
        data = response.json()
        assert data["status"] == "ok"
        assert data["database"] == "ok"


@pytest.mark.django_db
class TestListImagesView:
    def test_returns_200(self, client: Client, image: Image) -> None:
        response = client.get("/api/images")
        assert response.status_code == 200

    def test_returns_list(self, client: Client, image: Image) -> None:
        response = client.get("/api/images")
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 1

    def test_response_shape(self, client: Client, image: Image) -> None:
        response = client.get("/api/images")
        item = response.json()[0]
        assert str(image.image_id) == item["image_id"]
        assert item["component_name"] == "Cooling Assembly"
        assert item["drawing_type"]["type_name"] == "composite"
        assert item["width_px"] == 800
        assert item["height_px"] == 600
        assert "image_svg" not in item

    def test_empty_list_when_no_images(self, client: Client) -> None:
        response = client.get("/api/images")
        assert response.json() == []

    def test_filters_by_drawing_type_id(self, client: Client, image: Image) -> None:
        # Create a second drawing type and image that should be excluded
        other_dt = DrawingType.objects.create(type_name="system")
        Image.objects.create(
            drawing_type=other_dt,
            component_name="Other Assembly",
            image_binary=b"<svg/>",
            content_hash="other",
            width_px=800,
            height_px=600,
        )
        response = client.get(
            f"/api/images?drawing_type_id={image.drawing_type.drawing_type_id}"
        )
        data = response.json()
        assert len(data) == 1
        assert data[0]["image_id"] == str(image.image_id)

    def test_returns_400_for_invalid_drawing_type_id(self, client: Client) -> None:
        response = client.get("/api/images?drawing_type_id=notanint")
        assert response.status_code == 400


@pytest.mark.django_db
class TestGetImageView:
    def test_returns_200(self, client: Client, image: Image) -> None:
        response = client.get(f"/api/images/{image.image_id}")
        assert response.status_code == 200

    def test_returns_404_for_unknown_id(self, client: Client) -> None:
        response = client.get("/api/images/00000000-0000-0000-0000-000000000000")
        assert response.status_code == 404

    def test_response_includes_svg(self, client: Client, image: Image) -> None:
        response = client.get(f"/api/images/{image.image_id}")
        data = response.json()
        assert "image_svg" in data
        assert data["image_svg"] == "<svg/>"


@pytest.mark.django_db
class TestListFittingPositionsView:
    def test_returns_200(self, client: Client, image: Image) -> None:
        response = client.get(f"/api/images/{image.image_id}/fitting-positions")
        assert response.status_code == 200

    def test_returns_404_for_unknown_image(self, client: Client) -> None:
        response = client.get(
            "/api/images/00000000-0000-0000-0000-000000000000/fitting-positions"
        )
        assert response.status_code == 404

    def test_returns_list(self, client: Client, image: Image) -> None:
        FittingPosition.objects.create(
            fitting_position_id="FP-TEST-01",
            image=image,
            x_coordinate="100.000",
            y_coordinate="200.000",
            label_text="FP-TEST-01",
        )
        response = client.get(f"/api/images/{image.image_id}/fitting-positions")
        data = response.json()
        assert len(data) == 1
        assert data[0]["fitting_position_id"] == "FP-TEST-01"
        assert data[0]["label_text"] == "FP-TEST-01"

    def test_empty_list_when_no_positions(self, client: Client, image: Image) -> None:
        response = client.get(f"/api/images/{image.image_id}/fitting-positions")
        assert response.json() == []


@pytest.mark.django_db
class TestGetFittingPositionDetailsView:
    def _make_fp(self, image: Image) -> FittingPosition:
        return FittingPosition.objects.create(
            fitting_position_id="FP-PUMP-01-INLET",
            image=image,
            x_coordinate="300.000",
            y_coordinate="250.000",
            label_text="FP-PUMP-01-INLET",
        )

    def test_returns_404_for_unknown_fp(self, client: Client) -> None:
        response = client.get("/api/fitting-positions/DOES-NOT-EXIST/details")
        assert response.status_code == 404

    def test_returns_200_with_asset_found(self, client: Client, image: Image) -> None:
        self._make_fp(image)
        mock_result = AssetResult(
            source_status="ok",
            record=AssetRecord(
                asset_record_id="ASSET-001",
                fitting_position="FP-PUMP-01-INLET",
                high_level_component="Cooling System",
                sub_system_name="Primary Cooling Loop",
                sub_component_name="Inlet Pump Assembly",
            ),
        )
        with patch("api.views.fetch_asset_details", return_value=mock_result):
            response = client.get("/api/fitting-positions/FP-PUMP-01-INLET/details")
        assert response.status_code == 200
        data = response.json()
        assert data["fitting_position_id"] == "FP-PUMP-01-INLET"
        assert data["asset"]["asset_record_id"] == "ASSET-001"
        assert data["asset"]["high_level_component"] == "Cooling System"
        assert data["source_status"]["asset"] == "ok"

    def test_returns_200_with_no_asset_match(
        self, client: Client, image: Image
    ) -> None:
        self._make_fp(image)
        mock_result = AssetResult(source_status="ok", record=None)
        with patch("api.views.fetch_asset_details", return_value=mock_result):
            response = client.get("/api/fitting-positions/FP-PUMP-01-INLET/details")
        assert response.status_code == 200
        data = response.json()
        assert data["asset"] is None
        assert data["source_status"]["asset"] == "ok"

    def test_returns_degraded_when_asset_db_unavailable(
        self, client: Client, image: Image
    ) -> None:
        self._make_fp(image)
        mock_result = AssetResult(source_status="degraded", record=None)
        with patch("api.views.fetch_asset_details", return_value=mock_result):
            response = client.get("/api/fitting-positions/FP-PUMP-01-INLET/details")
        assert response.status_code == 200
        data = response.json()
        assert data["asset"] is None
        assert data["source_status"]["asset"] == "degraded"


# ── Admin upload ──────────────────────────────────────────────────────────────


def _upload_payload(
    drawing_type: DrawingType, key: str = "key-001"
) -> dict[str, object]:
    return {
        "drawing_type_id": drawing_type.drawing_type_id,
        "component_name": "Test Component",
        "file_name": "test.svg",
        "file_size": 100,
        "expected_checksum": "a" * 64,
        "idempotency_key": key,
    }


@pytest.mark.django_db
class TestCreateUploadSessionView:
    def test_creates_session(self, client: Client, drawing_type: DrawingType) -> None:
        response = client.post(
            "/api/admin/uploads",
            data=json.dumps(_upload_payload(drawing_type)),
            content_type="application/json",
        )
        assert response.status_code == 201
        data = response.json()
        assert data["state"] == "initiated"
        assert "upload_id" in data

    def test_idempotent_returns_existing(
        self, client: Client, drawing_type: DrawingType
    ) -> None:
        payload = _upload_payload(drawing_type, key="idem-key")
        client.post(
            "/api/admin/uploads",
            data=json.dumps(payload),
            content_type="application/json",
        )
        response = client.post(
            "/api/admin/uploads",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert response.status_code == 200
        assert ImageUpload.objects.filter(idempotency_key="idem-key").count() == 1

    def test_returns_400_for_missing_fields(self, client: Client) -> None:
        response = client.post(
            "/api/admin/uploads",
            data=json.dumps({}),
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_returns_404_for_unknown_drawing_type(self, client: Client) -> None:
        payload = {
            "drawing_type_id": 9999,
            "component_name": "X",
            "file_name": "x.svg",
            "file_size": 1,
            "expected_checksum": "a" * 64,
            "idempotency_key": "k1",
        }
        response = client.post(
            "/api/admin/uploads",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert response.status_code == 404


@pytest.mark.django_db
class TestUploadChunkView:
    def _create_session(self, drawing_type: DrawingType) -> ImageUpload:
        return ImageUpload.objects.create(
            drawing_type=drawing_type,
            component_name="X",
            file_name="x.svg",
            file_size=6,
            expected_checksum="a" * 64,
            idempotency_key=str(uuid.uuid4()),
        )

    def test_accepts_chunk(self, client: Client, drawing_type: DrawingType) -> None:
        session = self._create_session(drawing_type)
        chunk_b64 = base64.b64encode(b"hello!").decode()
        response = client.put(
            f"/api/admin/uploads/{session.upload_id}/parts/1",
            data=json.dumps({"chunk_data": chunk_b64}),
            content_type="application/json",
        )
        assert response.status_code == 200
        assert response.json()["state"] == "uploading"

    def test_returns_409_when_aborted(
        self, client: Client, drawing_type: DrawingType
    ) -> None:
        session = self._create_session(drawing_type)
        session.state = "aborted"
        session.save()
        chunk_b64 = base64.b64encode(b"x").decode()
        response = client.put(
            f"/api/admin/uploads/{session.upload_id}/parts/1",
            data=json.dumps({"chunk_data": chunk_b64}),
            content_type="application/json",
        )
        assert response.status_code == 409

    def test_returns_400_for_invalid_base64(
        self, client: Client, drawing_type: DrawingType
    ) -> None:
        session = self._create_session(drawing_type)
        response = client.put(
            f"/api/admin/uploads/{session.upload_id}/parts/1",
            data=json.dumps({"chunk_data": "!!!notbase64!!!"}),
            content_type="application/json",
        )
        assert response.status_code == 400


@pytest.mark.django_db
class TestCompleteUploadView:
    def _create_session_with_chunk(
        self, drawing_type: DrawingType, data: bytes
    ) -> ImageUpload:
        checksum = hashlib.sha256(data).hexdigest()
        session = ImageUpload.objects.create(
            drawing_type=drawing_type,
            component_name="Test",
            file_name="test.svg",
            file_size=len(data),
            expected_checksum=checksum,
            idempotency_key=str(uuid.uuid4()),
            state="uploading",
        )
        from api.models import UploadChunk

        UploadChunk.objects.create(upload=session, part_number=1, data=data)
        return session

    def test_completes_successfully(
        self, client: Client, drawing_type: DrawingType
    ) -> None:
        svg = b"<svg/>"
        session = self._create_session_with_chunk(drawing_type, svg)
        response = client.post(
            f"/api/admin/uploads/{session.upload_id}/complete",
            data=json.dumps({"idempotency_key": session.idempotency_key}),
            content_type="application/json",
        )
        assert response.status_code == 201
        data = response.json()
        assert data["state"] == "completed"
        assert "image_id" in data

    def test_returns_422_on_checksum_mismatch(
        self, client: Client, drawing_type: DrawingType
    ) -> None:
        session = ImageUpload.objects.create(
            drawing_type=drawing_type,
            component_name="X",
            file_name="x.svg",
            file_size=6,
            expected_checksum="b" * 64,
            idempotency_key=str(uuid.uuid4()),
            state="uploading",
        )
        from api.models import UploadChunk

        UploadChunk.objects.create(upload=session, part_number=1, data=b"hello!")
        response = client.post(
            f"/api/admin/uploads/{session.upload_id}/complete",
            data=json.dumps({"idempotency_key": session.idempotency_key}),
            content_type="application/json",
        )
        assert response.status_code == 422
        assert response.json()["code"] == "checksum_mismatch"

    def test_idempotent_returns_200_if_already_completed(
        self, client: Client, drawing_type: DrawingType, image: Image
    ) -> None:
        session = ImageUpload.objects.create(
            drawing_type=drawing_type,
            component_name="X",
            file_name="x.svg",
            file_size=6,
            expected_checksum="a" * 64,
            idempotency_key=str(uuid.uuid4()),
            state="completed",
            image=image,
        )
        response = client.post(
            f"/api/admin/uploads/{session.upload_id}/complete",
            data=json.dumps({"idempotency_key": session.idempotency_key}),
            content_type="application/json",
        )
        assert response.status_code == 200


@pytest.mark.django_db
class TestAbortUploadView:
    def test_aborts_session(self, client: Client, drawing_type: DrawingType) -> None:
        session = ImageUpload.objects.create(
            drawing_type=drawing_type,
            component_name="X",
            file_name="x.svg",
            file_size=6,
            expected_checksum="a" * 64,
            idempotency_key=str(uuid.uuid4()),
            state="uploading",
        )
        response = client.delete(f"/api/admin/uploads/{session.upload_id}")
        assert response.status_code == 204
        session.refresh_from_db()
        assert session.state == "aborted"

    def test_returns_409_when_already_completed(
        self, client: Client, drawing_type: DrawingType, image: Image
    ) -> None:
        session = ImageUpload.objects.create(
            drawing_type=drawing_type,
            component_name="X",
            file_name="x.svg",
            file_size=6,
            expected_checksum="a" * 64,
            idempotency_key=str(uuid.uuid4()),
            state="completed",
            image=image,
        )
        response = client.delete(f"/api/admin/uploads/{session.upload_id}")
        assert response.status_code == 409


# ── Admin bulk fitting positions ──────────────────────────────────────────────


@pytest.mark.django_db
class TestBulkFittingPositionsView:
    def test_creates_positions(self, client: Client, image: Image) -> None:
        payload = {
            "image_id": str(image.image_id),
            "fitting_positions": [
                {
                    "fitting_position_id": "FP-BULK-01",
                    "label_text": "FP-BULK-01",
                    "x_coordinate": "100.000",
                    "y_coordinate": "200.000",
                },
            ],
        }
        response = client.post(
            "/api/admin/fitting-positions/bulk",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert response.status_code == 200
        assert response.json()["created"] == 1
        assert FittingPosition.objects.filter(fitting_position_id="FP-BULK-01").exists()

    def test_updates_existing_positions(self, client: Client, image: Image) -> None:
        FittingPosition.objects.create(
            fitting_position_id="FP-BULK-02",
            image=image,
            label_text="old",
            x_coordinate="0.000",
            y_coordinate="0.000",
        )
        payload = {
            "image_id": str(image.image_id),
            "fitting_positions": [
                {
                    "fitting_position_id": "FP-BULK-02",
                    "label_text": "new",
                    "x_coordinate": "50.000",
                    "y_coordinate": "60.000",
                },
            ],
        }
        response = client.post(
            "/api/admin/fitting-positions/bulk",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert response.status_code == 200
        assert response.json()["updated"] == 1
        fp = FittingPosition.objects.get(fitting_position_id="FP-BULK-02")
        assert fp.label_text == "new"

    def test_returns_404_for_unknown_image(self, client: Client) -> None:
        payload = {
            "image_id": str(uuid.uuid4()),
            "fitting_positions": [],
        }
        response = client.post(
            "/api/admin/fitting-positions/bulk",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert response.status_code == 404


# ── Search ────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestSearchView:
    def _make_fp(
        self, image: Image, fp_id: str = "FP-PUMP-01", label: str = "PUMP-01-INLET"
    ) -> FittingPosition:
        return FittingPosition.objects.create(
            fitting_position_id=fp_id,
            image=image,
            x_coordinate="300.000",
            y_coordinate="250.000",
            label_text=label,
        )

    def test_returns_400_when_image_id_missing(self, client: Client) -> None:
        response = client.get("/api/search?query=pump")
        assert response.status_code == 400
        assert response.json()["code"] == "search_image_required"

    def test_returns_400_when_query_too_short(
        self, client: Client, image: Image
    ) -> None:
        response = client.get(f"/api/search?query=p&image_id={image.image_id}")
        assert response.status_code == 400
        assert response.json()["code"] == "query_too_short"

    def test_returns_404_for_unknown_image(self, client: Client) -> None:
        response = client.get(f"/api/search?query=pump&image_id={uuid.uuid4()}")
        assert response.status_code == 404

    def test_returns_results_for_internal_label_match(
        self, client: Client, image: Image
    ) -> None:
        self._make_fp(image)
        response = client.get(
            f"/api/search?query=pump&image_id={image.image_id}&sources=internal"
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) == 1
        assert data["results"][0]["fitting_position_id"] == "FP-PUMP-01"
        assert data["results"][0]["matched_source"] == "internal"
        assert data["results"][0]["matched_field"] == "label_text"
        assert data["source_status"]["internal"] == "ok"

    def test_returns_empty_when_no_match(self, client: Client, image: Image) -> None:
        self._make_fp(image)
        response = client.get(
            f"/api/search?query=zzznomatch&image_id={image.image_id}&sources=internal"
        )
        assert response.status_code == 200
        assert response.json()["results"] == []

    def test_asset_source_degraded_still_returns_internal_results(
        self, client: Client, image: Image
    ) -> None:
        self._make_fp(image)
        with patch("api.search_service.search_assets") as mock_search_assets:
            from api.asset_adapter import AssetSearchResult

            mock_search_assets.return_value = AssetSearchResult(
                source_status="degraded"
            )
            response = client.get(
                f"/api/search?query=pump&image_id={image.image_id}&sources=internal,asset"
            )
        assert response.status_code == 200
        data = response.json()
        assert data["source_status"]["internal"] == "ok"
        assert len(data["results"]) >= 1

    def test_cursor_pagination(self, client: Client, image: Image) -> None:
        for i in range(5):
            FittingPosition.objects.create(
                fitting_position_id=f"FP-PAGE-{i:02d}",
                image=image,
                x_coordinate="10.000",
                y_coordinate="10.000",
                label_text=f"pump-{i:02d}",
            )
        r1 = client.get(
            f"/api/search?query=pump&image_id={image.image_id}&sources=internal&limit=3"
        )
        d1 = r1.json()
        assert len(d1["results"]) == 3
        assert d1["has_more"] is True
        assert d1["next_cursor"] is not None

        r2 = client.get(
            f"/api/search?query=pump&image_id={image.image_id}&sources=internal&limit=3&cursor={d1['next_cursor']}"
        )
        d2 = r2.json()
        assert len(d2["results"]) == 2
        assert d2["has_more"] is False
        assert d2["next_cursor"] is None

    def test_returns_400_for_unknown_source(
        self, client: Client, image: Image
    ) -> None:
        self._make_fp(image)
        response = client.get(
            f"/api/search?query=pump&image_id={image.image_id}&sources=unknown"
        )
        assert response.status_code == 400
        assert response.json()["code"] == "search_invalid_source"

    def test_returns_400_for_mixed_valid_and_invalid_source(
        self, client: Client, image: Image
    ) -> None:
        self._make_fp(image)
        response = client.get(
            f"/api/search?query=pump&image_id={image.image_id}&sources=internal,unknown"
        )
        assert response.status_code == 400
        assert response.json()["code"] == "search_invalid_source"

    def test_valid_sources_pass_through(
        self, client: Client, image: Image
    ) -> None:
        self._make_fp(image)
        response = client.get(
            f"/api/search?query=pump&image_id={image.image_id}&sources=internal"
        )
        assert response.status_code == 200

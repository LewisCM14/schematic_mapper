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
class TestRequestIdMiddleware:
    def test_generated_request_id_in_response(self, client: Client) -> None:
        response = client.get("/api/health")
        assert "X-Request-ID" in response
        value = response["X-Request-ID"]
        # Must be a valid UUID
        uuid.UUID(value)

    def test_supplied_request_id_echoed(self, client: Client) -> None:
        fixed_id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        response = client.get("/api/health", HTTP_X_REQUEST_ID=fixed_id)
        assert response["X-Request-ID"] == fixed_id

    def test_api_logger_captures_request_id(self, client: Client) -> None:
        import logging

        fixed_id = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
        logger = logging.getLogger("api")
        captured: list[str] = []

        class _Capture(logging.Handler):
            def emit(self, record: logging.LogRecord) -> None:
                captured.append(getattr(record, "request_id", ""))

        handler = _Capture()
        logger.addHandler(handler)
        try:
            # Simulate what middleware does
            from config import log_filters

            log_filters.set_request_id(fixed_id)
            logger.debug("test message")
            log_filters.clear_request_id()
        finally:
            logger.removeHandler(handler)

        assert captured and captured[0] == fixed_id


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
class TestListDrawingTypesView:
    def test_returns_200(self, client: Client, drawing_type: DrawingType) -> None:
        response = client.get("/api/drawing-types")
        assert response.status_code == 200

    def test_returns_seeded_types(self, client: Client, drawing_type: DrawingType) -> None:
        DrawingType.objects.create(type_name="system")
        response = client.get("/api/drawing-types")
        data = response.json()
        names = [dt["type_name"] for dt in data]
        assert "composite" in names
        assert "system" in names

    def test_types_with_no_images_still_appear(self, client: Client) -> None:
        DrawingType.objects.create(type_name="standalone")
        response = client.get("/api/drawing-types")
        data = response.json()
        names = [dt["type_name"] for dt in data]
        assert "standalone" in names

    def test_inactive_types_excluded(self, client: Client) -> None:
        DrawingType.objects.create(type_name="active_type")
        DrawingType.objects.create(type_name="inactive_type", is_active=False)
        response = client.get("/api/drawing-types")
        data = response.json()
        names = [dt["type_name"] for dt in data]
        assert "active_type" in names
        assert "inactive_type" not in names

    def test_response_shape(self, client: Client, drawing_type: DrawingType) -> None:
        response = client.get("/api/drawing-types")
        data = response.json()
        assert isinstance(data, list)
        item = data[0]
        assert "drawing_type_id" in item
        assert "type_name" in item
        assert "description" in item
        assert "is_active" in item

    def test_ordered_by_type_name(self, client: Client) -> None:
        DrawingType.objects.create(type_name="z-type")
        DrawingType.objects.create(type_name="a-type")
        response = client.get("/api/drawing-types")
        data = response.json()
        names = [dt["type_name"] for dt in data]
        assert names == sorted(names)


@pytest.mark.django_db
class TestListImagesView:
    def test_returns_200(self, client: Client, image: Image) -> None:
        response = client.get("/api/images")
        assert response.status_code == 200

    def test_returns_paginated_shape(self, client: Client, image: Image) -> None:
        response = client.get("/api/images")
        data = response.json()
        assert "results" in data
        assert "has_more" in data
        assert "next_cursor" in data

    def test_results_list(self, client: Client, image: Image) -> None:
        response = client.get("/api/images")
        data = response.json()
        assert isinstance(data["results"], list)
        assert len(data["results"]) == 1

    def test_response_shape(self, client: Client, image: Image) -> None:
        response = client.get("/api/images")
        item = response.json()["results"][0]
        assert str(image.image_id) == item["image_id"]
        assert item["component_name"] == "Cooling Assembly"
        assert item["drawing_type"]["type_name"] == "composite"
        assert item["width_px"] == 800
        assert item["height_px"] == 600
        assert "image_svg" not in item
        assert "thumbnail_url" in item
        assert item["thumbnail_url"] is None

    def test_empty_list_when_no_images(self, client: Client) -> None:
        response = client.get("/api/images")
        data = response.json()
        assert data["results"] == []
        assert data["has_more"] is False
        assert data["next_cursor"] is None

    def test_first_page_no_cursor(self, client: Client, image: Image) -> None:
        response = client.get("/api/images?limit=1")
        data = response.json()
        assert len(data["results"]) == 1
        assert data["has_more"] is False  # only 1 image total
        assert data["next_cursor"] is None

    def test_cursor_pagination(self, client: Client, image: Image) -> None:
        # Create a second image so we can paginate
        other_dt = DrawingType.objects.create(type_name="system")
        Image.objects.create(
            drawing_type=other_dt,
            component_name="Second Assembly",
            image_binary=b"<svg/>",
            content_hash="xyz",
            width_px=800,
            height_px=600,
        )
        response = client.get("/api/images?limit=1")
        data = response.json()
        assert len(data["results"]) == 1
        assert data["has_more"] is True
        assert data["next_cursor"] is not None
        # Fetch second page
        response2 = client.get(f"/api/images?limit=1&cursor={data['next_cursor']}")
        data2 = response2.json()
        assert len(data2["results"]) == 1
        assert data2["has_more"] is False

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
        assert len(data["results"]) == 1
        assert data["results"][0]["image_id"] == str(image.image_id)

    def test_returns_400_for_invalid_drawing_type_id(self, client: Client) -> None:
        response = client.get("/api/images?drawing_type_id=notanint")
        assert response.status_code == 400

    def test_filters_by_search(self, client: Client, image: Image) -> None:
        Image.objects.create(
            drawing_type=image.drawing_type,
            component_name="Valve Block Unit",
            image_binary=b"<svg/>",
            content_hash="valve",
            width_px=800,
            height_px=600,
        )
        response = client.get("/api/images?search=cooling")
        data = response.json()
        names = [r["component_name"] for r in data["results"]]
        assert "Cooling Assembly" in names
        assert "Valve Block Unit" not in names

    def test_empty_search_returns_all(self, client: Client, image: Image) -> None:
        Image.objects.create(
            drawing_type=image.drawing_type,
            component_name="Valve Block Unit",
            image_binary=b"<svg/>",
            content_hash="valve2",
            width_px=800,
            height_px=600,
        )
        response = client.get("/api/images?search=")
        data = response.json()
        assert len(data["results"]) == 2


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

    def test_returns_400_for_file_too_large(
        self, client: Client, drawing_type: DrawingType
    ) -> None:
        payload = _upload_payload(drawing_type, key="large-key")
        payload["file_size"] = 50 * 1024 * 1024 + 1  # 1 byte over limit
        response = client.post(
            "/api/admin/uploads",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_returns_429_when_concurrent_limit_reached(
        self, client: Client, drawing_type: DrawingType
    ) -> None:
        # Create MAX_CONCURRENT_UPLOADS active sessions
        for i in range(3):
            ImageUpload.objects.create(
                drawing_type=drawing_type,
                component_name=f"Session {i}",
                file_name=f"s{i}.svg",
                file_size=100,
                expected_checksum="a" * 64,
                idempotency_key=f"concurrent-{i}",
                state="initiated",
            )

        # The next one should be rejected
        payload = _upload_payload(drawing_type, key="concurrent-overflow")
        response = client.post(
            "/api/admin/uploads",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert response.status_code == 429
        assert response.json()["code"] == "upload_limit_reached"

    def test_completing_session_frees_slot(
        self, client: Client, drawing_type: DrawingType
    ) -> None:
        sessions = []
        for i in range(3):
            sessions.append(
                ImageUpload.objects.create(
                    drawing_type=drawing_type,
                    component_name=f"Session {i}",
                    file_name=f"s{i}.svg",
                    file_size=100,
                    expected_checksum="a" * 64,
                    idempotency_key=f"free-slot-{i}",
                    state="initiated",
                )
            )

        # Complete one session to free a slot
        sessions[0].state = "completed"
        sessions[0].save(update_fields=["state"])

        payload = _upload_payload(drawing_type, key="free-slot-new")
        response = client.post(
            "/api/admin/uploads",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert response.status_code == 201

    def test_aborting_session_frees_slot(
        self, client: Client, drawing_type: DrawingType
    ) -> None:
        sessions = []
        for i in range(3):
            sessions.append(
                ImageUpload.objects.create(
                    drawing_type=drawing_type,
                    component_name=f"Session {i}",
                    file_name=f"s{i}.svg",
                    file_size=100,
                    expected_checksum="a" * 64,
                    idempotency_key=f"abort-slot-{i}",
                    state="uploading",
                )
            )

        # Abort one session to free a slot
        sessions[0].state = "aborted"
        sessions[0].save(update_fields=["state"])

        payload = _upload_payload(drawing_type, key="abort-slot-new")
        response = client.post(
            "/api/admin/uploads",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert response.status_code == 201


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

    def test_chunk_retry_updates_without_creating_duplicate(
        self, client: Client, drawing_type: DrawingType
    ) -> None:
        from api.models import UploadChunk

        session = self._create_session(drawing_type)
        chunk_b64_first = base64.b64encode(b"hello!").decode()
        chunk_b64_second = base64.b64encode(b"world!").decode()
        # First PUT
        client.put(
            f"/api/admin/uploads/{session.upload_id}/parts/1",
            data=json.dumps({"chunk_data": chunk_b64_first}),
            content_type="application/json",
        )
        # Retry same part_number with different data
        client.put(
            f"/api/admin/uploads/{session.upload_id}/parts/1",
            data=json.dumps({"chunk_data": chunk_b64_second}),
            content_type="application/json",
        )
        # Must still be exactly one chunk row
        assert UploadChunk.objects.filter(upload=session).count() == 1
        # Data must reflect the latest retry
        chunk = UploadChunk.objects.get(upload=session, part_number=1)
        assert bytes(chunk.data) == b"world!"

    def test_upload_resume_flow(
        self, client: Client, drawing_type: DrawingType
    ) -> None:
        """Upload parts 1 and 2, verify via GET, upload part 3, then complete."""
        svg_part1 = b"<svg "
        svg_part2 = b'xmlns="'
        svg_part3 = b'http://www.w3.org/2000/svg"/>'
        full_svg = svg_part1 + svg_part2 + svg_part3
        checksum = hashlib.sha256(full_svg).hexdigest()

        session = ImageUpload.objects.create(
            drawing_type=drawing_type,
            component_name="Resume",
            file_name="resume.svg",
            file_size=len(full_svg),
            expected_checksum=checksum,
            idempotency_key=str(uuid.uuid4()),
        )
        upload_id = session.upload_id

        # Upload part 1
        client.put(
            f"/api/admin/uploads/{upload_id}/parts/1",
            data=json.dumps({"chunk_data": base64.b64encode(svg_part1).decode()}),
            content_type="application/json",
        )
        # Upload part 2
        client.put(
            f"/api/admin/uploads/{upload_id}/parts/2",
            data=json.dumps({"chunk_data": base64.b64encode(svg_part2).decode()}),
            content_type="application/json",
        )

        # GET session to verify received_parts
        get_resp = client.get(f"/api/admin/uploads/{upload_id}")
        assert get_resp.status_code == 200
        assert get_resp.json()["received_parts"] == [1, 2]

        # Upload part 3
        client.put(
            f"/api/admin/uploads/{upload_id}/parts/3",
            data=json.dumps({"chunk_data": base64.b64encode(svg_part3).decode()}),
            content_type="application/json",
        )

        # Complete
        resp = client.post(
            f"/api/admin/uploads/{upload_id}/complete",
            data=json.dumps({"idempotency_key": session.idempotency_key}),
            content_type="application/json",
        )
        assert resp.status_code == 201
        assert resp.json()["state"] == "completed"


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
        session.refresh_from_db()
        assert session.state == "failed"

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

    def test_returns_422_for_unsupported_file_type(
        self, client: Client, drawing_type: DrawingType
    ) -> None:
        # Upload non-SVG content (plain text)
        data = b"This is just plain text, not SVG"
        session = self._create_session_with_chunk(drawing_type, data)
        response = client.post(
            f"/api/admin/uploads/{session.upload_id}/complete",
            data=json.dumps({"idempotency_key": session.idempotency_key}),
            content_type="application/json",
        )
        assert response.status_code == 422
        assert response.json()["code"] == "unsupported_file_type"
        session.refresh_from_db()
        assert session.state == "failed"

    def test_accepts_valid_svg_content(
        self, client: Client, drawing_type: DrawingType
    ) -> None:
        svg = b'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"/>'
        session = self._create_session_with_chunk(drawing_type, svg)
        response = client.post(
            f"/api/admin/uploads/{session.upload_id}/complete",
            data=json.dumps({"idempotency_key": session.idempotency_key}),
            content_type="application/json",
        )
        assert response.status_code == 201
        assert response.json()["state"] == "completed"

    def test_extracts_dimensions_from_viewbox(
        self, client: Client, drawing_type: DrawingType
    ) -> None:
        svg = b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900"></svg>'
        session = self._create_session_with_chunk(drawing_type, svg)
        response = client.post(
            f"/api/admin/uploads/{session.upload_id}/complete",
            data=json.dumps({"idempotency_key": session.idempotency_key}),
            content_type="application/json",
        )
        assert response.status_code == 201
        image_id = response.json()["image_id"]
        img = Image.objects.get(pk=image_id)
        assert img.width_px == 1200
        assert img.height_px == 900

    def test_extracts_dimensions_from_width_height_attrs(
        self, client: Client, drawing_type: DrawingType
    ) -> None:
        svg = b'<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"></svg>'
        session = self._create_session_with_chunk(drawing_type, svg)
        response = client.post(
            f"/api/admin/uploads/{session.upload_id}/complete",
            data=json.dumps({"idempotency_key": session.idempotency_key}),
            content_type="application/json",
        )
        assert response.status_code == 201
        image_id = response.json()["image_id"]
        img = Image.objects.get(pk=image_id)
        assert img.width_px == 640
        assert img.height_px == 480

    def test_falls_back_to_default_dimensions(
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
        image_id = response.json()["image_id"]
        img = Image.objects.get(pk=image_id)
        assert img.width_px == 800
        assert img.height_px == 600

    def test_generates_thumbnail_on_complete(
        self, client: Client, drawing_type: DrawingType
    ) -> None:
        svg = b'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="green"/></svg>'
        session = self._create_session_with_chunk(drawing_type, svg)
        response = client.post(
            f"/api/admin/uploads/{session.upload_id}/complete",
            data=json.dumps({"idempotency_key": session.idempotency_key}),
            content_type="application/json",
        )
        assert response.status_code == 201
        img = Image.objects.get(pk=response.json()["image_id"])
        assert img.thumbnail is not None


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

    def test_aborted_upload_cannot_be_finalized(
        self, client: Client, drawing_type: DrawingType
    ) -> None:
        session = ImageUpload.objects.create(
            drawing_type=drawing_type,
            component_name="X",
            file_name="x.svg",
            file_size=6,
            expected_checksum="a" * 64,
            idempotency_key=str(uuid.uuid4()),
            state="uploading",
        )
        # Abort the upload
        abort_response = client.delete(f"/api/admin/uploads/{session.upload_id}")
        assert abort_response.status_code == 204
        # Attempt to finalize — must be rejected
        complete_response = client.post(
            f"/api/admin/uploads/{session.upload_id}/complete",
            data=json.dumps({"idempotency_key": session.idempotency_key}),
            content_type="application/json",
        )
        assert complete_response.status_code == 409


@pytest.mark.django_db
class TestGetUploadSessionView:
    def test_returns_session_with_received_parts(
        self, client: Client, drawing_type: DrawingType
    ) -> None:
        session = ImageUpload.objects.create(
            drawing_type=drawing_type,
            component_name="Test",
            file_name="test.svg",
            file_size=100,
            expected_checksum="a" * 64,
            idempotency_key=str(uuid.uuid4()),
            state="uploading",
        )
        from api.models import UploadChunk

        UploadChunk.objects.create(upload=session, part_number=1, data=b"aaa")
        UploadChunk.objects.create(upload=session, part_number=3, data=b"ccc")

        response = client.get(f"/api/admin/uploads/{session.upload_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["upload_id"] == str(session.upload_id)
        assert data["state"] == "uploading"
        assert data["file_size"] == 100
        assert data["received_parts"] == [1, 3]

    def test_returns_404_for_unknown_upload(self, client: Client) -> None:
        response = client.get(
            f"/api/admin/uploads/{uuid.uuid4()}"
        )
        assert response.status_code == 404


# ── Admin single-request image upload ─────────────────────────────────────────


@pytest.mark.django_db
class TestAdminUploadImageView:
    def _svg_payload(
        self,
        drawing_type: DrawingType,
        svg: bytes = b'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"/>',
    ) -> dict[str, object]:
        encoded = base64.b64encode(svg).decode()
        checksum = hashlib.sha256(svg).hexdigest()
        return {
            "drawing_type_id": drawing_type.drawing_type_id,
            "component_name": "Test Component",
            "file_name": "test.svg",
            "image_data": encoded,
            "expected_checksum": checksum,
        }

    def test_valid_svg_upload_returns_201(
        self, client: Client, drawing_type: DrawingType
    ) -> None:
        payload = self._svg_payload(drawing_type)
        response = client.post(
            "/api/admin/images",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert response.status_code == 201
        data = response.json()
        assert "image_id" in data
        assert data["component_name"] == "Test Component"
        assert data["drawing_type"]["type_name"] == "composite"
        # Verify image was persisted
        assert Image.objects.filter(pk=data["image_id"]).exists()

    def test_checksum_mismatch_returns_422(
        self, client: Client, drawing_type: DrawingType
    ) -> None:
        payload = self._svg_payload(drawing_type)
        payload["expected_checksum"] = "a" * 64
        response = client.post(
            "/api/admin/images",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert response.status_code == 422
        assert response.json()["code"] == "checksum_mismatch"

    def test_file_too_large_returns_400(
        self, client: Client, drawing_type: DrawingType
    ) -> None:
        # Create content just over the 50MB limit
        from unittest.mock import patch

        svg = b"<svg/>"
        encoded = base64.b64encode(svg).decode()
        checksum = hashlib.sha256(svg).hexdigest()
        payload = {
            "drawing_type_id": drawing_type.drawing_type_id,
            "component_name": "Too Large",
            "file_name": "big.svg",
            "image_data": encoded,
            "expected_checksum": checksum,
        }
        with patch("api.views.MAX_UPLOAD_SIZE_BYTES", 2):
            response = client.post(
                "/api/admin/images",
                data=json.dumps(payload),
                content_type="application/json",
            )
        assert response.status_code == 400
        assert response.json()["code"] == "file_too_large"

    def test_non_svg_content_returns_422(
        self, client: Client, drawing_type: DrawingType
    ) -> None:
        plain_text = b"This is not SVG content at all"
        encoded = base64.b64encode(plain_text).decode()
        checksum = hashlib.sha256(plain_text).hexdigest()
        payload = {
            "drawing_type_id": drawing_type.drawing_type_id,
            "component_name": "Not SVG",
            "file_name": "readme.txt",
            "image_data": encoded,
            "expected_checksum": checksum,
        }
        response = client.post(
            "/api/admin/images",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert response.status_code == 422
        assert response.json()["code"] == "unsupported_file_type"

    def test_extracts_svg_dimensions(
        self, client: Client, drawing_type: DrawingType
    ) -> None:
        svg = b'<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"></svg>'
        payload = self._svg_payload(drawing_type, svg)
        response = client.post(
            "/api/admin/images",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert response.status_code == 201
        img = Image.objects.get(pk=response.json()["image_id"])
        assert img.width_px == 640
        assert img.height_px == 480

    def test_generates_thumbnail_for_svg(
        self, client: Client, drawing_type: DrawingType
    ) -> None:
        svg = b'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="red"/></svg>'
        payload = self._svg_payload(drawing_type, svg)
        response = client.post(
            "/api/admin/images",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert response.status_code == 201
        img = Image.objects.get(pk=response.json()["image_id"])
        assert img.thumbnail is not None

    def test_serializer_returns_data_uri_for_thumbnail(
        self, client: Client, drawing_type: DrawingType
    ) -> None:
        svg = b'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="blue"/></svg>'
        payload = self._svg_payload(drawing_type, svg)
        client.post(
            "/api/admin/images",
            data=json.dumps(payload),
            content_type="application/json",
        )
        response = client.get("/api/images")
        results = response.json()["results"]
        assert len(results) >= 1
        thumb = results[0]["thumbnail_url"]
        assert thumb is not None
        assert thumb.startswith("data:image/png;base64,")


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

    def test_returns_400_for_duplicate_fitting_position_ids(
        self, client: Client, image: Image
    ) -> None:
        payload = {
            "image_id": str(image.image_id),
            "fitting_positions": [
                {
                    "fitting_position_id": "FP-DUP-01",
                    "label_text": "first",
                    "x_coordinate": "10.000",
                    "y_coordinate": "20.000",
                },
                {
                    "fitting_position_id": "FP-DUP-01",
                    "label_text": "duplicate",
                    "x_coordinate": "30.000",
                    "y_coordinate": "40.000",
                },
            ],
        }
        response = client.post(
            "/api/admin/fitting-positions/bulk",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert response.status_code == 400
        assert response.json()["code"] == "bulk_duplicate_ids"

    def test_unique_ids_succeed_as_before(self, client: Client, image: Image) -> None:
        payload = {
            "image_id": str(image.image_id),
            "fitting_positions": [
                {
                    "fitting_position_id": "FP-UNIQ-01",
                    "label_text": "first",
                    "x_coordinate": "10.000",
                    "y_coordinate": "20.000",
                },
                {
                    "fitting_position_id": "FP-UNIQ-02",
                    "label_text": "second",
                    "x_coordinate": "30.000",
                    "y_coordinate": "40.000",
                },
            ],
        }
        response = client.post(
            "/api/admin/fitting-positions/bulk",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert response.status_code == 200
        assert response.json()["created"] == 2


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

    def test_returns_400_for_unknown_source(self, client: Client, image: Image) -> None:
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

    def test_valid_sources_pass_through(self, client: Client, image: Image) -> None:
        self._make_fp(image)
        response = client.get(
            f"/api/search?query=pump&image_id={image.image_id}&sources=internal"
        )
        assert response.status_code == 200

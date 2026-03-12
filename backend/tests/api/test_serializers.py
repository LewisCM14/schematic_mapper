import uuid

import pytest

from api.models import DrawingType, FittingPosition, Image, ImageUpload
from api.serializers import (
    BulkFittingPositionItemSerializer,
    FittingPositionSerializer,
    ImageSerializer,
    UploadSessionSerializer,
)


@pytest.mark.django_db
class TestImageSerializer:
    def test_serializes_correct_fields(self, image: Image) -> None:
        data = ImageSerializer(image).data
        assert str(image.image_id) == data["image_id"]
        assert data["component_name"] == "Cooling Assembly"
        assert data["width_px"] == 800
        assert data["height_px"] == 600
        assert "uploaded_at" in data
        assert "drawing_type" in data

    def test_includes_thumbnail_url(self, image: Image) -> None:
        data = ImageSerializer(image).data
        assert "thumbnail_url" in data
        assert data["thumbnail_url"] is None

    def test_drawing_type_nested_shape(self, image: Image) -> None:
        data = ImageSerializer(image).data
        dt = data["drawing_type"]
        assert dt["type_name"] == "composite"
        assert dt["is_active"] is True

    def test_image_svg_not_in_list_serializer(self, image: Image) -> None:
        data = ImageSerializer(image).data
        assert "image_svg" not in data

    def test_read_only_fields_not_writable(self, image: Image) -> None:
        # image_id is a read-only UUID — value comes from the instance, not input data
        data = ImageSerializer(image).data
        assert data["image_id"] == str(image.image_id)


@pytest.mark.django_db
class TestFittingPositionSerializer:
    def test_serializes_coordinates_as_numbers(self, image: Image) -> None:
        fp = FittingPosition.objects.create(
            fitting_position_id="FP-SER-01",
            image=image,
            x_coordinate="123.456",
            y_coordinate="78.900",
            label_text="FP-SER-01",
        )
        data = FittingPositionSerializer(fp).data
        # DRF DecimalField returns string by default; coerce for assertion
        assert float(data["x_coordinate"]) == pytest.approx(123.456)
        assert float(data["y_coordinate"]) == pytest.approx(78.9)

    def test_fitting_position_id_is_string(self, image: Image) -> None:
        fp = FittingPosition.objects.create(
            fitting_position_id="FP-SER-02",
            image=image,
            x_coordinate="10.000",
            y_coordinate="20.000",
            label_text="FP-SER-02",
        )
        data = FittingPositionSerializer(fp).data
        assert isinstance(data["fitting_position_id"], str)
        assert data["fitting_position_id"] == "FP-SER-02"

    def test_serializes_all_required_fields(self, image: Image) -> None:
        fp = FittingPosition.objects.create(
            fitting_position_id="FP-SER-03",
            image=image,
            x_coordinate="5.000",
            y_coordinate="10.000",
            label_text="FP-SER-03",
        )
        data = FittingPositionSerializer(fp).data
        for field in (
            "fitting_position_id",
            "x_coordinate",
            "y_coordinate",
            "label_text",
            "is_active",
        ):
            assert field in data


@pytest.mark.django_db
class TestImageUploadSerializer:
    def _make_session(self, drawing_type: DrawingType, **kwargs: object) -> ImageUpload:
        defaults: dict[str, object] = {
            "component_name": "Assembly",
            "file_name": "test.svg",
            "file_size": 1024,
            "expected_checksum": "abc123",
            "idempotency_key": f"key-{uuid.uuid4()}",
        }
        defaults.update(kwargs)
        return ImageUpload.objects.create(drawing_type=drawing_type, **defaults)

    def test_status_serializes_as_string(self, drawing_type: DrawingType) -> None:
        session = self._make_session(drawing_type)
        data = UploadSessionSerializer(session).data
        assert data["state"] == "initiated"
        assert isinstance(data["state"], str)

    def test_uploader_identity_is_null_when_not_set(
        self, drawing_type: DrawingType
    ) -> None:
        session = self._make_session(drawing_type, uploader_identity=None)
        data = UploadSessionSerializer(session).data
        assert data["uploader_identity"] is None

    def test_uploader_identity_serializes_string_value(
        self, drawing_type: DrawingType
    ) -> None:
        session = self._make_session(
            drawing_type, uploader_identity="admin@example.com"
        )
        data = UploadSessionSerializer(session).data
        assert data["uploader_identity"] == "admin@example.com"

    def test_serializes_required_fields(self, drawing_type: DrawingType) -> None:
        session = self._make_session(drawing_type)
        data = UploadSessionSerializer(session).data
        for field in (
            "upload_id",
            "state",
            "file_name",
            "error_message",
            "uploader_identity",
        ):
            assert field in data


@pytest.mark.django_db
class TestBulkFittingPositionItemSerializer:
    def test_valid_payload_passes(self) -> None:
        serializer = BulkFittingPositionItemSerializer(
            data={
                "fitting_position_id": "FP-001",
                "label_text": "PUMP-01-INLET",
                "x_coordinate": "100.500",
                "y_coordinate": "200.250",
                "width": "10.000",
                "height": "20.000",
            }
        )
        assert serializer.is_valid()

    def test_missing_fitting_position_id_raises_error(self) -> None:
        serializer = BulkFittingPositionItemSerializer(
            data={
                "label_text": "PUMP-01-INLET",
                "x_coordinate": "100.500",
                "y_coordinate": "200.250",
                "width": "10.000",
                "height": "20.000",
            }
        )
        assert not serializer.is_valid()
        assert "fitting_position_id" in serializer.errors

    def test_invalid_coordinate_raises_error(self) -> None:
        serializer = BulkFittingPositionItemSerializer(
            data={
                "fitting_position_id": "FP-001",
                "label_text": "PUMP-01-INLET",
                "x_coordinate": "not-a-number",
                "y_coordinate": "200.250",
                "width": "10.000",
                "height": "20.000",
            }
        )
        assert not serializer.is_valid()
        assert "x_coordinate" in serializer.errors

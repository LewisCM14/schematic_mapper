import pytest
from django.db.utils import IntegrityError

from api.models import DrawingType, FittingPosition, Image, ImageUpload


@pytest.mark.django_db
class TestDrawingTypeModel:
    def test_create(self) -> None:
        dt = DrawingType.objects.create(type_name="composite")
        assert dt.drawing_type_id is not None
        assert dt.type_name == "composite"
        assert dt.is_active is True

    def test_type_name_unique(self) -> None:
        DrawingType.objects.create(type_name="system")
        with pytest.raises(IntegrityError):
            DrawingType.objects.create(type_name="system")

    def test_str(self) -> None:
        dt = DrawingType.objects.create(type_name="composite")
        assert str(dt) == "composite"


@pytest.mark.django_db
class TestImageModel:
    def test_create(self, drawing_type: DrawingType) -> None:
        image = Image.objects.create(
            drawing_type=drawing_type,
            component_name="Cooling Assembly",
            image_binary=b"<svg/>",
            content_hash="abc123",
            width_px=800,
            height_px=600,
        )
        assert image.image_id is not None
        assert image.component_name == "Cooling Assembly"
        assert image.drawing_type == drawing_type

    def test_str(self, drawing_type: DrawingType) -> None:
        image = Image.objects.create(
            drawing_type=drawing_type,
            component_name="Cooling Assembly",
            image_binary=b"<svg/>",
            content_hash="abc123",
            width_px=800,
            height_px=600,
        )
        assert "Cooling Assembly" in str(image)


@pytest.mark.django_db
class TestFittingPositionModel:
    def test_create(self, image: Image) -> None:
        fp = FittingPosition.objects.create(
            fitting_position_id="FP-001",
            image=image,
            x_coordinate="100.500",
            y_coordinate="200.250",
            label_text="PUMP-01-INLET",
        )
        assert fp.fitting_position_id == "FP-001"
        assert fp.label_text == "PUMP-01-INLET"
        assert fp.is_active is True

    def test_str(self, image: Image) -> None:
        fp = FittingPosition.objects.create(
            fitting_position_id="FP-002",
            image=image,
            x_coordinate="50.000",
            y_coordinate="75.000",
            label_text="VALVE-01-A",
        )
        assert str(fp) == "VALVE-01-A"

    def test_label_text_unique_per_image(self, image: Image) -> None:
        FittingPosition.objects.create(
            fitting_position_id="FP-003",
            image=image,
            x_coordinate="10.000",
            y_coordinate="20.000",
            label_text="SENSOR-01",
        )
        with pytest.raises(IntegrityError):
            FittingPosition.objects.create(
                fitting_position_id="FP-004",
                image=image,
                x_coordinate="30.000",
                y_coordinate="40.000",
                label_text="SENSOR-01",
            )

    def test_same_label_text_allowed_on_different_images(
        self, drawing_type: DrawingType, image: Image
    ) -> None:
        second_image = Image.objects.create(
            drawing_type=drawing_type,
            component_name="Other Assembly",
            image_binary=b"<svg/>",
            content_hash="def456",
            width_px=800,
            height_px=600,
        )
        FittingPosition.objects.create(
            fitting_position_id="FP-005",
            image=image,
            x_coordinate="10.000",
            y_coordinate="20.000",
            label_text="SHARED-LABEL",
        )
        fp2 = FittingPosition.objects.create(
            fitting_position_id="FP-006",
            image=second_image,
            x_coordinate="10.000",
            y_coordinate="20.000",
            label_text="SHARED-LABEL",
        )
        assert fp2.fitting_position_id == "FP-006"


@pytest.mark.django_db
class TestImageUploadModel:
    def _make_session(self, drawing_type: DrawingType, **kwargs: object) -> ImageUpload:
        defaults = {
            "component_name": "Assembly",
            "file_name": "test.svg",
            "file_size": 1024,
            "expected_checksum": "abc123",
            "idempotency_key": "key-001",
        }
        defaults.update(kwargs)
        return ImageUpload.objects.create(drawing_type=drawing_type, **defaults)

    def test_uploader_identity_is_nullable(self, drawing_type: DrawingType) -> None:
        session = self._make_session(drawing_type, uploader_identity=None)
        session.refresh_from_db()
        assert session.uploader_identity is None

    def test_uploader_identity_stores_string(self, drawing_type: DrawingType) -> None:
        session = self._make_session(
            drawing_type, uploader_identity="admin@example.com"
        )
        session.refresh_from_db()
        assert session.uploader_identity == "admin@example.com"

    def test_default_uploader_identity_is_none(self, drawing_type: DrawingType) -> None:
        session = self._make_session(drawing_type)
        assert session.uploader_identity is None

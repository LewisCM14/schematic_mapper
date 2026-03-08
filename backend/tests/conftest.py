import pytest

from api.models import DrawingType, Image


@pytest.fixture
def drawing_type(db: None) -> DrawingType:
    return DrawingType.objects.create(type_name="composite")


@pytest.fixture
def image(drawing_type: DrawingType) -> Image:
    return Image.objects.create(
        drawing_type=drawing_type,
        component_name="Cooling Assembly",
        image_binary=b"<svg/>",
        content_hash="abc123",
        width_px=800,
        height_px=600,
    )

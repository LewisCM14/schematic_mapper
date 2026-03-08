import pytest
from django.test import Client

from api.models import FittingPosition, Image


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

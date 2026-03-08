import pytest
from django.test import Client
from unittest.mock import patch

from api.asset_adapter import AssetRecord, AssetResult
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

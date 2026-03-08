import pytest


@pytest.mark.django_db
class TestHealthView:
    def test_returns_200(self, client):
        response = client.get("/api/health")
        assert response.status_code == 200

    def test_response_shape(self, client):
        response = client.get("/api/health")
        data = response.json()
        assert data["status"] == "ok"
        assert data["database"] == "ok"

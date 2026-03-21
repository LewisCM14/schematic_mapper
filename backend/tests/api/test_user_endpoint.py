import pytest
from rest_framework.test import APIRequestFactory
from api.views.user import user_info
from rest_framework.request import Request
from typing import Any


class TestUserInfoView:
    """
    Unit tests for the /api/user endpoint.
    Covers authenticated admin, authenticated viewer, unauthenticated, and unauthorized cases.
    """

    @pytest.mark.django_db
    def test_authenticated_admin(self, client: Any, rf: Any) -> None:
        factory = APIRequestFactory()
        request: Request = factory.get("/api/user")
        setattr(request, "user_identity", "test_admin")
        setattr(request, "user_role", "admin")
        response = user_info(request)
        assert response.status_code == 200
        assert response.data["user_identity"] == "test_admin"
        assert response.data["user_role"] == "admin"

    @pytest.mark.django_db
    def test_authenticated_viewer(self, client: Any, rf: Any) -> None:
        factory = APIRequestFactory()
        request: Request = factory.get("/api/user")
        setattr(request, "user_identity", "test_viewer")
        setattr(request, "user_role", "viewer")
        response = user_info(request)
        assert response.status_code == 200
        assert response.data["user_identity"] == "test_viewer"
        assert response.data["user_role"] == "viewer"

    @pytest.mark.django_db
    def test_unauthenticated(self, client: Any, rf: Any) -> None:
        factory = APIRequestFactory()
        request: Request = factory.get("/api/user")
        response = user_info(request)
        assert response.status_code == 401
        assert "Authentication required" in response.data["detail"]

    @pytest.mark.django_db
    def test_unauthorized(self, client: Any, rf: Any) -> None:
        factory = APIRequestFactory()
        request: Request = factory.get("/api/user")
        setattr(request, "user_identity", "test_user")
        response = user_info(request)
        assert response.status_code == 403
        assert "User not authorized" in response.data["detail"]

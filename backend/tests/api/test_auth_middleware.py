"""
test_auth_middleware.py

Tests for IISAuthMiddleware, LDAPAuthorizationMiddleware, and permission decorators.
Covers group mapping, REMOTE_USER handling, and edge cases.
"""

import pytest
from unittest.mock import patch
from django.http import HttpRequest, HttpResponse
from django.test import RequestFactory
from api.middleware import IISAuthMiddleware, LDAPAuthorizationMiddleware
from api.permissions import admin_required, viewer_required


@pytest.fixture
def rf() -> RequestFactory:
    return RequestFactory()


class TestIISAuthMiddleware:
    """
    Tests for IISAuthMiddleware (IIS/Windows Authentication integration).
    """

    @staticmethod
    def dummy_view(request: HttpRequest) -> HttpResponse:
        return HttpResponse("ok")

    def test_sets_user_identity(self, rf: RequestFactory) -> None:
        request = rf.get("/test")
        request.META["REMOTE_USER"] = "DOMAIN\\user"
        middleware = IISAuthMiddleware(self.dummy_view)
        response = middleware(request)
        assert hasattr(request, "user_identity")
        assert request.user_identity == "user"
        assert response.status_code == 200

    def test_missing_remote_user_returns_401(self, rf: RequestFactory) -> None:
        request = rf.get("/test")
        middleware = IISAuthMiddleware(self.dummy_view)
        response = middleware(request)
        assert response.status_code == 401
        assert b"Unauthorized" in response.content


class DummyRequest(HttpRequest):
    user_identity: str


def make_request_with_identity(identity: str) -> DummyRequest:
    req = DummyRequest()
    req.user_identity = identity
    return req


class TestLDAPAuthorizationMiddleware:
    """
    Tests for LDAPAuthorizationMiddleware (AD group mapping and authorization).
    """

    @pytest.mark.parametrize(
        "groups,expected_role,status_code",
        [
            (["app_admin"], "admin", 200),
            (["app_viewer"], "viewer", 200),
            (["app_admin", "app_viewer"], "admin", 200),
            ([], None, 403),
            (["other_group"], None, 403),
        ],
    )
    def test_group_mapping(
        self,
        groups: list[str],
        expected_role: str | None,
        status_code: int,
        rf: RequestFactory,
    ) -> None:
        req = make_request_with_identity("user")

        def view(r: HttpRequest) -> HttpResponse:
            return HttpResponse("ok")

        with patch("api.middleware.get_user_groups", return_value=groups):
            middleware = LDAPAuthorizationMiddleware(view)
            response = middleware(req)
            if expected_role:
                assert getattr(req, "user_role", None) == expected_role
                assert response.status_code == 200
            else:
                assert response.status_code == 403
                assert b"User not in allowed AD groups." in response.content

    def test_ad_unavailable_raises(self, rf: RequestFactory) -> None:
        req = make_request_with_identity("user")

        def view(r: HttpRequest) -> HttpResponse:
            return HttpResponse("ok")

        with patch(
            "api.middleware.get_user_groups", side_effect=Exception("LDAP error")
        ):
            middleware = LDAPAuthorizationMiddleware(view)
            import pytest

            with pytest.raises(Exception, match="LDAP error"):
                middleware(req)


class TestPermissionDecorators:
    """
    Tests for admin_required and viewer_required decorators (role-based access control).
    """

    @staticmethod
    def dummy_admin_view(request: HttpRequest) -> HttpResponse:
        return HttpResponse("admin ok")

    @staticmethod
    def dummy_viewer_view(request: HttpRequest) -> HttpResponse:
        return HttpResponse("viewer ok")

    def test_admin_required_allows_admin(self) -> None:
        req = HttpRequest()
        req.user_role = "admin"  # type: ignore[attr-defined]
        response = admin_required(self.dummy_admin_view)(req)
        assert response.status_code == 200
        assert b"admin ok" in response.content

    def test_admin_required_forbids_non_admin(self) -> None:
        req = HttpRequest()
        req.user_role = "viewer"  # type: ignore[attr-defined]
        response = admin_required(self.dummy_admin_view)(req)
        assert response.status_code == 403
        assert b"Admin access required" in response.content

    def test_viewer_required_allows_viewer_and_admin(self) -> None:
        req = HttpRequest()
        req.user_role = "viewer"  # type: ignore[attr-defined]
        response = viewer_required(self.dummy_viewer_view)(req)
        assert response.status_code == 200
        req.user_role = "admin"  # type: ignore[attr-defined]
        response = viewer_required(self.dummy_viewer_view)(req)
        assert response.status_code == 200

    def test_viewer_required_forbids_other(self) -> None:
        req = HttpRequest()
        req.user_role = "other"  # type: ignore[attr-defined]
        response = viewer_required(self.dummy_viewer_view)(req)
        assert response.status_code == 403
        assert b"Viewer or admin access required" in response.content


# --- LDAP edge case: AD server unavailable ---
def test_ldap_authorization_ad_unavailable(rf: RequestFactory) -> None:
    req = make_request_with_identity("user")

    def view(r: HttpRequest) -> HttpResponse:
        return HttpResponse("ok")

    with patch("api.middleware.get_user_groups", side_effect=Exception("LDAP error")):
        middleware = LDAPAuthorizationMiddleware(view)
        import pytest

        with pytest.raises(Exception, match="LDAP error"):
            middleware(req)

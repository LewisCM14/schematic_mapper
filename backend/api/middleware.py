"""
middleware.py

This module contains Django middleware classes that help with:
    - Tracking requests for debugging and tracing (RequestIdMiddleware)
    - Simulating authentication for local development (DevAuthMiddleware)
    - Extracting user identity from IIS (IISAuthMiddleware)
    - Enforcing authorization based on Active Directory groups (LDAPAuthorizationMiddleware)

What is middleware?
    Middleware is code that runs before and after every HTTP request in a Django app. It can change the request, the response, or even block the request.

Classes in this file:
    - RequestIdMiddleware: Adds a unique ID to every request for logging and tracing.
    - DevAuthMiddleware: Fakes a user and role for local development/testing.
    - IISAuthMiddleware: Gets the logged-in user from IIS web server headers.
    - LDAPAuthorizationMiddleware: Checks which AD group the user is in and sets their role (admin/viewer).
"""

import uuid
import os
from collections.abc import Callable

from django.http import HttpRequest, HttpResponse

from config import log_filters
from django.http import HttpResponseForbidden
from .ad_utils import get_user_groups
from django.conf import settings


class RequestIdMiddleware:
    """
    Adds a unique request ID to every HTTP request.

    Why? This helps you trace what happens to each request in logs and debug issues.

    How it works:
        - If the client sends an X-Request-ID header, use it. Otherwise, make a new random UUID.
        - Store the request ID in the logging context so all logs for this request include it.
        - Add the request ID to the response headers so clients and other services can see it.
        - Always clean up the logging context after the request is done.
    """

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        # Store the next middleware or view callable
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        # Extract X-Request-ID from headers, or generate a new UUID if missing
        request_id = request.META.get("HTTP_X_REQUEST_ID") or str(uuid.uuid4())
        # Inject request ID into logging context for correlation
        log_filters.set_request_id(request_id)
        try:
            # Call the next middleware or view
            response = self.get_response(request)
        finally:
            # Always clear the request ID from logging context to avoid leaks
            log_filters.clear_request_id()
        # Add the request ID to the response headers for client and downstream tracing
        response["X-Request-ID"] = request_id
        return response


class DevAuthMiddleware:
    """
    Fakes a user and their role for local development and testing.

    When does it run?
        - Only when the AUTH_MODE environment variable is set to 'dev'.

    What does it do?
        - Sets request.user_identity to a fake username (from DEV_USER_IDENTITY env var, or 'dev_admin').
        - Tries to set request.user_role based on AD group membership (if possible), or falls back to DEV_USER_ROLE env var.
        - Lets you test the app without real authentication or AD.
    """

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        if os.environ.get("AUTH_MODE") == "dev":
            # Always inject mock user identity from environment variable (for local dev and tests)
            user_identity = os.environ.get("DEV_USER_IDENTITY", "dev_admin")
            request.user_identity = user_identity  # type: ignore[attr-defined]

            # Try to assign user_role based on group membership (for tests), else fallback to env var
            try:
                from .ad_utils import get_user_groups
                from django.conf import settings

                groups = get_user_groups(user_identity)
                if settings.LDAP_ADMIN_GROUP in groups:
                    request.user_role = "admin"  # type: ignore[attr-defined]
                elif settings.LDAP_VIEWER_GROUP in groups:
                    request.user_role = "viewer"  # type: ignore[attr-defined]
                else:
                    request.user_role = None  # type: ignore[attr-defined]
            except Exception:
                # If get_user_groups is not patchable or fails, fallback to env var (for local dev)
                request.user_role = os.environ.get("DEV_USER_ROLE", "admin")  # type: ignore[attr-defined]
        return self.get_response(request)


class IISAuthMiddleware:
    """
    Gets the logged-in user from IIS web server headers.

    What does it do?
        - Looks for the REMOTE_USER header (set by IIS when a user is logged in).
        - If not found, returns a 401 Unauthorized response.
        - If found, sets request.user_identity to the username (removes domain prefix if present).
    """

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        user_identity = request.META.get("REMOTE_USER")
        if not user_identity:
            return HttpResponse("Unauthorized", status=401)
        # Optionally strip domain prefix (e.g., 'DOMAIN\\username')
        if "\\" in user_identity:
            user_identity = user_identity.split("\\", 1)[1]
        request.user_identity = user_identity  # type: ignore[attr-defined]
        return self.get_response(request)


class LDAPAuthorizationMiddleware:
    """
    Checks which Active Directory group the user is in and sets their role.

    What does it do?
        - Looks at request.user_identity (set by previous middleware).
        - Uses get_user_groups to find all AD groups for the user.
        - If the user is in the admin group, sets request.user_role = 'admin'.
        - If the user is in the viewer group, sets request.user_role = 'viewer'.
        - If the user is not in either group, blocks the request with a 403 Forbidden response.
    """

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        username = getattr(request, "user_identity", None)
        if not username:
            return HttpResponseForbidden("No user identity found.")
        groups = get_user_groups(username)
        if settings.LDAP_ADMIN_GROUP in groups:
            request.user_role = "admin"  # type: ignore[attr-defined]
        elif settings.LDAP_VIEWER_GROUP in groups:
            request.user_role = "viewer"  # type: ignore[attr-defined]
        else:
            return HttpResponseForbidden("User not in allowed AD groups.")
        return self.get_response(request)

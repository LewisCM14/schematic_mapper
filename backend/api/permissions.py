"""
permissions.py

This module provides decorators to restrict access to certain Django views based on user roles.

What is a decorator?
    A decorator is a function that wraps another function to add extra behavior. Here, we use them to check if the user is allowed to access a view.

How does role-based access work?
    - Each request should have a 'user_role' attribute (set by middleware).
    - If the user does not have the required role, the decorator returns a 403 Forbidden response.
    - If the user has the right role, the view runs as normal.

Decorators in this file:
    - admin_required: Only allows users with the 'admin' role.
    - viewer_required: Allows users with 'viewer' or 'admin' roles.
"""

from functools import wraps
from django.http import HttpRequest, HttpResponse, HttpResponseForbidden
from typing import Callable, Any, TypeVar, cast

F = TypeVar("F", bound=Callable[..., Any])


def admin_required(view_func: F) -> F:
    """
    Decorator to restrict access to users with the 'admin' role only.
    If the user is not an admin, returns 403 Forbidden.

    Usage:
        @admin_required
        def my_view(request):
            ...
    """

    @wraps(view_func)
    def _wrapped_view(request: HttpRequest, *args: Any, **kwargs: Any) -> HttpResponse:
        if getattr(request, "user_role", None) != "admin":
            return HttpResponseForbidden("Admin access required.")
        response = view_func(request, *args, **kwargs)
        return cast(HttpResponse, response)

    return cast(F, _wrapped_view)


def viewer_required(view_func: F) -> F:
    """
    Decorator to restrict access to users with 'viewer' or 'admin' roles.
    If the user is not a viewer or admin, returns 403 Forbidden.

    Usage:
        @viewer_required
        def my_view(request):
            ...
    """

    @wraps(view_func)
    def _wrapped_view(request: HttpRequest, *args: Any, **kwargs: Any) -> HttpResponse:
        user_role = getattr(request, "user_role", None)
        if user_role not in ("viewer", "admin"):
            return HttpResponseForbidden("Viewer or admin access required.")
        response = view_func(request, *args, **kwargs)
        return cast(HttpResponse, response)

    return cast(F, _wrapped_view)

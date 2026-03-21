"""
user.py

This file defines the /api/user endpoint for the Schematic Mapper backend.

What does this endpoint do?
- It returns the current user's identity (username) and role (admin or viewer) as determined by authentication and authorization middleware.
- It is used by the frontend to know who is logged in and what permissions they have.

How does it work?
- The endpoint is a Django REST Framework view, decorated with @api_view(["GET"]) so it only responds to GET requests.
- It expects the request object to have two attributes set by middleware:
    - request.user_identity: the username or unique ID of the user
    - request.user_role: the user's role ("admin" or "viewer")
- If the user is not authenticated (no user_identity), it returns a 401 Unauthorized error.
- If the user is authenticated but not authorized (no user_role), it returns a 403 Forbidden error.
- If both are present, it returns them in a JSON response.

Example successful response:
{
    "user_identity": "jane.doe",
    "user_role": "admin"
}

Example error responses:
- 401: { "detail": "Authentication required." }
- 403: { "detail": "User not authorized." }

This endpoint does not do any authentication or authorization itself; it relies on middleware to set the correct attributes on the request.
"""

from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework import status


@api_view(["GET"])
def user_info(request: Request) -> Response:
    """
    Returns the current user's identity and role.
    - Requires authentication and authorization middleware to set request.user_identity and request.user_role.
    - Returns 401 if user is not authenticated, 403 if not authorized.
    """
    user_identity = getattr(request, "user_identity", None)
    user_role = getattr(request, "user_role", None)

    if not user_identity:
        return Response(
            {"detail": "Authentication required."}, status=status.HTTP_401_UNAUTHORIZED
        )
    if not user_role:
        return Response(
            {"detail": "User not authorized."}, status=status.HTTP_403_FORBIDDEN
        )

    return Response(
        {
            "user_identity": user_identity,
            "user_role": user_role,
        }
    )

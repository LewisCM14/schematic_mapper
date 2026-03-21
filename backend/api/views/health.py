"""
Health-check endpoint for the Schematic Mapper backend.
Performs a database connectivity check and returns service status for monitoring and load balancers.
"""

from django.db import OperationalError, connections
from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response
from api.permissions import viewer_required


@api_view(["GET"])
@viewer_required
def health(request: Request) -> Response:
    """
    Health check endpoint for service monitoring.
    - Checks database connectivity (PostgreSQL 'default' connection).
    - Returns HTTP 200 if healthy, 503 if DB is unavailable.
    - Used by load balancers and uptime monitors.
    """
    try:
        # Attempt to connect to the default database
        connections["default"].ensure_connection()
        db_status = "ok"
    except OperationalError:
        # Database is unavailable
        db_status = "error"

    status_code = 200 if db_status == "ok" else 503
    return Response({"status": "ok", "database": db_status}, status=status_code)

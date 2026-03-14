"""
Request ID correlation middleware for Django.
Ensures every request has a unique correlation ID for tracing and log correlation.
Injects the ID into logs and response headers for end-to-end observability.
"""

import uuid
from collections.abc import Callable

from django.http import HttpRequest, HttpResponse

from config import log_filters


class RequestIdMiddleware:
    """
    Django middleware to extract or generate a correlation ID (request ID) for each HTTP request.
    - Reads X-Request-ID header if present, otherwise generates a new UUID.
    - Injects the request ID into the logging context for the duration of the request.
    - Adds the request ID to the response headers for downstream tracing.
    - Cleans up the logging context after the response is processed.
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

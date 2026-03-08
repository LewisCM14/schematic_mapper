"""Request ID correlation middleware."""

import uuid
from collections.abc import Callable

from django.http import HttpRequest, HttpResponse

from config import log_filters


class RequestIdMiddleware:
    """Extract or generate a correlation ID per request, inject into logs."""

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        request_id = request.META.get("HTTP_X_REQUEST_ID") or str(uuid.uuid4())
        log_filters.set_request_id(request_id)
        try:
            response = self.get_response(request)
        finally:
            log_filters.clear_request_id()
        response["X-Request-ID"] = request_id
        return response

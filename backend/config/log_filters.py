"""Logging filters for the Schematic Mapper application."""

import logging
import threading


# Thread-local storage for per-request correlation ID
_request_id_local: threading.local = threading.local()


def set_request_id(request_id: str) -> None:
    """
    Set the request ID for the current thread.
    Called by middleware at the start of each request to enable log correlation.
    """
    _request_id_local.value = request_id


def clear_request_id() -> None:
    """
    Clear the request ID for the current thread.
    Called by middleware after the request is processed to avoid leaking IDs between requests.
    """
    _request_id_local.value = ""


class RequestIdFilter(logging.Filter):
    """
    Logging filter that injects the current request ID into every LogRecord.
    Enables correlation of log messages with individual HTTP requests.
    """

    def filter(self, record: logging.LogRecord) -> bool:
        # Attach the current thread's request ID (or '-' if not set) to the log record
        record.request_id = getattr(_request_id_local, "value", "-")
        return True

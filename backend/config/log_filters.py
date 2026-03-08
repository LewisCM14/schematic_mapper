"""Logging filters for the Schematic Mapper application."""

import logging
import threading

_request_id_local: threading.local = threading.local()


def set_request_id(request_id: str) -> None:
    """Set the request ID for the current thread (called by middleware)."""
    _request_id_local.value = request_id


def clear_request_id() -> None:
    """Clear the request ID for the current thread."""
    _request_id_local.value = ""


class RequestIdFilter(logging.Filter):
    """Inject ``request_id`` into every LogRecord (stubbed for prototype)."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = getattr(_request_id_local, "value", "-")
        return True

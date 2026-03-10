"""Application-wide constants for the api package."""

import re

ALLOWED_MIME_TYPES: frozenset[str] = frozenset({"image/svg+xml"})
MAX_UPLOAD_SIZE_BYTES: int = 50 * 1024 * 1024  # 50 MB
MAX_CONCURRENT_UPLOADS: int = 3

THUMBNAIL_WIDTH = 240

VALID_SEARCH_SOURCES: frozenset[str] = frozenset({"internal", "asset", "sensor"})

_NUMERIC_RE = re.compile(r"^(\d+(?:\.\d+)?)")

DEFAULT_WIDTH = 800
DEFAULT_HEIGHT = 600

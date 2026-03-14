"""
Application-wide constants for the api package.
Defines limits, allowed types, and configuration values used throughout the backend.
Update this file to centralize any new constants for maintainability.
"""

import re


# Allowed MIME types for uploads (SVG only)
ALLOWED_MIME_TYPES: frozenset[str] = frozenset({"image/svg+xml"})

# Maximum allowed upload size (50 MB)
MAX_UPLOAD_SIZE_BYTES: int = 50 * 1024 * 1024

# Maximum number of concurrent upload sessions per system
MAX_CONCURRENT_UPLOADS: int = 3

# Default width for generated thumbnails (pixels)
THUMBNAIL_WIDTH = 240

# Valid sources for search (internal DB, asset DB, sensor data)
VALID_SEARCH_SOURCES: frozenset[str] = frozenset({"internal", "asset", "sensor"})

# Regex for extracting numeric values from strings (used in SVG parsing)
_NUMERIC_RE = re.compile(r"^(\d+(?:\.\d+)?)")

# Default image dimensions (pixels)
DEFAULT_WIDTH = 800
DEFAULT_HEIGHT = 600

# Default time-to-live (TTL) for upload sessions, in hours (used by cleanup_uploads management command)
DEFAULT_TTL_HOURS = 24

# TTL for cached search projections (seconds, used by SearchIndexService)
PROJECTION_TTL_SECONDS = 600  # 10 minutes

# Match ranking for search results: lower is better (used by SearchService)
_MATCH_RANK = {"exact": 0, "prefix": 1, "partial": 2}

# Duplicate component name error code and message (used by upload_service)
DUPLICATE_COMPONENT_NAME_CODE = "duplicate_component_name"
DUPLICATE_COMPONENT_NAME_MESSAGE = (
    "Component name already exists. Names must be unique ignoring letter case "
    "and surrounding whitespace."
)

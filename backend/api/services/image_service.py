"""
Image processing utilities for the backend.
Includes:
- SVG dimension extraction for POI mapping and validation
- SVG-to-PNG thumbnail generation for UI previews
Used by the upload and image services.
"""

import logging
import xml.etree.ElementTree as ET

from api.constants import DEFAULT_HEIGHT, DEFAULT_WIDTH, THUMBNAIL_WIDTH, _NUMERIC_RE

logger = logging.getLogger("api")


def generate_thumbnail(svg_data: bytes) -> bytes | None:
    """
    Generate a PNG thumbnail from SVG content for UI display.
    Uses cairosvg to rasterize the SVG at a fixed width (THUMBNAIL_WIDTH).
    Returns PNG bytes or None if generation fails (e.g., invalid SVG or cairosvg not installed).
    """
    try:
        import cairosvg

        # Convert SVG to PNG at the configured thumbnail width
        return cairosvg.svg2png(bytestring=svg_data, output_width=THUMBNAIL_WIDTH)  # type: ignore[no-any-return]
    except Exception:
        logger.warning("thumbnail_generation_failed", exc_info=True)
        return None


def parse_svg_dimensions(data: bytes) -> tuple[int, int]:
    """
    Extract width and height from an SVG's attributes or viewBox.
    Returns (width, height) as integers, falling back to
    DEFAULT_WIDTH × DEFAULT_HEIGHT if dimensions cannot be determined.
    Used to validate uploads and for image metadata.
    """
    try:
        root = ET.fromstring(data)  # Parse SVG XML
    except ET.ParseError:
        return DEFAULT_WIDTH, DEFAULT_HEIGHT

    def _num(val: str | None) -> int | None:
        # Helper: parse a numeric value from a string (e.g., '100px', '100.0')
        if not val:
            return None
        m = _NUMERIC_RE.match(val.strip())
        return int(float(m.group(1))) if m else None

    # Try width/height attributes first
    w = _num(root.get("width"))
    h = _num(root.get("height"))
    if w and h:
        return w, h

    # Fallback: parse viewBox if present
    vb = root.get("viewBox") or root.get("viewbox")
    if vb:
        parts = vb.replace(",", " ").split()
        if len(parts) == 4:
            vw = _num(parts[2])
            vh = _num(parts[3])
            if vw and vh:
                return vw, vh

    # Default fallback if all else fails
    return DEFAULT_WIDTH, DEFAULT_HEIGHT

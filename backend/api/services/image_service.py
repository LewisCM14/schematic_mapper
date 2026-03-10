"""Image processing utilities: SVG dimension parsing and thumbnail generation."""

import logging
import xml.etree.ElementTree as ET

from api.constants import DEFAULT_HEIGHT, DEFAULT_WIDTH, THUMBNAIL_WIDTH, _NUMERIC_RE

logger = logging.getLogger("api")


def generate_thumbnail(svg_data: bytes) -> bytes | None:
    """Generate a PNG thumbnail from SVG content.

    Returns PNG bytes or None if generation fails.
    """
    try:
        import cairosvg

        return cairosvg.svg2png(bytestring=svg_data, output_width=THUMBNAIL_WIDTH)  # type: ignore[no-any-return]
    except Exception:
        logger.warning("thumbnail_generation_failed", exc_info=True)
        return None


def parse_svg_dimensions(data: bytes) -> tuple[int, int]:
    """Extract width/height from an SVG's attributes or viewBox.

    Returns (width, height) as integers, falling back to
    DEFAULT_WIDTH × DEFAULT_HEIGHT when dimensions cannot be determined.
    """
    try:
        root = ET.fromstring(data)  # noqa: S314
    except ET.ParseError:
        return DEFAULT_WIDTH, DEFAULT_HEIGHT

    def _num(val: str | None) -> int | None:
        if not val:
            return None
        m = _NUMERIC_RE.match(val.strip())
        return int(float(m.group(1))) if m else None

    w = _num(root.get("width"))
    h = _num(root.get("height"))
    if w and h:
        return w, h

    vb = root.get("viewBox") or root.get("viewbox")
    if vb:
        parts = vb.replace(",", " ").split()
        if len(parts) == 4:
            vw = _num(parts[2])
            vh = _num(parts[3])
            if vw and vh:
                return vw, vh

    return DEFAULT_WIDTH, DEFAULT_HEIGHT

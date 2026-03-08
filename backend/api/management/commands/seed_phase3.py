import hashlib
from typing import Any

from django.core.management.base import BaseCommand

from api.models import DrawingType, FittingPosition, Image

PLACEHOLDER_SVG = """\
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <rect width="800" height="600" fill="#EEF3F8"/>
  <rect x="50" y="50" width="700" height="500" fill="none" stroke="#1f5f99" stroke-width="2"/>
  <text x="400" y="310" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#486581">
    Placeholder Schematic Drawing
  </text>
  <circle cx="300" cy="250" r="8" fill="#0B6BCB"/>
  <text x="315" y="255" font-family="sans-serif" font-size="12" fill="#102A43">FP-PUMP-01-INLET</text>
</svg>
"""


class Command(BaseCommand):
    help = (
        "Seed the internal database with one drawing type, image and fitting position"
    )

    def handle(self, *args: Any, **options: Any) -> None:
        drawing_type, _ = DrawingType.objects.get_or_create(
            type_name="composite",
            defaults={"description": "Composite system drawing", "is_active": True},
        )

        svg_bytes = PLACEHOLDER_SVG.encode("utf-8")
        content_hash = hashlib.sha256(svg_bytes).hexdigest()

        image, created = Image.objects.get_or_create(
            content_hash=content_hash,
            defaults={
                "drawing_type": drawing_type,
                "component_name": "Cooling System Assembly",
                "image_binary": svg_bytes,
                "width_px": 800,
                "height_px": 600,
            },
        )

        FittingPosition.objects.get_or_create(
            fitting_position_id="FP-PUMP-01-INLET",
            defaults={
                "image": image,
                "x_coordinate": "300.000",
                "y_coordinate": "250.000",
                "label_text": "FP-PUMP-01-INLET",
                "is_active": True,
            },
        )

        action = "Created" if created else "Already exists"
        self.stdout.write(
            self.style.SUCCESS(
                f"{action}: drawing_type='{drawing_type.type_name}', "
                f"image='{image.component_name}', "
                f"image_id={image.image_id}"
            )
        )

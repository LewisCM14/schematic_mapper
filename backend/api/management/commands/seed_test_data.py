import hashlib
from typing import Any

from django.core.management.base import BaseCommand

from api.models import DrawingType, FittingPosition, Image

PLACEHOLDER_SVG = """\
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200" viewBox="0 0 1600 1200">
    <rect width="1600" height="1200" fill="#eef3f8"/>
    <rect x="80" y="80" width="1440" height="1040" fill="none" stroke="#1f5f99" stroke-width="6"/>
    <text x="800" y="150" text-anchor="middle" font-family="sans-serif" font-size="44" fill="#234361">Admin Upload UAT Fixture</text>
    <text x="800" y="205" text-anchor="middle" font-family="sans-serif" font-size="22" fill="#486581">Cooling loop schematic test drawing for upload and mapping flows</text>

    <line x1="240" y1="340" x2="1360" y2="340" stroke="#7b8794" stroke-width="18" stroke-linecap="round"/>
    <line x1="240" y1="600" x2="1360" y2="600" stroke="#7b8794" stroke-width="18" stroke-linecap="round"/>
    <line x1="240" y1="860" x2="1360" y2="860" stroke="#7b8794" stroke-width="18" stroke-linecap="round"/>
    <line x1="350" y1="220" x2="350" y2="980" stroke="#9fb3c8" stroke-width="14" stroke-linecap="round"/>
    <line x1="800" y1="220" x2="800" y2="980" stroke="#9fb3c8" stroke-width="14" stroke-linecap="round"/>
    <line x1="1250" y1="220" x2="1250" y2="980" stroke="#9fb3c8" stroke-width="14" stroke-linecap="round"/>

    <rect x="240" y="290" width="140" height="100" rx="16" fill="#d9e2ec" stroke="#486581" stroke-width="4"/>
    <rect x="730" y="290" width="140" height="100" rx="16" fill="#d9e2ec" stroke="#486581" stroke-width="4"/>
    <rect x="1180" y="290" width="140" height="100" rx="16" fill="#d9e2ec" stroke="#486581" stroke-width="4"/>

    <circle cx="350" cy="600" r="62" fill="#d9e2ec" stroke="#486581" stroke-width="4"/>
    <circle cx="800" cy="600" r="62" fill="#d9e2ec" stroke="#486581" stroke-width="4"/>
    <circle cx="1250" cy="600" r="62" fill="#d9e2ec" stroke="#486581" stroke-width="4"/>

    <path d="M260 860 h180 l30 50 h140" fill="none" stroke="#486581" stroke-width="10" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M710 860 h180 l30 50 h140" fill="none" stroke="#486581" stroke-width="10" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M1160 860 h180" fill="none" stroke="#486581" stroke-width="10" stroke-linecap="round"/>

    <text x="310" y="455" font-family="sans-serif" font-size="24" fill="#334e68">Pump A</text>
    <text x="760" y="455" font-family="sans-serif" font-size="24" fill="#334e68">Valve Bank</text>
    <text x="1190" y="455" font-family="sans-serif" font-size="24" fill="#334e68">Pump B</text>

    <text x="270" y="705" font-family="sans-serif" font-size="24" fill="#334e68">Heat Exchanger</text>
    <text x="760" y="705" font-family="sans-serif" font-size="24" fill="#334e68">Filter Vessel</text>
    <text x="1200" y="705" font-family="sans-serif" font-size="24" fill="#334e68">Accumulator</text>

    <text x="230" y="1040" font-family="monospace" font-size="24" fill="#52606d">Suggested mapping labels: FP-UAT-001 .. FP-UAT-008</text>
</svg>
"""

FITTING_POSITIONS = [
    ("FP-PUMP-01-INLET", 310, 340, 140, 100),
    ("FP-VALVE-01-A", 800, 340, 140, 100),
    ("FP-PUMP-01-OUTLET", 1250, 340, 140, 100),
    ("FP-HEAT-EX-01", 350, 600, 124, 124),
    ("FP-FILTER-01", 800, 600, 124, 124),
    ("FP-VALVE-01-B", 1250, 600, 124, 124),
    ("FP-SENSOR-TEMP-01", 435, 885, 350, 70),
    ("FP-SENSOR-PRES-01", 885, 885, 350, 70),
]


class Command(BaseCommand):
    help = (
        "Seed the internal database with one drawing type, image and fitting positions"
    )

    def handle(self, *args: Any, **options: Any) -> None:
        drawing_type, _ = DrawingType.objects.get_or_create(
            type_name="composite",
            defaults={"description": "Composite system drawing", "is_active": True},
        )

        svg_bytes = PLACEHOLDER_SVG.encode("utf-8")
        content_hash = hashlib.sha256(svg_bytes).hexdigest()

        image, created = Image.objects.update_or_create(
            component_name="Cooling System Assembly",
            defaults={
                "drawing_type": drawing_type,
                "component_name": "Cooling System Assembly",
                "image_binary": svg_bytes,
                "content_hash": content_hash,
                "width_px": 1600,
                "height_px": 1200,
            },
        )

        fp_count = 0
        for fp_id, x, y, width, height in FITTING_POSITIONS:
            _, fp_created = FittingPosition.objects.update_or_create(
                fitting_position_id=fp_id,
                defaults={
                    "image": image,
                    "x_coordinate": f"{x:.3f}",
                    "y_coordinate": f"{y:.3f}",
                    "width": f"{width:.3f}",
                    "height": f"{height:.3f}",
                    "label_text": fp_id,
                    "is_active": True,
                },
            )
            if fp_created:
                fp_count += 1

        action = "Created" if created else "Already exists"
        self.stdout.write(
            self.style.SUCCESS(
                f"{action}: drawing_type='{drawing_type.type_name}', "
                f"image='{image.component_name}', "
                f"image_id={image.image_id}, "
                f"new fitting positions={fp_count}"
            )
        )

"""
Management command to refresh the cached search projection for images.
This updates the denormalized search index used for fast POI lookup.
Can refresh a single image or all images in the database.
Intended for use after bulk data changes or as a periodic maintenance task.
"""

import uuid

from django.core.management.base import BaseCommand

from api.models import Image
from api.services.search_index_service import SearchIndexService


class Command(BaseCommand):
    """
    Django management command to refresh the cached search projection for images.
    - If --image-id is provided, refreshes only that image's projection.
    - If omitted, refreshes all images in the database.
    - Useful after bulk POI changes, migrations, or for maintenance.
    """

    help = "Refresh the cached search projection for one or all images."

    def add_arguments(self, parser):  # type: ignore[no-untyped-def]
        """
        Add the --image-id argument to optionally refresh a single image.
        """
        parser.add_argument(
            "--image-id",
            type=str,
            default=None,
            help="UUID of a single image to refresh. Refreshes all images if omitted.",
        )

    def handle(self, *args, **options):  # type: ignore[no-untyped-def]
        """
        Main entry point: refresh search projection(s) for one or all images.
        """
        svc = SearchIndexService()
        image_id_str: str | None = options["image_id"]

        if image_id_str is not None:
            # Refresh a single image's projection
            image_id = uuid.UUID(image_id_str)
            svc.refresh(image_id)
            self.stdout.write(self.style.SUCCESS("Refreshed projection for 1 image."))
        else:
            # Refresh all images
            image_ids = list(Image.objects.values_list("image_id", flat=True))
            for img_id in image_ids:
                svc.refresh(img_id)
            count = len(image_ids)
            self.stdout.write(
                self.style.SUCCESS(f"Refreshed projections for {count} image(s).")
            )

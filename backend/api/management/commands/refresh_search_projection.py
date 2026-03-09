"""Management command to refresh the cached search projection for images."""

import uuid

from django.core.management.base import BaseCommand

from api.models import Image
from api.search_index_service import SearchIndexService


class Command(BaseCommand):
    help = "Refresh the cached search projection for one or all images."

    # Django's BaseCommand.add_arguments signature is untyped; overriding it
    # inherits that gap, so we suppress the mypy warning here.
    def add_arguments(self, parser):  # type: ignore[no-untyped-def]
        parser.add_argument(
            "--image-id",
            type=str,
            default=None,
            help="UUID of a single image to refresh. Refreshes all images if omitted.",
        )

    # Django's BaseCommand.handle signature is untyped (*args, **options) with
    # no annotations; matching it exactly triggers mypy's no-untyped-def rule.
    def handle(self, *args, **options):  # type: ignore[no-untyped-def]
        svc = SearchIndexService()
        image_id_str: str | None = options["image_id"]

        if image_id_str is not None:
            image_id = uuid.UUID(image_id_str)
            svc.refresh(image_id)
            self.stdout.write(self.style.SUCCESS("Refreshed projection for 1 image."))
        else:
            image_ids = list(Image.objects.values_list("image_id", flat=True))
            for img_id in image_ids:
                svc.refresh(img_id)
            count = len(image_ids)
            self.stdout.write(
                self.style.SUCCESS(f"Refreshed projections for {count} image(s).")
            )

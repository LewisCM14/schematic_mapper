import logging
from datetime import timedelta
from typing import Any

from django.core.management.base import BaseCommand
from django.utils import timezone

from api.models import (
    UPLOAD_STATE_ABORTED,
    UPLOAD_STATE_INITIATED,
    UPLOAD_STATE_UPLOADING,
    ImageUpload,
)

logger = logging.getLogger("api")

DEFAULT_TTL_HOURS = 24


class Command(BaseCommand):
    help = "Abort stale upload sessions and delete their chunks"

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument(
            "--ttl-hours",
            type=int,
            default=DEFAULT_TTL_HOURS,
            help="Sessions older than this many hours are considered stale (default: 24)",
        )

    def handle(self, *args: Any, **options: Any) -> None:
        ttl_hours: int = options["ttl_hours"]
        cutoff = timezone.now() - timedelta(hours=ttl_hours)

        stale_sessions = ImageUpload.objects.filter(
            state__in=[UPLOAD_STATE_INITIATED, UPLOAD_STATE_UPLOADING],
            updated_at__lt=cutoff,
        )

        count = 0
        for session in stale_sessions:
            chunks_deleted, _ = session.chunks.all().delete()
            session.state = UPLOAD_STATE_ABORTED
            session.save(update_fields=["state", "updated_at"])
            logger.info(
                "cleanup_upload_aborted upload_id=%s chunks_deleted=%d",
                session.upload_id,
                chunks_deleted,
            )
            count += 1

        logger.info("cleanup_uploads_complete sessions_aborted=%d", count)
        self.stdout.write(f"Cleaned up {count} stale upload session(s).")

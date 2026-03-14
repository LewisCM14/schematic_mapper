"""
Management command to abort and clean up stale upload sessions.
Deletes all chunks for uploads stuck in INITIATED or UPLOADING state beyond a TTL.
Intended to be run as a periodic maintenance task (e.g., via cron).
"""

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
from api.constants import DEFAULT_TTL_HOURS


logger = logging.getLogger("api")


class Command(BaseCommand):
    """
    Django management command to abort and clean up stale upload sessions.
    - Aborts sessions stuck in INITIATED or UPLOADING state for longer than --ttl-hours.
    - Deletes all associated upload chunks.
    - Logs each aborted session and a summary.
    """

    help = "Abort stale upload sessions and delete their chunks"

    def add_arguments(self, parser: Any) -> None:
        """
        Add the --ttl-hours argument to control staleness threshold.
        """
        parser.add_argument(
            "--ttl-hours",
            type=int,
            default=DEFAULT_TTL_HOURS,
            help="Sessions older than this many hours are considered stale (default: 24)",
        )

    def handle(self, *args: Any, **options: Any) -> None:
        """
        Main entry point: abort and clean up all stale upload sessions.
        """
        ttl_hours: int = options["ttl_hours"]
        cutoff = timezone.now() - timedelta(hours=ttl_hours)

        # Find all sessions in INITIATED or UPLOADING state older than cutoff
        stale_sessions = ImageUpload.objects.filter(
            state__in=[UPLOAD_STATE_INITIATED, UPLOAD_STATE_UPLOADING],
            updated_at__lt=cutoff,
        )

        count = 0
        for session in stale_sessions:
            # Delete all associated chunks
            chunks_deleted, _ = session.chunks.all().delete()
            # Mark session as aborted
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

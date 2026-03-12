from datetime import timedelta

import pytest
from django.core.management import call_command
from django.utils import timezone

from api.models import (
    UPLOAD_STATE_ABORTED,
    UPLOAD_STATE_INITIATED,
    UPLOAD_STATE_UPLOADING,
    DrawingType,
    ImageUpload,
    UploadChunk,
)


@pytest.fixture
def _drawing_type(db: None) -> DrawingType:
    return DrawingType.objects.create(type_name="composite")


@pytest.mark.django_db
class TestCleanupUploads:
    def test_aborts_stale_sessions_and_deletes_chunks(
        self, _drawing_type: DrawingType
    ) -> None:
        stale_time = timezone.now() - timedelta(hours=25)

        session = ImageUpload.objects.create(
            drawing_type=_drawing_type,
            component_name="Assembly",
            file_name="test.svg",
            file_size=1024,
            expected_checksum="abc",
            idempotency_key="stale-1",
            state=UPLOAD_STATE_INITIATED,
        )
        # Force updated_at to past
        ImageUpload.objects.filter(pk=session.pk).update(updated_at=stale_time)

        UploadChunk.objects.create(upload=session, part_number=1, data=b"chunk-data")

        call_command("cleanup_uploads")

        session.refresh_from_db()
        assert session.state == UPLOAD_STATE_ABORTED
        assert session.chunks.count() == 0

    def test_does_not_touch_recent_sessions(self, _drawing_type: DrawingType) -> None:
        session = ImageUpload.objects.create(
            drawing_type=_drawing_type,
            component_name="Assembly",
            file_name="test.svg",
            file_size=1024,
            expected_checksum="abc",
            idempotency_key="recent-1",
            state=UPLOAD_STATE_UPLOADING,
        )

        call_command("cleanup_uploads")

        session.refresh_from_db()
        assert session.state == UPLOAD_STATE_UPLOADING

    def test_custom_ttl(self, _drawing_type: DrawingType) -> None:
        stale_time = timezone.now() - timedelta(hours=2)

        session = ImageUpload.objects.create(
            drawing_type=_drawing_type,
            component_name="Assembly",
            file_name="test.svg",
            file_size=1024,
            expected_checksum="abc",
            idempotency_key="ttl-1",
            state=UPLOAD_STATE_INITIATED,
        )
        ImageUpload.objects.filter(pk=session.pk).update(updated_at=stale_time)

        call_command("cleanup_uploads", "--ttl-hours=1")

        session.refresh_from_db()
        assert session.state == UPLOAD_STATE_ABORTED

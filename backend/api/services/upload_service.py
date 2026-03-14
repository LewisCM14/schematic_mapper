"""
UploadService: orchestrates the admin upload workflow for SVG images.
Handles session lifecycle, chunked upload, checksum validation, and commit to the Image table.
Implements resumable, reliable uploads for large files as required by the spec.
"""

from uuid import UUID

import base64
import hashlib
import logging
import time

from django.db import IntegrityError
from django.db.models.functions import Lower, Trim
from django.shortcuts import get_object_or_404

from api.constants import (
    MAX_CONCURRENT_UPLOADS,
    MAX_UPLOAD_SIZE_BYTES,
    DUPLICATE_COMPONENT_NAME_CODE,
    DUPLICATE_COMPONENT_NAME_MESSAGE,
)

# Explicitly export these for mypy
__all__ = [
    "DUPLICATE_COMPONENT_NAME_CODE",
    "DUPLICATE_COMPONENT_NAME_MESSAGE",
]
from api.models import (
    UPLOAD_STATE_ABORTED,
    UPLOAD_STATE_COMPLETED,
    UPLOAD_STATE_FAILED,
    UPLOAD_STATE_INITIATED,
    UPLOAD_STATE_UPLOADING,
    UPLOAD_STATE_VERIFYING,
    DrawingType,
    Image,
    ImageUpload,
    UploadChunk,
)

from api.services.image_service import generate_thumbnail, parse_svg_dimensions

logger = logging.getLogger("api")


def normalize_component_name(component_name: str) -> str:
    """
    Normalize a component name by trimming whitespace.
    Used to enforce uniqueness regardless of user input formatting.
    """
    return component_name.strip()


def image_component_name_exists(component_name: str) -> bool:
    """
    Check if a committed Image exists with the given (normalized, casefolded) component name.
    Used to enforce uniqueness of component names across all images.
    """
    normalized_name = component_name.casefold()
    return (
        Image.objects.annotate(normalized_component_name=Lower(Trim("component_name")))
        .filter(normalized_component_name=normalized_name)
        .exists()
    )


def active_upload_name_exists(
    component_name: str, *, exclude_upload_id: str | UUID | None = None
) -> bool:
    """
    Check if an in-progress upload session exists with the same component name.
    Used to prevent duplicate uploads before commit.
    """
    normalized_name = component_name.casefold()
    active_states = [
        UPLOAD_STATE_INITIATED,
        UPLOAD_STATE_UPLOADING,
        UPLOAD_STATE_VERIFYING,
    ]
    queryset = ImageUpload.objects.filter(state__in=active_states).annotate(
        normalized_component_name=Lower(Trim("component_name"))
    )
    if exclude_upload_id is not None:
        queryset = queryset.exclude(pk=exclude_upload_id)
    return queryset.filter(normalized_component_name=normalized_name).exists()


def has_component_name_conflict(
    component_name: str, *, exclude_upload_id: str | UUID | None = None
) -> bool:
    """
    Returns True if the component name is already used by a committed image or an active upload session.
    Used to enforce uniqueness across both committed and in-progress uploads.
    """
    return image_component_name_exists(component_name) or active_upload_name_exists(
        component_name,
        exclude_upload_id=exclude_upload_id,
    )


def create_session(
    *,
    drawing_type_id: int,
    component_name: str,
    file_name: str,
    file_size: int,
    expected_checksum: str,
    idempotency_key: str,
    request_id: str,
) -> tuple[ImageUpload, int]:
    """
    Create a new upload session for an SVG image.
    - Enforces max file size and concurrent session limits.
    - Ensures idempotency (repeated calls with same key return same session).
    - Checks for duplicate component names (committed or in-progress).
    Returns: (ImageUpload session, HTTP status code)
    """
    if file_size > MAX_UPLOAD_SIZE_BYTES:
        raise ValueError("file_too_large")

    existing = ImageUpload.objects.filter(idempotency_key=idempotency_key).first()
    if existing is not None:
        return existing, 200

    active_states = [
        UPLOAD_STATE_INITIATED,
        UPLOAD_STATE_UPLOADING,
        UPLOAD_STATE_VERIFYING,
    ]
    active_count = ImageUpload.objects.filter(state__in=active_states).count()
    if active_count >= MAX_CONCURRENT_UPLOADS:
        raise PermissionError("upload_limit_reached")

    normalized_component_name = normalize_component_name(component_name)
    if has_component_name_conflict(normalized_component_name):
        raise FileExistsError(DUPLICATE_COMPONENT_NAME_CODE)

    drawing_type = get_object_or_404(DrawingType, pk=drawing_type_id)
    session = ImageUpload.objects.create(
        drawing_type=drawing_type,
        component_name=normalized_component_name,
        file_name=file_name,
        file_size=file_size,
        expected_checksum=expected_checksum,
        idempotency_key=idempotency_key,
    )
    logger.info(
        "upload_session_created upload_id=%s file_name=%s request_id=%s",
        session.upload_id,
        session.file_name,
        request_id,
    )
    return session, 201


def store_chunk(
    *, upload_id: object, part_number: int, chunk_data_b64: str, request_id: str
) -> tuple[dict[str, object], int]:
    """
    Store a single chunk of an in-progress upload.
    - Decodes base64 chunk data and saves it to the UploadChunk table.
    - Moves session to 'uploading' state if not already.
    Returns: (payload, HTTP status code)
    """
    session = get_object_or_404(ImageUpload, pk=upload_id)
    if session.state not in (UPLOAD_STATE_UPLOADING, UPLOAD_STATE_INITIATED):
        return {"error": f"Cannot upload chunk in state '{session.state}'"}, 409

    try:
        chunk_bytes = base64.b64decode(chunk_data_b64)
    except Exception:
        return {"error": "Invalid base64 data"}, 400

    UploadChunk.objects.update_or_create(
        upload=session,
        part_number=part_number,
        defaults={"data": chunk_bytes},
    )
    logger.info(
        "upload_chunk_received upload_id=%s part_number=%d request_id=%s",
        session.upload_id,
        part_number,
        request_id,
    )

    if session.state == UPLOAD_STATE_INITIATED:
        session.state = UPLOAD_STATE_UPLOADING
        session.save(update_fields=["state", "updated_at"])

    return {
        "upload_id": str(session.upload_id),
        "part_number": part_number,
        "state": session.state,
    }, 200


def complete_upload(
    *, upload_id: object, request_id: str
) -> tuple[dict[str, object], int]:
    """
    Complete an upload session by assembling all chunks, verifying checksum, and creating the Image record.
    - Fails if chunks are missing, checksum does not match, or file is not SVG.
    - Handles duplicate name conflicts and cleans up chunk data after commit.
    Returns: (payload, HTTP status code)
    """
    t_start = time.monotonic()
    session = get_object_or_404(ImageUpload, pk=upload_id)

    if session.state == UPLOAD_STATE_COMPLETED:
        return {
            "upload_id": str(session.upload_id),
            "image_id": str(session.image_id),
            "state": session.state,
        }, 200

    if session.state not in (UPLOAD_STATE_UPLOADING, UPLOAD_STATE_INITIATED):
        return {"error": f"Cannot complete upload in state '{session.state}'"}, 409

    session.state = UPLOAD_STATE_VERIFYING
    session.save(update_fields=["state", "updated_at"])

    # Assemble all chunks in order
    chunks = list(session.chunks.order_by("part_number"))
    if not chunks:
        session.state = UPLOAD_STATE_FAILED
        session.error_message = "No chunks uploaded"
        session.save(update_fields=["state", "error_message", "updated_at"])
        return {"error": "No chunks uploaded"}, 422

    assembled = b"".join(bytes(c.data) for c in chunks)

    # Verify checksum
    actual_checksum = hashlib.sha256(assembled).hexdigest()
    if actual_checksum != session.expected_checksum:
        session.state = UPLOAD_STATE_FAILED
        session.error_message = "Checksum mismatch"
        session.save(update_fields=["state", "error_message", "updated_at"])
        duration_ms = int((time.monotonic() - t_start) * 1000)
        logger.warning(
            "upload_complete_failed upload_id=%s reason=checksum_mismatch duration_ms=%d request_id=%s",
            upload_id,
            duration_ms,
            request_id,
        )
        return {"error": "Checksum mismatch", "code": "checksum_mismatch"}, 422

    # Check file type (SVG)
    content_lower = assembled[:512].lower()
    is_svg = b"<svg" in content_lower or b"<?xml" in content_lower
    if not is_svg:
        session.state = UPLOAD_STATE_FAILED
        session.error_message = "Unsupported file type"
        session.save(update_fields=["state", "error_message", "updated_at"])
        return {"error": "Unsupported file type", "code": "unsupported_file_type"}, 422

    width_px, height_px = parse_svg_dimensions(assembled)

    # Re-normalize and check for name conflicts again before commit
    session.component_name = normalize_component_name(session.component_name)
    if has_component_name_conflict(
        session.component_name, exclude_upload_id=session.upload_id
    ):
        session.state = UPLOAD_STATE_FAILED
        session.error_message = DUPLICATE_COMPONENT_NAME_MESSAGE
        session.save(
            update_fields=["state", "error_message", "component_name", "updated_at"]
        )
        return {
            "error": DUPLICATE_COMPONENT_NAME_MESSAGE,
            "code": DUPLICATE_COMPONENT_NAME_CODE,
        }, 409

    try:
        image = Image.objects.create(
            drawing_type=session.drawing_type,
            component_name=session.component_name,
            image_binary=assembled,
            content_hash=actual_checksum,
            width_px=width_px,
            height_px=height_px,
            thumbnail=generate_thumbnail(assembled),
        )
    except IntegrityError:
        session.state = UPLOAD_STATE_FAILED
        session.error_message = DUPLICATE_COMPONENT_NAME_MESSAGE
        session.save(
            update_fields=["state", "error_message", "component_name", "updated_at"]
        )
        return {
            "error": DUPLICATE_COMPONENT_NAME_MESSAGE,
            "code": DUPLICATE_COMPONENT_NAME_CODE,
        }, 409

    session.state = UPLOAD_STATE_COMPLETED
    session.image = image
    session.save(update_fields=["state", "image", "component_name", "updated_at"])
    session.chunks.all().delete()

    duration_ms = int((time.monotonic() - t_start) * 1000)
    logger.info(
        "upload_complete_success upload_id=%s image_id=%s duration_ms=%d checksum_match=True request_id=%s",
        session.upload_id,
        image.image_id,
        duration_ms,
        request_id,
    )

    return {
        "upload_id": str(session.upload_id),
        "image_id": str(image.image_id),
        "state": session.state,
    }, 201


def abort_upload(
    *, upload_id: object, request_id: str
) -> tuple[dict[str, object] | None, int]:
    """
    Abort an upload session and delete all associated chunks.
    - Fails if the upload is already completed.
    Returns: (None or error payload, HTTP status code)
    """
    session = get_object_or_404(ImageUpload, pk=upload_id)
    if session.state == UPLOAD_STATE_COMPLETED:
        return {"error": "Cannot abort a completed upload"}, 409

    session.chunks.all().delete()
    session.state = UPLOAD_STATE_ABORTED
    session.save(update_fields=["state", "updated_at"])
    logger.info(
        "upload_aborted upload_id=%s request_id=%s",
        upload_id,
        request_id,
    )
    return None, 204


def get_session_detail(*, upload_id: object) -> dict[str, object]:
    """
    Return upload session detail including received part numbers.
    Used by the frontend to show upload progress and status.
    """
    session = get_object_or_404(ImageUpload, pk=upload_id)
    received_parts = list(
        session.chunks.order_by("part_number").values_list("part_number", flat=True)
    )
    return {
        "session": session,
        "received_parts": received_parts,
    }


def admin_upload_image(
    *,
    drawing_type_id: int,
    component_name: str,
    file_name: str,
    image_data_b64: str,
    expected_checksum: str,
) -> tuple[dict[str, object], int]:
    """Single-request admin image upload. Returns (payload, http_status)."""
    drawing_type = get_object_or_404(DrawingType, pk=drawing_type_id)
    normalized_component_name = normalize_component_name(component_name)

    if has_component_name_conflict(normalized_component_name):
        return {
            "error": DUPLICATE_COMPONENT_NAME_MESSAGE,
            "code": DUPLICATE_COMPONENT_NAME_CODE,
        }, 409

    try:
        file_bytes = base64.b64decode(image_data_b64, validate=True)
    except Exception:
        return {"error": "Invalid base64 encoding", "code": "invalid_base64"}, 400

    if len(file_bytes) > MAX_UPLOAD_SIZE_BYTES:
        return {
            "error": "File exceeds maximum upload size",
            "code": "file_too_large",
        }, 400

    actual_checksum = hashlib.sha256(file_bytes).hexdigest()
    if actual_checksum != expected_checksum:
        return {"error": "Checksum mismatch", "code": "checksum_mismatch"}, 422

    content_lower = file_bytes[:512].lower()
    is_svg = b"<svg" in content_lower or b"<?xml" in content_lower
    if not is_svg:
        return {"error": "Unsupported file type", "code": "unsupported_file_type"}, 422

    width_px, height_px = parse_svg_dimensions(file_bytes)

    try:
        image = Image.objects.create(
            drawing_type=drawing_type,
            component_name=normalized_component_name,
            image_binary=file_bytes,
            content_hash=actual_checksum,
            width_px=width_px,
            height_px=height_px,
            thumbnail=generate_thumbnail(file_bytes),
        )
    except IntegrityError:
        return {
            "error": DUPLICATE_COMPONENT_NAME_MESSAGE,
            "code": DUPLICATE_COMPONENT_NAME_CODE,
        }, 409

    return {
        "image": image,
        "drawing_type": drawing_type,
    }, 201

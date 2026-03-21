"""
Admin endpoints for the Schematic Mapper backend.
Implements the upload session lifecycle, chunked and single-request uploads, and bulk fitting position management.
All endpoints are protected and intended for admin use only.
"""

import uuid

from api.permissions import admin_required
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response

from api.models import DrawingType, FittingPosition, Image, ImageUpload
from api.serializers.image_serializers import DrawingTypeSerializer
from api.serializers.upload_serializers import (
    AdminImageUploadSerializer,
    BulkFittingPositionSerializer,
    UploadChunkSerializer,
    UploadCompleteSerializer,
    UploadSessionCreateSerializer,
    UploadSessionSerializer,
)
from api.services import upload_service

# --- Upload Session Lifecycle ---


@api_view(["POST"])
@admin_required
def create_upload_session(request: Request) -> Response:
    """
    Start a new upload session for a large SVG image.
    Validates input, enforces limits, and returns a session object for chunked upload.
    """
    serializer = UploadSessionCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    data = serializer.validated_data
    request_id = request.META.get("HTTP_X_REQUEST_ID", "-")

    try:
        session, status = upload_service.create_session(
            drawing_type_id=data["drawing_type_id"],
            component_name=data["component_name"],
            file_name=data["file_name"],
            file_size=data["file_size"],
            expected_checksum=data["expected_checksum"],
            idempotency_key=data["idempotency_key"],
            request_id=request_id,
        )
    except ValueError:
        # File size exceeds allowed maximum
        return Response(
            {"error": "File size exceeds maximum allowed", "code": "file_too_large"},
            status=400,
        )
    except PermissionError:
        # Too many concurrent upload sessions
        return Response(
            {
                "error": "Maximum concurrent upload sessions reached",
                "code": "upload_limit_reached",
                "status": 429,
            },
            status=429,
        )
    except FileExistsError:
        # Duplicate component name
        return Response(
            {
                "error": upload_service.DUPLICATE_COMPONENT_NAME_MESSAGE,
                "code": upload_service.DUPLICATE_COMPONENT_NAME_CODE,
                "status": 409,
            },
            status=409,
        )

    return Response(UploadSessionSerializer(session).data, status=status)


@api_view(["PUT"])
@admin_required
def upload_chunk(request: Request, upload_id: uuid.UUID, part_number: int) -> Response:
    """
    Upload a single chunk of a file to an in-progress upload session.
    Validates chunk data and updates the session state.
    """
    serializer = UploadChunkSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    request_id = request.META.get("HTTP_X_REQUEST_ID", "-")
    payload, status = upload_service.store_chunk(
        upload_id=upload_id,
        part_number=part_number,
        chunk_data_b64=serializer.validated_data["chunk_data"],
        request_id=request_id,
    )
    return Response(payload, status=status)


@api_view(["POST"])
@admin_required
def complete_upload(request: Request, upload_id: uuid.UUID) -> Response:
    """
    Complete an upload session by assembling all chunks, verifying checksum, and committing the image.
    Returns error if validation fails or commit is unsuccessful.
    """
    serializer = UploadCompleteSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    request_id = request.META.get("HTTP_X_REQUEST_ID", "-")
    payload, status = upload_service.complete_upload(
        upload_id=upload_id,
        request_id=request_id,
    )
    return Response(payload, status=status)


@api_view(["GET", "DELETE"])
@admin_required
def upload_session_detail(request: Request, upload_id: uuid.UUID) -> Response:
    """
    GET: Return details and progress for an upload session (received parts, file size, etc).
    DELETE: Abort an upload session and delete all associated chunks.
    """
    if request.method == "GET":
        detail = upload_service.get_session_detail(upload_id=upload_id)
        session = detail["session"]
        assert isinstance(session, ImageUpload)
        data = UploadSessionSerializer(session).data
        data["file_size"] = session.file_size
        data["received_parts"] = detail["received_parts"]
        return Response(data)

    # DELETE — abort upload session
    request_id = request.META.get("HTTP_X_REQUEST_ID", "-")
    payload, status = upload_service.abort_upload(
        upload_id=upload_id,
        request_id=request_id,
    )
    if payload is not None:
        return Response(payload, status=status)
    return Response(status=status)


# --- Single-Request Admin Upload ---


@api_view(["POST"])
@admin_required
def admin_upload_image(request: Request) -> Response:
    """
    Upload an image in a single request (no chunking).
    Used for small files or admin-only workflows.
    """
    serializer = AdminImageUploadSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    data = serializer.validated_data
    payload, status = upload_service.admin_upload_image(
        drawing_type_id=data["drawing_type_id"],
        component_name=data["component_name"],
        file_name=data["file_name"],
        image_data_b64=data["image_data"],
        expected_checksum=data["expected_checksum"],
    )

    if status != 201:
        return Response(payload, status=status)

    image = payload["image"]
    drawing_type = payload["drawing_type"]
    assert isinstance(image, Image)
    assert isinstance(drawing_type, DrawingType)
    return Response(
        {
            "image_id": str(image.image_id),
            "component_name": image.component_name,
            "drawing_type": DrawingTypeSerializer(drawing_type).data,
        },
        status=201,
    )


# --- Bulk Fitting Position Management ---


@api_view(["POST"])
@admin_required
def bulk_fitting_positions(request: Request) -> Response:
    """
    Bulk create or update fitting positions for a given image.
    Validates for duplicate IDs and labels in the payload.
    Returns the number of created and updated records.
    """
    serializer = BulkFittingPositionSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    data = serializer.validated_data
    image = get_object_or_404(Image, pk=data["image_id"])

    # Check for duplicate fitting_position_id values
    fp_ids = [item["fitting_position_id"] for item in data["fitting_positions"]]
    if len(fp_ids) != len(set(fp_ids)):
        return Response(
            {
                "error": "Duplicate fitting_position_id values in payload",
                "code": "bulk_duplicate_ids",
                "status": 400,
            },
            status=400,
        )

    # Check for duplicate label_text values (case-insensitive, trimmed)
    label_texts = [
        item["label_text"].strip().lower() for item in data["fitting_positions"]
    ]
    if len(label_texts) != len(set(label_texts)):
        return Response(
            {
                "error": "Duplicate label_text values in payload",
                "code": "bulk_duplicate_labels",
                "status": 400,
            },
            status=400,
        )

    created = 0
    updated = 0
    for item in data["fitting_positions"]:
        _, was_created = FittingPosition.objects.update_or_create(
            fitting_position_id=item["fitting_position_id"],
            defaults={
                "image": image,
                "label_text": item["label_text"],
                "x_coordinate": item["x_coordinate"],
                "y_coordinate": item["y_coordinate"],
                "width": item["width"],
                "height": item["height"],
                "is_active": True,
            },
        )
        if was_created:
            created += 1
        else:
            updated += 1

    return Response({"created": created, "updated": updated}, status=200)


@api_view(["DELETE"])
@admin_required
def delete_fitting_position(request: Request, fitting_position_id: str) -> Response:
    """
    Delete a fitting position by its ID.
    Returns 204 on success.
    """
    fitting_position = get_object_or_404(FittingPosition, pk=fitting_position_id)
    fitting_position.delete()
    return Response(status=204)

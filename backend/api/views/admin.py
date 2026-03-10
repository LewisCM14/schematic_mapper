"""Admin endpoints: upload lifecycle, single-request upload, bulk fitting positions."""

import uuid

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


@api_view(["POST"])
def create_upload_session(request: Request) -> Response:
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
        return Response(
            {"error": "File size exceeds maximum allowed", "code": "file_too_large"},
            status=400,
        )
    except PermissionError:
        return Response(
            {
                "error": "Maximum concurrent upload sessions reached",
                "code": "upload_limit_reached",
                "status": 429,
            },
            status=429,
        )

    return Response(UploadSessionSerializer(session).data, status=status)


@api_view(["PUT"])
def upload_chunk(request: Request, upload_id: uuid.UUID, part_number: int) -> Response:
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
def complete_upload(request: Request, upload_id: uuid.UUID) -> Response:
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
def upload_session_detail(request: Request, upload_id: uuid.UUID) -> Response:
    if request.method == "GET":
        detail = upload_service.get_session_detail(upload_id=upload_id)
        session = detail["session"]
        assert isinstance(session, ImageUpload)
        data = UploadSessionSerializer(session).data
        data["file_size"] = session.file_size
        data["received_parts"] = detail["received_parts"]
        return Response(data)

    # DELETE — abort
    request_id = request.META.get("HTTP_X_REQUEST_ID", "-")
    payload, status = upload_service.abort_upload(
        upload_id=upload_id,
        request_id=request_id,
    )
    if payload is not None:
        return Response(payload, status=status)
    return Response(status=status)


@api_view(["POST"])
def admin_upload_image(request: Request) -> Response:
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


@api_view(["POST"])
def bulk_fitting_positions(request: Request) -> Response:
    serializer = BulkFittingPositionSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    data = serializer.validated_data
    image = get_object_or_404(Image, pk=data["image_id"])

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
                "is_active": True,
            },
        )
        if was_created:
            created += 1
        else:
            updated += 1

    return Response({"created": created, "updated": updated}, status=200)

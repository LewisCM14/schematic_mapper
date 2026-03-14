"""
Image and fitting-position read endpoints for the Schematic Mapper API.
Provides endpoints for listing and retrieving images, drawing types, and fitting positions.
All endpoints are read-only and intended for frontend consumption.
"""

import base64
import uuid

from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response

from api.adapters.asset_adapter import fetch_asset_details
from api.models import DrawingType, FittingPosition, Image
from api.serializers.image_serializers import (
    DrawingTypeSerializer,
    FittingPositionDetailSerializer,
    FittingPositionSerializer,
    ImageDetailSerializer,
    ImageSerializer,
)


@api_view(["GET"])
def list_drawing_types(request: Request) -> Response:
    """
    List all active drawing types, ordered by name.
    Used to populate dropdowns or filters in the UI.
    """
    qs = DrawingType.objects.filter(is_active=True).order_by("type_name")
    serializer = DrawingTypeSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(["GET"])
def list_images(request: Request) -> Response:
    """
    List images with optional filtering by drawing type and search term.
    Supports pagination via limit and cursor query parameters.
    """
    qs = Image.objects.select_related("drawing_type").all()
    # Optional filter by drawing_type_id
    drawing_type_id = request.query_params.get("drawing_type_id")
    if drawing_type_id is not None:
        try:
            qs = qs.filter(drawing_type_id=int(drawing_type_id))
        except ValueError:
            return Response({"error": "drawing_type_id must be an integer"}, status=400)

    # Optional search by component name
    search = request.query_params.get("search")
    if search:
        qs = qs.filter(component_name__icontains=search)

    # Pagination: limit and cursor
    try:
        limit = max(1, min(100, int(request.query_params.get("limit", "25"))))
    except ValueError:
        limit = 25

    cursor = request.query_params.get("cursor") or None
    offset = 0
    if cursor:
        try:
            offset = int(base64.b64decode(cursor).decode("utf-8"))
        except Exception:
            offset = 0

    total = qs.count()
    page_qs = qs[offset : offset + limit]
    has_more = (offset + limit) < total
    next_cursor: str | None = (
        base64.b64encode(str(offset + limit).encode()).decode() if has_more else None
    )

    serializer = ImageSerializer(page_qs, many=True)
    return Response(
        {"results": serializer.data, "has_more": has_more, "next_cursor": next_cursor}
    )


@api_view(["GET"])
def get_image(request: Request, image_id: uuid.UUID) -> Response:
    """
    Retrieve details for a single image by its UUID.
    Returns all metadata and drawing type info.
    """
    image = get_object_or_404(Image.objects.select_related("drawing_type"), pk=image_id)
    serializer = ImageDetailSerializer(image)
    return Response(serializer.data)


@api_view(["GET"])
def list_fitting_positions(request: Request, image_id: uuid.UUID) -> Response:
    """
    List all fitting positions for a given image.
    Returns a list of position metadata for UI rendering.
    """
    get_object_or_404(Image, pk=image_id)
    positions = FittingPosition.objects.filter(image_id=image_id)
    serializer = FittingPositionSerializer(positions, many=True)
    return Response(serializer.data)


@api_view(["GET"])
def get_fitting_position_details(
    request: Request, fitting_position_id: str
) -> Response:
    """
    Retrieve detailed info for a single fitting position, including asset lookup.
    Combines DB data with external asset details for UI display.
    """
    fp = get_object_or_404(FittingPosition, pk=fitting_position_id)
    asset_result = fetch_asset_details(fitting_position_id)

    asset_data = None
    if asset_result.record is not None:
        rec = asset_result.record
        asset_data = {
            "asset_record_id": rec.asset_record_id,
            "high_level_component": rec.high_level_component,
            "sub_system_name": rec.sub_system_name,
            "sub_component_name": rec.sub_component_name,
        }

    payload = {
        "fitting_position_id": fp.fitting_position_id,
        "label_text": fp.label_text,
        "x_coordinate": fp.x_coordinate,
        "y_coordinate": fp.y_coordinate,
        "width": fp.width,
        "height": fp.height,
        "asset": asset_data,
        "source_status": {"asset": asset_result.source_status},
    }
    serializer = FittingPositionDetailSerializer(payload)
    return Response(serializer.data)

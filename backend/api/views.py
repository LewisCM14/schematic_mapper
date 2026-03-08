import uuid

from django.db import OperationalError, connections
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response

from .asset_adapter import fetch_asset_details
from .models import FittingPosition, Image
from .serializers import (
    FittingPositionDetailSerializer,
    FittingPositionSerializer,
    ImageDetailSerializer,
    ImageSerializer,
)


@api_view(["GET"])
def health(request: Request) -> Response:
    try:
        connections["default"].ensure_connection()
        db_status = "ok"
    except OperationalError:
        db_status = "error"

    status_code = 200 if db_status == "ok" else 503
    return Response({"status": "ok", "database": db_status}, status=status_code)


@api_view(["GET"])
def list_images(request: Request) -> Response:
    images = Image.objects.select_related("drawing_type").all()
    serializer = ImageSerializer(images, many=True)
    return Response(serializer.data)


@api_view(["GET"])
def get_image(request: Request, image_id: uuid.UUID) -> Response:
    image = get_object_or_404(Image.objects.select_related("drawing_type"), pk=image_id)
    serializer = ImageDetailSerializer(image)
    return Response(serializer.data)


@api_view(["GET"])
def list_fitting_positions(request: Request, image_id: uuid.UUID) -> Response:
    get_object_or_404(Image, pk=image_id)
    positions = FittingPosition.objects.filter(image_id=image_id)
    serializer = FittingPositionSerializer(positions, many=True)
    return Response(serializer.data)


@api_view(["GET"])
def get_fitting_position_details(
    request: Request, fitting_position_id: str
) -> Response:
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
        "asset": asset_data,
        "source_status": {"asset": asset_result.source_status},
    }
    serializer = FittingPositionDetailSerializer(payload)
    return Response(serializer.data)

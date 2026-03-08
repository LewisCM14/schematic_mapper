import uuid

from django.db import OperationalError, connections
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response

from .models import FittingPosition, Image
from .serializers import (
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

"""
Search endpoint for the Schematic Mapper API.
Validates query parameters, enforces search constraints, and delegates to the search service.
Returns paginated search results for a given image and query string.
"""

import uuid

from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response

from api.constants import VALID_SEARCH_SOURCES
from api.models import Image
from api.serializers.search_serializers import SearchResponseSerializer
from api.services.search_service import search as run_search


@api_view(["GET"])
def search_view(request: Request) -> Response:
    """
    Search for fitting positions or assets within a given image.
    Validates all query parameters and delegates to the search service.
    Returns paginated search results.
    """
    # image_id is required for all searches
    image_id_raw = request.query_params.get("image_id", "")
    if not image_id_raw:
        return Response(
            {
                "error": "image_id is required before search",
                "code": "search_image_required",
                "status": 400,
            },
            status=400,
        )

    # Validate image_id is a UUID
    try:
        image_id = uuid.UUID(image_id_raw)
    except ValueError:
        return Response({"error": "image_id must be a valid UUID"}, status=400)

    # Validate query string
    query = request.query_params.get("query", "").strip()
    if len(query) < 2:
        return Response(
            {
                "error": "query must be at least 2 characters",
                "code": "query_too_short",
                "status": 400,
            },
            status=400,
        )

    # Ensure the image exists
    get_object_or_404(Image, pk=image_id)

    # Parse and validate sources (internal, asset, etc)
    sources_raw = request.query_params.get("sources", "internal,asset")
    sources = [s.strip() for s in sources_raw.split(",") if s.strip()]

    for s in sources:
        if s not in VALID_SEARCH_SOURCES:
            return Response(
                {
                    "error": f'Invalid source: "{s}"',
                    "code": "search_invalid_source",
                    "status": 400,
                },
                status=400,
            )

    # Pagination: limit and cursor
    try:
        limit = max(1, min(100, int(request.query_params.get("limit", "25"))))
    except ValueError:
        limit = 25

    cursor = request.query_params.get("cursor") or None
    request_id = request.META.get("HTTP_X_REQUEST_ID", "-")

    # Delegate to the search service
    result = run_search(
        image_id=image_id,
        query=query,
        sources=sources,
        limit=limit,
        cursor=cursor,
        request_id=request_id,
    )

    serializer = SearchResponseSerializer(result)
    return Response(serializer.data)

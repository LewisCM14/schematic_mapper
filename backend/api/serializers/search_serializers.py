"""
Serializers for search results and responses.
These define the API contract for the /api/search endpoint.
Used to serialize POI search results and the full search response payload.
"""

from typing import Any

from rest_framework import serializers


class SearchResultSerializer(serializers.Serializer[Any]):
    """
    Serializes a single search result (POI) for the UI.
    Fields match the SearchResultItem dataclass in the backend service.
    """

    fitting_position_id = serializers.CharField()
    label_text = serializers.CharField()
    image_id = serializers.UUIDField()
    x_coordinate = serializers.DecimalField(max_digits=10, decimal_places=3)
    y_coordinate = serializers.DecimalField(max_digits=10, decimal_places=3)
    component_name = serializers.CharField()
    matched_source = serializers.CharField()  # 'internal' or 'asset'
    matched_field = serializers.CharField()  # Which field matched (e.g., label_text)
    match_type = serializers.CharField()  # 'exact', 'prefix', or 'partial'


class SearchResponseSerializer(serializers.Serializer[Any]):
    """
    Serializes the full search response returned to the UI.
    Includes the original query, results, pagination info, and per-source status.
    """

    query = serializers.CharField()  # The search string
    image_id = serializers.UUIDField()  # Drawing being searched
    limit = serializers.IntegerField()  # Page size
    results = SearchResultSerializer(many=True)  # List of POI results
    source_status = serializers.DictField(
        child=serializers.CharField()
    )  # Status per source
    has_more = serializers.BooleanField()  # True if more results available
    next_cursor = serializers.CharField(allow_null=True)  # Cursor for next page
    request_id = serializers.CharField()  # Correlation ID for tracing

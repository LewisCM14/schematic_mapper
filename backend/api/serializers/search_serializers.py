"""Serializers for search results and responses."""

from typing import Any

from rest_framework import serializers


class SearchResultSerializer(serializers.Serializer[Any]):
    fitting_position_id = serializers.CharField()
    label_text = serializers.CharField()
    image_id = serializers.UUIDField()
    x_coordinate = serializers.DecimalField(max_digits=10, decimal_places=3)
    y_coordinate = serializers.DecimalField(max_digits=10, decimal_places=3)
    component_name = serializers.CharField()
    matched_source = serializers.CharField()
    matched_field = serializers.CharField()
    match_type = serializers.CharField()


class SearchResponseSerializer(serializers.Serializer[Any]):
    query = serializers.CharField()
    image_id = serializers.UUIDField()
    limit = serializers.IntegerField()
    results = SearchResultSerializer(many=True)
    source_status = serializers.DictField(child=serializers.CharField())
    has_more = serializers.BooleanField()
    next_cursor = serializers.CharField(allow_null=True)
    request_id = serializers.CharField()

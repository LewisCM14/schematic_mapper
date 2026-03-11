"""Serializers for admin upload and bulk fitting position operations."""

from typing import Any

from rest_framework import serializers

from api.models import ImageUpload


class UploadSessionCreateSerializer(serializers.Serializer[Any]):
    drawing_type_id = serializers.IntegerField()
    component_name = serializers.CharField(max_length=200)
    file_name = serializers.CharField(max_length=255)
    file_size = serializers.IntegerField(min_value=1, max_value=50 * 1024 * 1024)
    expected_checksum = serializers.CharField(max_length=64)
    idempotency_key = serializers.CharField(max_length=128)


class AdminImageUploadSerializer(serializers.Serializer[Any]):
    drawing_type_id = serializers.IntegerField()
    component_name = serializers.CharField(max_length=200)
    file_name = serializers.CharField(max_length=255)
    image_data = serializers.CharField()
    expected_checksum = serializers.CharField(max_length=64)


class UploadChunkSerializer(serializers.Serializer[Any]):
    chunk_data = serializers.CharField()  # base64-encoded chunk bytes


class UploadCompleteSerializer(serializers.Serializer[Any]):
    idempotency_key = serializers.CharField(max_length=128)


class UploadSessionSerializer(serializers.ModelSerializer[ImageUpload]):
    class Meta:
        model = ImageUpload
        fields = [
            "upload_id",
            "state",
            "file_name",
            "error_message",
            "uploader_identity",
        ]


class BulkFittingPositionItemSerializer(serializers.Serializer[Any]):
    fitting_position_id = serializers.CharField(max_length=64)
    label_text = serializers.CharField(max_length=100)
    x_coordinate = serializers.DecimalField(max_digits=10, decimal_places=3)
    y_coordinate = serializers.DecimalField(max_digits=10, decimal_places=3)
    width = serializers.DecimalField(max_digits=10, decimal_places=3, min_value=0)
    height = serializers.DecimalField(max_digits=10, decimal_places=3, min_value=0)


class BulkFittingPositionSerializer(serializers.Serializer[Any]):
    image_id = serializers.UUIDField()
    fitting_positions = BulkFittingPositionItemSerializer(many=True)

"""
Serializers for admin upload and mapping workflows.
These define the API contract for chunked upload, session state, and bulk POI mapping.
"""

from typing import Any

from rest_framework import serializers

from api.models import ImageUpload


class UploadSessionCreateSerializer(serializers.Serializer[Any]):
    """
    Validates input for creating a new upload session.
    Used in the admin upload stepper.
    """

    drawing_type_id = serializers.IntegerField()
    component_name = serializers.CharField(max_length=200)
    file_name = serializers.CharField(max_length=255)
    file_size = serializers.IntegerField(min_value=1, max_value=50 * 1024 * 1024)
    expected_checksum = serializers.CharField(max_length=64)
    idempotency_key = serializers.CharField(max_length=128)


class AdminImageUploadSerializer(serializers.Serializer[Any]):
    """
    Validates input for single-request admin image upload (not chunked).
    Used for trusted fast networks or small files.
    """

    drawing_type_id = serializers.IntegerField()
    component_name = serializers.CharField(max_length=200)
    file_name = serializers.CharField(max_length=255)
    image_data = serializers.CharField()
    expected_checksum = serializers.CharField(max_length=64)


class UploadChunkSerializer(serializers.Serializer[Any]):
    """
    Validates a single chunk upload (base64-encoded data).
    Used in the admin upload workflow.
    """

    chunk_data = serializers.CharField()  # base64-encoded chunk bytes


class UploadCompleteSerializer(serializers.Serializer[Any]):
    """
    Validates the finalize-upload request (idempotency key required).
    """

    idempotency_key = serializers.CharField(max_length=128)


class UploadSessionSerializer(serializers.ModelSerializer[ImageUpload]):
    """
    Serializes ImageUpload session state for the admin UI.
    Used to track progress and status of chunked uploads.
    """

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
    """
    Validates and serializes a single fitting position for bulk mapping.
    Used in the admin mapping workflow.
    """

    fitting_position_id = serializers.CharField(max_length=64)
    label_text = serializers.CharField(max_length=100)
    x_coordinate = serializers.DecimalField(max_digits=10, decimal_places=3)
    y_coordinate = serializers.DecimalField(max_digits=10, decimal_places=3)
    width = serializers.DecimalField(max_digits=10, decimal_places=3, min_value=0)
    height = serializers.DecimalField(max_digits=10, decimal_places=3, min_value=0)


class BulkFittingPositionSerializer(serializers.Serializer[Any]):
    """
    Validates and serializes a bulk mapping request for fitting positions.
    Used in the admin mapping workflow to replace all POIs for an image.
    """

    image_id = serializers.UUIDField()
    fitting_positions = BulkFittingPositionItemSerializer(many=True)

from typing import Any

from rest_framework import serializers

from .models import DrawingType, FittingPosition, Image, ImageUpload


class DrawingTypeSerializer(serializers.ModelSerializer[DrawingType]):
    class Meta:
        model = DrawingType
        fields = ["drawing_type_id", "type_name", "description", "is_active"]


class ImageSerializer(serializers.ModelSerializer[Image]):
    drawing_type = DrawingTypeSerializer(read_only=True)
    thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = Image
        fields = [
            "image_id",
            "component_name",
            "drawing_type",
            "width_px",
            "height_px",
            "uploaded_at",
            "thumbnail_url",
        ]

    def get_thumbnail_url(self, obj: Image) -> str | None:
        return None


class ImageDetailSerializer(serializers.ModelSerializer[Image]):
    drawing_type = DrawingTypeSerializer(read_only=True)
    image_svg = serializers.SerializerMethodField()

    class Meta:
        model = Image
        fields = [
            "image_id",
            "component_name",
            "drawing_type",
            "width_px",
            "height_px",
            "uploaded_at",
            "image_svg",
        ]

    def get_image_svg(self, obj: Image) -> str:
        return bytes(obj.image_binary).decode("utf-8")


class FittingPositionSerializer(serializers.ModelSerializer[FittingPosition]):
    class Meta:
        model = FittingPosition
        fields = [
            "fitting_position_id",
            "x_coordinate",
            "y_coordinate",
            "label_text",
            "is_active",
        ]


class AssetInfoSerializer(serializers.Serializer[Any]):
    asset_record_id = serializers.CharField()
    high_level_component = serializers.CharField()
    sub_system_name = serializers.CharField()
    sub_component_name = serializers.CharField()


class FittingPositionDetailSerializer(serializers.Serializer[Any]):
    fitting_position_id = serializers.CharField()
    label_text = serializers.CharField()
    x_coordinate = serializers.DecimalField(max_digits=10, decimal_places=3)
    y_coordinate = serializers.DecimalField(max_digits=10, decimal_places=3)
    asset = AssetInfoSerializer(allow_null=True)
    source_status = serializers.DictField(child=serializers.CharField())


# ── Admin upload ──────────────────────────────────────────────────────────────


class UploadSessionCreateSerializer(serializers.Serializer[Any]):
    drawing_type_id = serializers.IntegerField()
    component_name = serializers.CharField(max_length=200)
    file_name = serializers.CharField(max_length=255)
    file_size = serializers.IntegerField(min_value=1)
    expected_checksum = serializers.CharField(max_length=64)
    idempotency_key = serializers.CharField(max_length=128)


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


# ── Admin bulk fitting positions ──────────────────────────────────────────────


class BulkFittingPositionItemSerializer(serializers.Serializer[Any]):
    fitting_position_id = serializers.CharField(max_length=64)
    label_text = serializers.CharField(max_length=100)
    x_coordinate = serializers.DecimalField(max_digits=10, decimal_places=3)
    y_coordinate = serializers.DecimalField(max_digits=10, decimal_places=3)


class BulkFittingPositionSerializer(serializers.Serializer[Any]):
    image_id = serializers.UUIDField()
    fitting_positions = BulkFittingPositionItemSerializer(many=True)


# ── Search ────────────────────────────────────────────────────────────────────


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

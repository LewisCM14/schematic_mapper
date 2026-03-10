"""Serializers for Image, DrawingType, and FittingPosition resources."""

from typing import Any

from rest_framework import serializers

from api.models import DrawingType, FittingPosition, Image


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
        if obj.thumbnail:
            import base64

            encoded = base64.b64encode(bytes(obj.thumbnail)).decode("ascii")
            return f"data:image/png;base64,{encoded}"
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

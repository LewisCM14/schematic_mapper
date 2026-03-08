from rest_framework import serializers

from .models import DrawingType, FittingPosition, Image


class DrawingTypeSerializer(serializers.ModelSerializer[DrawingType]):
    class Meta:
        model = DrawingType
        fields = ["drawing_type_id", "type_name", "description", "is_active"]


class ImageSerializer(serializers.ModelSerializer[Image]):
    drawing_type = DrawingTypeSerializer(read_only=True)

    class Meta:
        model = Image
        fields = [
            "image_id",
            "component_name",
            "drawing_type",
            "width_px",
            "height_px",
            "uploaded_at",
        ]


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

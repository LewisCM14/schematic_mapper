import uuid

from django.db import models

UPLOAD_STATE_INITIATED = "initiated"
UPLOAD_STATE_UPLOADING = "uploading"
UPLOAD_STATE_VERIFYING = "verifying"
UPLOAD_STATE_COMPLETED = "completed"
UPLOAD_STATE_FAILED = "failed"
UPLOAD_STATE_ABORTED = "aborted"

UPLOAD_STATES = [
    (UPLOAD_STATE_INITIATED, "Initiated"),
    (UPLOAD_STATE_UPLOADING, "Uploading"),
    (UPLOAD_STATE_VERIFYING, "Verifying"),
    (UPLOAD_STATE_COMPLETED, "Completed"),
    (UPLOAD_STATE_FAILED, "Failed"),
    (UPLOAD_STATE_ABORTED, "Aborted"),
]


class DrawingType(models.Model):
    drawing_type_id = models.AutoField(primary_key=True)
    type_name = models.CharField(max_length=100, unique=True)
    description = models.CharField(max_length=200, blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "drawing_types"

    def __str__(self) -> str:
        return str(self.type_name)


class Image(models.Model):
    image_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    drawing_type = models.ForeignKey(
        DrawingType, on_delete=models.PROTECT, related_name="images"
    )
    component_name = models.CharField(max_length=200)
    image_binary = models.BinaryField()
    content_hash = models.CharField(max_length=64)
    width_px = models.IntegerField()
    height_px = models.IntegerField()
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "images"
        indexes = [
            models.Index(fields=["component_name"], name="idx_images_component_name"),
        ]

    def __str__(self) -> str:
        return f"{self.component_name} ({self.image_id})"


class FittingPosition(models.Model):
    fitting_position_id = models.CharField(max_length=64, primary_key=True)
    image = models.ForeignKey(
        Image, on_delete=models.CASCADE, related_name="fitting_positions"
    )
    x_coordinate = models.DecimalField(max_digits=10, decimal_places=3)
    y_coordinate = models.DecimalField(max_digits=10, decimal_places=3)
    label_text = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "fitting_positions"
        constraints = [
            models.UniqueConstraint(
                fields=["image", "label_text"], name="uq_image_label_text"
            )
        ]
        indexes = [
            models.Index(fields=["label_text"], name="idx_fp_label_text"),
        ]

    def __str__(self) -> str:
        return str(self.label_text)


class ImageUpload(models.Model):
    upload_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    drawing_type = models.ForeignKey(
        DrawingType, on_delete=models.PROTECT, related_name="uploads"
    )
    component_name = models.CharField(max_length=200)
    file_name = models.CharField(max_length=255)
    file_size = models.BigIntegerField()
    expected_checksum = models.CharField(max_length=64)
    idempotency_key = models.CharField(max_length=128, unique=True)
    state = models.CharField(
        max_length=20, choices=UPLOAD_STATES, default=UPLOAD_STATE_INITIATED
    )
    image = models.OneToOneField(
        Image,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="upload_session",
    )
    uploader_identity = models.CharField(max_length=255, blank=True, null=True)
    error_message = models.CharField(max_length=500, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "image_uploads"

    def __str__(self) -> str:
        return f"{self.file_name} ({self.state})"


class UploadChunk(models.Model):
    upload = models.ForeignKey(
        ImageUpload, on_delete=models.CASCADE, related_name="chunks"
    )
    part_number = models.PositiveIntegerField()
    data = models.BinaryField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "upload_chunks"
        constraints = [
            models.UniqueConstraint(
                fields=["upload", "part_number"], name="uq_upload_part"
            )
        ]

    def __str__(self) -> str:
        return f"Part {self.part_number} of {self.upload_id}"

import uuid
from django.db import models
from django.db.models.functions import Lower, Trim

# --- Upload session state constants ---
# These represent the lifecycle states for an image upload session.
UPLOAD_STATE_INITIATED = "initiated"  # Session created, no data yet
UPLOAD_STATE_UPLOADING = "uploading"  # Chunks are being uploaded
UPLOAD_STATE_VERIFYING = "verifying"  # Server is verifying checksum/type
UPLOAD_STATE_COMPLETED = "completed"  # Upload and commit successful
UPLOAD_STATE_FAILED = "failed"  # Upload failed (e.g. checksum mismatch)
UPLOAD_STATE_ABORTED = "aborted"  # Upload was cancelled by user

# All possible upload states, for use in model field choices.
UPLOAD_STATES = [
    (UPLOAD_STATE_INITIATED, "Initiated"),
    (UPLOAD_STATE_UPLOADING, "Uploading"),
    (UPLOAD_STATE_VERIFYING, "Verifying"),
    (UPLOAD_STATE_COMPLETED, "Completed"),
    (UPLOAD_STATE_FAILED, "Failed"),
    (UPLOAD_STATE_ABORTED, "Aborted"),
]


class DrawingType(models.Model):
    """
    Represents a category of mechanical drawing (e.g. 'composite', 'system').
    Used to classify images and enforce uniqueness of type names.
    """

    drawing_type_id = models.AutoField(primary_key=True)
    type_name = models.CharField(
        max_length=100,
        unique=True,
        help_text="Unique name for this drawing type (e.g. 'composite').",
    )
    description = models.CharField(
        max_length=200,
        blank=True,
        default="",
        help_text="Optional description of this drawing type.",
    )
    is_active = models.BooleanField(
        default=True, help_text="If false, this type is hidden from selection UIs."
    )
    created_at = models.DateTimeField(
        auto_now_add=True, help_text="Timestamp when this type was created."
    )

    class Meta:
        db_table = "drawing_types"

    def __str__(self) -> str:
        return str(self.type_name)


class Image(models.Model):
    """
    Stores a single uploaded mechanical drawing (SVG image) and its metadata.
    Each image belongs to a DrawingType and can have many FittingPositions.
    """

    image_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for this image.",
    )
    drawing_type = models.ForeignKey(
        DrawingType,
        on_delete=models.PROTECT,
        related_name="images",
        help_text="Drawing type/category for this image.",
    )
    component_name = models.CharField(
        max_length=200,
        help_text="Unique name for this drawing/component (case-insensitive, trimmed).",
    )
    image_binary = models.BinaryField(help_text="Raw SVG file data (as bytes).")
    content_hash = models.CharField(
        max_length=64, help_text="SHA-256 hash of the image file for deduplication."
    )
    width_px = models.IntegerField(help_text="Width of the SVG image in pixels.")
    height_px = models.IntegerField(help_text="Height of the SVG image in pixels.")
    thumbnail = models.BinaryField(
        null=True, blank=True, help_text="Optional thumbnail preview (auto-generated)."
    )
    uploaded_at = models.DateTimeField(
        auto_now_add=True, help_text="Timestamp when this image was uploaded."
    )

    class Meta:
        db_table = "images"
        constraints = [
            # Enforce unique component names (case-insensitive, trimmed)
            models.UniqueConstraint(
                Lower(Trim("component_name")),
                name="uq_images_component_name_normalized",
            )
        ]
        indexes = [
            models.Index(fields=["component_name"], name="idx_images_component_name"),
        ]

    def __str__(self) -> str:
        return f"{self.component_name} ({self.image_id})"


class FittingPosition(models.Model):
    """
    Represents a single point of interest (POI) on a drawing.
    Each fitting position is mapped to an (x, y) coordinate and label on an image.
    Used for overlaying markers and linking to asset/sensor data.
    """

    fitting_position_id = models.CharField(
        max_length=64,
        primary_key=True,
        help_text="Unique identifier for this fitting position (POI).",
    )
    image = models.ForeignKey(
        Image,
        on_delete=models.CASCADE,
        related_name="fitting_positions",
        help_text="The image this fitting position belongs to.",
    )
    x_coordinate = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        help_text="X coordinate of the POI on the image (SVG units).",
    )
    y_coordinate = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        help_text="Y coordinate of the POI on the image (SVG units).",
    )
    width = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        default=0,
        help_text="Width of the POI bounding box (0 for point markers).",
    )
    height = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        default=0,
        help_text="Height of the POI bounding box (0 for point markers).",
    )
    label_text = models.CharField(
        max_length=100,
        help_text="Human-readable label for this POI (unique per image).",
    )
    is_active = models.BooleanField(
        default=True, help_text="If false, this POI is hidden from the UI."
    )
    created_at = models.DateTimeField(
        auto_now_add=True, help_text="Timestamp when this POI was created."
    )
    updated_at = models.DateTimeField(
        auto_now=True, help_text="Timestamp when this POI was last updated."
    )

    class Meta:
        db_table = "fitting_positions"
        constraints = [
            # Enforce unique label per image
            models.UniqueConstraint(
                fields=["image", "label_text"], name="uq_image_label_text"
            )
        ]
        indexes = [
            models.Index(fields=["image"], name="idx_fp_image_id"),
            models.Index(fields=["label_text"], name="idx_fp_label_text"),
        ]

    def __str__(self) -> str:
        return str(self.label_text)


class ImageUpload(models.Model):
    """
    Tracks the state of an image upload session (for resumable/chunked uploads).
    Used by the admin workflow to stage uploads before committing to the Image table.
    """

    upload_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for this upload session.",
    )
    drawing_type = models.ForeignKey(
        DrawingType,
        on_delete=models.PROTECT,
        related_name="uploads",
        help_text="Drawing type for the image being uploaded.",
    )
    component_name = models.CharField(
        max_length=200, help_text="Component name for the image being uploaded."
    )
    file_name = models.CharField(
        max_length=255, help_text="Original filename of the uploaded image."
    )
    file_size = models.BigIntegerField(help_text="Size of the uploaded file in bytes.")
    expected_checksum = models.CharField(
        max_length=64,
        help_text="SHA-256 checksum provided by the client for integrity verification.",
    )
    idempotency_key = models.CharField(
        max_length=128,
        unique=True,
        help_text="Key to ensure repeated upload attempts are idempotent.",
    )
    state = models.CharField(
        max_length=20,
        choices=UPLOAD_STATES,
        default=UPLOAD_STATE_INITIATED,
        help_text="Current state of the upload session.",
    )
    image = models.OneToOneField(
        Image,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="upload_session",
        help_text="Reference to the committed Image (if upload completed).",
    )
    uploader_identity = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Optional: identity of the user who uploaded the image.",
    )
    error_message = models.CharField(
        max_length=500,
        blank=True,
        default="",
        help_text="Error message if the upload failed.",
    )
    created_at = models.DateTimeField(
        auto_now_add=True, help_text="Timestamp when the upload session was created."
    )
    updated_at = models.DateTimeField(
        auto_now=True, help_text="Timestamp when the upload session was last updated."
    )

    class Meta:
        db_table = "image_uploads"

    def __str__(self) -> str:
        return f"{self.file_name} ({self.state})"


class UploadChunk(models.Model):
    """
    Stores a single chunk of an in-progress image upload.
    Chunks are assembled in order to reconstruct the full image file.
    """

    upload = models.ForeignKey(
        ImageUpload,
        on_delete=models.CASCADE,
        related_name="chunks",
        help_text="The upload session this chunk belongs to.",
    )
    part_number = models.PositiveIntegerField(
        help_text="The sequential part number of this chunk (starting from 1)."
    )
    data = models.BinaryField(help_text="Raw bytes of this chunk.")
    created_at = models.DateTimeField(
        auto_now_add=True, help_text="Timestamp when this chunk was uploaded."
    )

    class Meta:
        db_table = "upload_chunks"
        constraints = [
            # Ensure each part number is unique per upload session
            models.UniqueConstraint(
                fields=["upload", "part_number"], name="uq_upload_part"
            )
        ]

    def __str__(self) -> str:
        return f"Part {self.part_number} of {self.upload.upload_id}"

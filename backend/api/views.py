import base64
import hashlib
import uuid

from django.db import OperationalError, connections
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response

from .asset_adapter import fetch_asset_details
from .models import (
    UPLOAD_STATE_ABORTED,
    UPLOAD_STATE_COMPLETED,
    UPLOAD_STATE_FAILED,
    UPLOAD_STATE_UPLOADING,
    UPLOAD_STATE_VERIFYING,
    DrawingType,
    FittingPosition,
    Image,
    ImageUpload,
    UploadChunk,
)
from .search_service import search as run_search
from .serializers import (
    BulkFittingPositionSerializer,
    FittingPositionDetailSerializer,
    FittingPositionSerializer,
    ImageDetailSerializer,
    ImageSerializer,
    SearchResponseSerializer,
    UploadChunkSerializer,
    UploadCompleteSerializer,
    UploadSessionCreateSerializer,
    UploadSessionSerializer,
)

VALID_SEARCH_SOURCES: frozenset[str] = frozenset({"internal", "asset", "sensor"})


@api_view(["GET"])
def health(request: Request) -> Response:
    try:
        connections["default"].ensure_connection()
        db_status = "ok"
    except OperationalError:
        db_status = "error"

    status_code = 200 if db_status == "ok" else 503
    return Response({"status": "ok", "database": db_status}, status=status_code)


@api_view(["GET"])
def list_images(request: Request) -> Response:
    qs = Image.objects.select_related("drawing_type").all()
    drawing_type_id = request.query_params.get("drawing_type_id")
    if drawing_type_id is not None:
        try:
            qs = qs.filter(drawing_type_id=int(drawing_type_id))
        except ValueError:
            return Response({"error": "drawing_type_id must be an integer"}, status=400)

    try:
        limit = max(1, min(100, int(request.query_params.get("limit", "25"))))
    except ValueError:
        limit = 25

    cursor = request.query_params.get("cursor") or None
    offset = 0
    if cursor:
        try:
            offset = int(base64.b64decode(cursor).decode("utf-8"))
        except Exception:
            offset = 0

    total = qs.count()
    page_qs = qs[offset : offset + limit]
    has_more = (offset + limit) < total
    next_cursor: str | None = (
        base64.b64encode(str(offset + limit).encode()).decode() if has_more else None
    )

    serializer = ImageSerializer(page_qs, many=True)
    return Response(
        {"results": serializer.data, "has_more": has_more, "next_cursor": next_cursor}
    )


@api_view(["GET"])
def get_image(request: Request, image_id: uuid.UUID) -> Response:
    image = get_object_or_404(Image.objects.select_related("drawing_type"), pk=image_id)
    serializer = ImageDetailSerializer(image)
    return Response(serializer.data)


@api_view(["GET"])
def list_fitting_positions(request: Request, image_id: uuid.UUID) -> Response:
    get_object_or_404(Image, pk=image_id)
    positions = FittingPosition.objects.filter(image_id=image_id)
    serializer = FittingPositionSerializer(positions, many=True)
    return Response(serializer.data)


@api_view(["GET"])
def get_fitting_position_details(
    request: Request, fitting_position_id: str
) -> Response:
    fp = get_object_or_404(FittingPosition, pk=fitting_position_id)
    asset_result = fetch_asset_details(fitting_position_id)

    asset_data = None
    if asset_result.record is not None:
        rec = asset_result.record
        asset_data = {
            "asset_record_id": rec.asset_record_id,
            "high_level_component": rec.high_level_component,
            "sub_system_name": rec.sub_system_name,
            "sub_component_name": rec.sub_component_name,
        }

    payload = {
        "fitting_position_id": fp.fitting_position_id,
        "label_text": fp.label_text,
        "x_coordinate": fp.x_coordinate,
        "y_coordinate": fp.y_coordinate,
        "asset": asset_data,
        "source_status": {"asset": asset_result.source_status},
    }
    serializer = FittingPositionDetailSerializer(payload)
    return Response(serializer.data)


# ── Admin upload ──────────────────────────────────────────────────────────────


@api_view(["POST"])
def create_upload_session(request: Request) -> Response:
    serializer = UploadSessionCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    data = serializer.validated_data
    idempotency_key: str = data["idempotency_key"]

    # Idempotency: return existing session if key already used
    existing = ImageUpload.objects.filter(idempotency_key=idempotency_key).first()
    if existing is not None:
        return Response(UploadSessionSerializer(existing).data, status=200)

    drawing_type = get_object_or_404(DrawingType, pk=data["drawing_type_id"])
    session = ImageUpload.objects.create(
        drawing_type=drawing_type,
        component_name=data["component_name"],
        file_name=data["file_name"],
        file_size=data["file_size"],
        expected_checksum=data["expected_checksum"],
        idempotency_key=idempotency_key,
    )
    return Response(UploadSessionSerializer(session).data, status=201)


@api_view(["PUT"])
def upload_chunk(request: Request, upload_id: uuid.UUID, part_number: int) -> Response:
    session = get_object_or_404(
        ImageUpload,
        pk=upload_id,
    )
    if session.state not in (
        UPLOAD_STATE_UPLOADING,
        "initiated",
    ):
        return Response(
            {"error": f"Cannot upload chunk in state '{session.state}'"},
            status=409,
        )

    serializer = UploadChunkSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    try:
        chunk_bytes = base64.b64decode(serializer.validated_data["chunk_data"])
    except Exception:
        return Response({"error": "Invalid base64 data"}, status=400)

    UploadChunk.objects.update_or_create(
        upload=session,
        part_number=part_number,
        defaults={"data": chunk_bytes},
    )

    if session.state == "initiated":
        session.state = UPLOAD_STATE_UPLOADING
        session.save(update_fields=["state", "updated_at"])

    return Response(
        {
            "upload_id": str(session.upload_id),
            "part_number": part_number,
            "state": session.state,
        },
        status=200,
    )


@api_view(["POST"])
def complete_upload(request: Request, upload_id: uuid.UUID) -> Response:
    session = get_object_or_404(ImageUpload, pk=upload_id)
    if session.state == UPLOAD_STATE_COMPLETED:
        # Idempotent: already done
        return Response(
            {
                "upload_id": str(session.upload_id),
                "image_id": str(session.image_id),
                "state": session.state,
            },
            status=200,
        )
    if session.state not in (UPLOAD_STATE_UPLOADING, "initiated"):
        return Response(
            {"error": f"Cannot complete upload in state '{session.state}'"},
            status=409,
        )

    serializer = UploadCompleteSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    session.state = UPLOAD_STATE_VERIFYING
    session.save(update_fields=["state", "updated_at"])

    # Assemble chunks in part_number order
    chunks = list(session.chunks.order_by("part_number"))
    if not chunks:
        session.state = UPLOAD_STATE_FAILED
        session.error_message = "No chunks uploaded"
        session.save(update_fields=["state", "error_message", "updated_at"])
        return Response({"error": "No chunks uploaded"}, status=422)

    assembled = b"".join(bytes(c.data) for c in chunks)

    # Verify checksum
    actual_checksum = hashlib.sha256(assembled).hexdigest()
    if actual_checksum != session.expected_checksum:
        session.state = UPLOAD_STATE_FAILED
        session.error_message = "Checksum mismatch"
        session.save(update_fields=["state", "error_message", "updated_at"])
        return Response(
            {"error": "Checksum mismatch", "code": "checksum_mismatch"}, status=422
        )

    # Detect image dimensions (SVG: use fixed 800×600 for prototype)
    width_px = 800
    height_px = 600

    image = Image.objects.create(
        drawing_type=session.drawing_type,
        component_name=session.component_name,
        image_binary=assembled,
        content_hash=actual_checksum,
        width_px=width_px,
        height_px=height_px,
    )

    session.state = UPLOAD_STATE_COMPLETED
    session.image = image
    session.save(update_fields=["state", "image", "updated_at"])

    # Clean up chunks
    session.chunks.all().delete()

    return Response(
        {
            "upload_id": str(session.upload_id),
            "image_id": str(image.image_id),
            "state": session.state,
        },
        status=201,
    )


@api_view(["DELETE"])
def abort_upload(request: Request, upload_id: uuid.UUID) -> Response:
    session = get_object_or_404(ImageUpload, pk=upload_id)
    if session.state == UPLOAD_STATE_COMPLETED:
        return Response({"error": "Cannot abort a completed upload"}, status=409)

    session.chunks.all().delete()
    session.state = UPLOAD_STATE_ABORTED
    session.save(update_fields=["state", "updated_at"])
    return Response(status=204)


# ── Admin bulk fitting positions ──────────────────────────────────────────────


@api_view(["POST"])
def bulk_fitting_positions(request: Request) -> Response:
    serializer = BulkFittingPositionSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    data = serializer.validated_data
    image = get_object_or_404(Image, pk=data["image_id"])

    fp_ids = [item["fitting_position_id"] for item in data["fitting_positions"]]
    if len(fp_ids) != len(set(fp_ids)):
        return Response(
            {
                "error": "Duplicate fitting_position_id values in payload",
                "code": "bulk_duplicate_ids",
                "status": 400,
            },
            status=400,
        )

    created = 0
    updated = 0
    for item in data["fitting_positions"]:
        _, was_created = FittingPosition.objects.update_or_create(
            fitting_position_id=item["fitting_position_id"],
            defaults={
                "image": image,
                "label_text": item["label_text"],
                "x_coordinate": item["x_coordinate"],
                "y_coordinate": item["y_coordinate"],
                "is_active": True,
            },
        )
        if was_created:
            created += 1
        else:
            updated += 1

    return Response({"created": created, "updated": updated}, status=200)


# ── Search ────────────────────────────────────────────────────────────────────


@api_view(["GET"])
def search_view(request: Request) -> Response:
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

    try:
        image_id = uuid.UUID(image_id_raw)
    except ValueError:
        return Response({"error": "image_id must be a valid UUID"}, status=400)

    query = request.query_params.get("query", "").strip()
    if len(query) < 2:
        return Response(
            {"error": "query must be at least 2 characters", "code": "query_too_short"},
            status=400,
        )

    get_object_or_404(Image, pk=image_id)

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

    try:
        limit = max(1, min(100, int(request.query_params.get("limit", "25"))))
    except ValueError:
        limit = 25

    cursor = request.query_params.get("cursor") or None
    request_id = request.META.get("HTTP_X_REQUEST_ID", "-")

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

from django.urls import path

from .views import (
    abort_upload,
    bulk_fitting_positions,
    complete_upload,
    create_upload_session,
    get_fitting_position_details,
    get_image,
    health,
    list_fitting_positions,
    list_images,
    search_view,
    upload_chunk,
)

urlpatterns = [
    path("health", health),
    path("images", list_images),
    path("images/<uuid:image_id>", get_image),
    path("images/<uuid:image_id>/fitting-positions", list_fitting_positions),
    path(
        "fitting-positions/<str:fitting_position_id>/details",
        get_fitting_position_details,
    ),
    path("search", search_view),
    # Admin endpoints
    path("admin/uploads", create_upload_session),
    path("admin/uploads/<uuid:upload_id>/parts/<int:part_number>", upload_chunk),
    path("admin/uploads/<uuid:upload_id>/complete", complete_upload),
    path("admin/uploads/<uuid:upload_id>", abort_upload),
    path("admin/fitting-positions/bulk", bulk_fitting_positions),
]

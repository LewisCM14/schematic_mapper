from django.urls import path

from .views import (
    admin_upload_image,
    bulk_fitting_positions,
    complete_upload,
    create_upload_session,
    delete_fitting_position,
    get_fitting_position_details,
    get_image,
    health,
    list_drawing_types,
    list_fitting_positions,
    list_images,
    search_view,
    upload_chunk,
    upload_session_detail,
)

urlpatterns = [
    path("health", health),
    path("drawing-types", list_drawing_types),
    path("images", list_images),
    path("images/<uuid:image_id>", get_image),
    path("images/<uuid:image_id>/fitting-positions", list_fitting_positions),
    path(
        "fitting-positions/<str:fitting_position_id>/details",
        get_fitting_position_details,
    ),
    path("search", search_view),
    # Admin endpoints
    path("admin/images", admin_upload_image),
    path("admin/uploads", create_upload_session),
    path("admin/uploads/<uuid:upload_id>/parts/<int:part_number>", upload_chunk),
    path("admin/uploads/<uuid:upload_id>/complete", complete_upload),
    path("admin/uploads/<uuid:upload_id>", upload_session_detail),
    path("admin/fitting-positions/bulk", bulk_fitting_positions),
    path(
        "admin/fitting-positions/<str:fitting_position_id>",
        delete_fitting_position,
    ),
]

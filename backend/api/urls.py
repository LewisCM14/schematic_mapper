"""
URL routing for the Schematic Mapper API.
Defines all public and admin endpoints for health checks, image management, fitting positions, and upload workflows.
Each path is mapped to a view function for handling the corresponding HTTP request.
"""

from django.urls import path

from .views import (
    admin_upload_image,  # Admin: upload a new image
    bulk_fitting_positions,  # Admin: bulk create/update fitting positions
    complete_upload,  # Admin: complete an upload session
    create_upload_session,  # Admin: start a new upload session
    delete_fitting_position,  # Admin: delete a fitting position
    get_fitting_position_details,  # Get details for a specific fitting position
    get_image,  # Get a single image by ID
    health,  # Health check endpoint
    list_drawing_types,  # List all drawing types
    list_fitting_positions,  # List all fitting positions for an image
    list_images,  # List all images
    search_view,  # Search endpoint
    upload_chunk,  # Admin: upload a chunk of an image
    upload_session_detail,  # Admin: get upload session details
)

# Public and admin API endpoints
urlpatterns = [
    # Health check
    path("health", health),
    # Drawing types
    path("drawing-types", list_drawing_types),
    # Image listing and retrieval
    path("images", list_images),
    path("images/<uuid:image_id>", get_image),
    # Fitting positions for a given image
    path("images/<uuid:image_id>/fitting-positions", list_fitting_positions),
    # Fitting position details
    path(
        "fitting-positions/<str:fitting_position_id>/details",
        get_fitting_position_details,
    ),
    # Search
    path("search", search_view),
    # --- Admin endpoints ---
    # Admin: upload a new image
    path("admin/images", admin_upload_image),
    # Admin: create a new upload session
    path("admin/uploads", create_upload_session),
    # Admin: upload a chunk for a session
    path("admin/uploads/<uuid:upload_id>/parts/<int:part_number>", upload_chunk),
    # Admin: complete an upload session
    path("admin/uploads/<uuid:upload_id>/complete", complete_upload),
    # Admin: get upload session details
    path("admin/uploads/<uuid:upload_id>", upload_session_detail),
    # Admin: bulk create/update fitting positions
    path("admin/fitting-positions/bulk", bulk_fitting_positions),
    # Admin: delete a fitting position
    path(
        "admin/fitting-positions/<str:fitting_position_id>",
        delete_fitting_position,
    ),
]

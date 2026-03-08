from django.urls import path

from .views import (
    get_fitting_position_details,
    get_image,
    health,
    list_fitting_positions,
    list_images,
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
]

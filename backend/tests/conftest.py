from unittest.mock import patch
from django.test import Client
from collections.abc import Callable
from typing import Any, Tuple, List

import pytest

from api.models import DrawingType, Image


@pytest.fixture
def drawing_type(db: None) -> DrawingType:
    return DrawingType.objects.create(type_name="composite")


@pytest.fixture
def image(drawing_type: DrawingType) -> Image:
    return Image.objects.create(
        drawing_type=drawing_type,
        component_name="Cooling Assembly",
        image_binary=b"<svg/>",
        content_hash="abc123",
        width_px=800,
        height_px=600,
    )


@pytest.fixture
def auth_client() -> Callable[[str, List[str]], Tuple[Client, dict[str, str], Any]]:
    """
    Fixture to create a Django test client with REMOTE_USER and patch get_user_groups.

    Usage:
        # To mock an app_admin user:
        client, environ, patcher = auth_client("DOMAIN\\user", ["app_admin"])
        with patcher:
            response = client.get(..., **environ)

        # To mock an app_viewer user:
        client, environ, patcher = auth_client("DOMAIN\\user", ["app_viewer"])
        with patcher:
            response = client.get(..., **environ)

        # To mock a user in both groups:
        client, environ, patcher = auth_client("DOMAIN\\user", ["app_admin", "app_viewer"])
        with patcher:
            response = client.get(..., **environ)

    Pass the desired AD groups as the second argument to simulate different permissions.
    """

    def _make(user: str, groups: List[str]) -> Tuple[Client, dict[str, str], Any]:
        client = Client()
        environ = {"REMOTE_USER": user}
        patcher = patch("api.ad_utils.get_user_groups", return_value=groups)
        return client, environ, patcher

    return _make

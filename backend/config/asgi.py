"""
ASGI config for config project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application


# Set the default Django settings module for ASGI
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

# Create the ASGI application callable for use by ASGI servers (e.g., Daphne, Uvicorn)
application = get_asgi_application()

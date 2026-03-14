"""
App configuration for the Schematic Mapper API Django app.
Defines the application namespace and allows for future app-specific configuration.
"""

from django.apps import AppConfig


class ApiConfig(AppConfig):
    """
    Django AppConfig for the 'api' app.
    Sets the app's name and provides a hook for app-specific initialization if needed.
    """

    name = "api"

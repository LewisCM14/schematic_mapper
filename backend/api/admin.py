"""
Admin configuration for the Schematic Mapper backend.
Registers core models with the Django admin interface for easy management by superusers.
"""

from django.contrib import admin

from .models import DrawingType, FittingPosition, Image

# Register DrawingType model for admin CRUD operations
admin.site.register(DrawingType)

# Register Image model for admin CRUD operations
admin.site.register(Image)

# Register FittingPosition model for admin CRUD operations
admin.site.register(FittingPosition)

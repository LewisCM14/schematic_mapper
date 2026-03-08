from django.contrib import admin

from .models import DrawingType, FittingPosition, Image

admin.site.register(DrawingType)
admin.site.register(Image)
admin.site.register(FittingPosition)

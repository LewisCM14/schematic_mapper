# Adds indexes on FITTING_POSITIONS(label_text) and IMAGES(component_name)
# as specified in the Search Architecture performance strategy.

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0002_add_image_upload_and_chunks"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="fittingposition",
            index=models.Index(fields=["label_text"], name="idx_fp_label_text"),
        ),
        migrations.AddIndex(
            model_name="image",
            index=models.Index(
                fields=["component_name"], name="idx_images_component_name"
            ),
        ),
    ]

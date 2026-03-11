from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0007_image_component_name_normalized_unique"),
    ]

    operations = [
        migrations.AddField(
            model_name="fittingposition",
            name="height",
            field=models.DecimalField(decimal_places=3, default=0, max_digits=10),
        ),
        migrations.AddField(
            model_name="fittingposition",
            name="width",
            field=models.DecimalField(decimal_places=3, default=0, max_digits=10),
        ),
    ]
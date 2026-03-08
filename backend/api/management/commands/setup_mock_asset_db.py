from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import connections


class Command(BaseCommand):
    help = "Apply mock asset database schema and seed data"

    def handle(self, *args, **options):
        sql_path = Path(__file__).resolve().parents[3] / "scripts" / "mock_asset_db.sql"
        sql = sql_path.read_text()

        with connections["asset"].cursor() as cursor:
            cursor.execute(sql)

        self.stdout.write(self.style.SUCCESS("Mock asset database setup complete."))

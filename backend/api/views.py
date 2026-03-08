from django.db import connections, OperationalError
from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(["GET"])
def health(request):
    try:
        connections["default"].ensure_connection()
        db_status = "ok"
    except OperationalError:
        db_status = "error"

    status_code = 200 if db_status == "ok" else 503
    return Response({"status": "ok", "database": db_status}, status=status_code)

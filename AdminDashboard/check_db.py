from dashboard.models import Environment
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "dashboard.settings")
django.setup()

print("Environment model imported successfully.")
print(f"Count: {Environment.objects.count()}")

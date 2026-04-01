import os
import django
import json

# Try both ways
try:
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dashboard.settings')
    django.setup()
except:
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'AdminDashboard.dashboard.settings')
    django.setup()

from authentication.models import TelemetryPulse

def check_db():
    print("--- SQLITE DIAGNOSTIC ---")
    total = TelemetryPulse.objects.count()
    print(f"Total Pulses: {total}")
    
    devs = TelemetryPulse.objects.values('developer_id').distinct()
    for dev in devs:
        uid = dev['developer_id']
        count = TelemetryPulse.objects.filter(developer_id=uid).count()
        print(f"User: {uid} | Pulses: {count}")
    print("-------------------------")

if __name__ == "__main__":
    check_db()

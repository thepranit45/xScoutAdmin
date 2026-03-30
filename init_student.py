import os
import django
import sys

# Change directory to where manage.py is
project_root = r"d:\xScout\AdminDashboard"
if not project_root in sys.path:
    sys.path.append(project_root)
os.chdir(project_root)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dashboard.settings')

django.setup()

from authentication.models import AuthorizedID

def init_s2():
    student_id = "s2"
    if not AuthorizedID.objects.filter(student_id=student_id).exists():
        AuthorizedID.objects.create(
            student_id=student_id, 
            description="Default Development Student",
            is_active=True
        )
        print(f"[OK] Student ID '{student_id}' added to local ledger.")
    else:
        # Just ensure it's active
        s = AuthorizedID.objects.get(student_id=student_id)
        s.is_active = True
        s.save()
        print(f"[INFO] Student ID '{student_id}' already existed (Syncing status: ACTIVE).")

if __name__ == "__main__":
    try:
        init_s2()
    except Exception as e:
        print(f"[ERROR] Error initializing student ID: {e}")

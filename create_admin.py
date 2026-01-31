"""
Script to create default admin user for xScout Admin Dashboard
"""
import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dashboard.settings')
django.setup()

from django.contrib.auth.models import User

# Create admin user
username = 'admin'
password = 'admin123'
email = 'admin@xscout.local'

# Check if user already exists
if User.objects.filter(username=username).exists():
    print(f"[OK] User '{username}' already exists!")
    user = User.objects.get(username=username)
    print(f"   Email: {user.email}")
    print(f"   Is superuser: {user.is_superuser}")
else:
    # Create new superuser
    user = User.objects.create_superuser(
        username=username,
        email=email,
        password=password
    )
    print(f"[OK] Created admin user successfully!")
    print(f"   Username: {username}")
    print(f"   Password: {password}")
    print(f"   Email: {email}")
    print(f"\n[WARNING] IMPORTANT: Change this password after first login!")

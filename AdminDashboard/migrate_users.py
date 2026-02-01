import os
import django
import firebase_admin
from firebase_admin import credentials, firestore
import datetime

# Setup Django Environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dashboard.settings')
django.setup()

from authentication.models import AuthorizedID

# Setup Firebase
if not firebase_admin._apps:
    cred = credentials.Certificate('serviceAccountKey.json')
    firebase_admin.initialize_app(cred)

db = firestore.client()

def migrate():
    print("Starting migration from SQLite to Firestore...")
    
    users = AuthorizedID.objects.all()
    count = 0
    
    for user in users:
        print(f"Migrating: {user.student_id}")
        
        doc_ref = db.collection('authorized_users').document(user.student_id)
        if not doc_ref.get().exists:
            doc_ref.set({
                'student_id': user.student_id,
                'description': user.description,
                'is_active': user.is_active,
                'created_at': user.created_at.isoformat() if user.created_at else datetime.datetime.now().isoformat()
            })
            count += 1
            print(f" -> Copied.")
        else:
            print(f" -> Already exists in Firestore. Skipping.")

    print(f"Migration complete. Copied {count} users.")

if __name__ == '__main__':
    migrate()

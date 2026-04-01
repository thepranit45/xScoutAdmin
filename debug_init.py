
import os
import firebase_admin
from firebase_admin import credentials, firestore

def test_init():
    db = None
    init_error = "Success"
    print("Starting Firebase Init logic...")
    try:
        if not firebase_admin._apps:
            # Replicate views.py logic
            # views.py is in dashboard/
            # so root_dir for it is one level up from dashboard/
            # Here we just use current dir as root_dir
            root_dir = os.getcwd()
            print(f"Searching in: {root_dir}")
            
            json_file = next((f for f in os.listdir(root_dir) if f.endswith('.json') and ('firebase' in f.lower() or 'service' in f.lower())), None)
            print(f"Found JSON: {json_file}")
            
            if json_file:
                cred_path = os.path.join(root_dir, json_file)
                print(f"Cred path: {cred_path}")
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
                print("Firebase Initialized with cert.")
            else:
                firebase_admin.initialize_app()
                print("Firebase Initialized with defaults.")
        
        db = firestore.client()
        print(f"Firestore Client: {db}")
        
        # Test a real call
        print("Testing Firestore call...")
        docs = db.collection('reports').limit(1).stream()
        for doc in docs:
            print(f"Found doc: {doc.id}")
            break
        print("Firestore call successful.")
        
    except Exception as e:
        print(f"Init Error: {e}")
        try:
            db = firestore.client()
            print(f"Recovered Client: {db}")
        except Exception as e2:
            print(f"Recovery failed: {e2}")

if __name__ == "__main__":
    test_init()

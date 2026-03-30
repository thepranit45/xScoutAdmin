import firebase_admin
from firebase_admin import credentials, firestore
import os

def check():
    current_dir = os.getcwd()
    cred_path = os.path.join(current_dir, 'xscout-68489-firebase-adminsdk-fbsvc-71d744a27c.json')
    if not os.path.exists(cred_path):
        cred_path = os.path.join(current_dir, 'serviceAccountKey.json')
    
    print(f"Checking credentials at: {cred_path}")
    if not os.path.exists(cred_path):
        print("Credentials not found!")
        return

    try:
        if not firebase_admin._apps:
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        
        db = firestore.client()
        print("Successfully connected to Firestore.")
        
        # Test reading reports
        docs = db.collection('reports').stream()
        count = 0
        print("Counting reports...")
        for doc in docs:
            count += 1
        print(f"Total reports: {count}")
            
    except Exception as e:
        print(f"Firebase Error: {e}")

if __name__ == "__main__":
    check()

import firebase_admin
from firebase_admin import credentials, firestore
import json
import os
from datetime import datetime

def check_serializability():
    current_dir = os.getcwd()
    cred_path = os.path.join(current_dir, 'xscout-68489-firebase-adminsdk-fbsvc-71d744a27c.json')
    if not os.path.exists(cred_path):
        cred_path = os.path.join(current_dir, 'serviceAccountKey.json')
    
    if not os.path.exists(cred_path):
        print("Credentials not found!")
        return

    try:
        if not firebase_admin._apps:
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        
        db = firestore.client()
        docs = db.collection('reports').stream()
        
        def serialize_helper(item):
            if isinstance(item, list):
                return [serialize_helper(i) for i in item]
            if isinstance(item, dict):
                return {k: serialize_helper(v) for k, v in item.items()}
            if isinstance(item, datetime):
                return item.isoformat()
            return item

        for doc in docs:
            data = doc.to_dict()
            serialized = serialize_helper(data)
            try:
                json.dumps(serialized)
            except TypeError as te:
                print(f"FAILED for document {doc.id}: {te}")
                # Find which key failed
                for k, v in data.items():
                    try:
                        json.dumps(serialize_helper(v))
                    except:
                        print(f"  --> Key '{k}' with value type {type(v)} failed.")
                        # Check deep
                        if isinstance(v, dict):
                            for k2, v2 in v.items():
                                try:
                                    json.dumps(serialize_helper(v2))
                                except:
                                    print(f"      --> Sub-key '{k2}' with value type {type(v2)} failed.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_serializability()

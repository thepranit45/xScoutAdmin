import firebase_admin
from firebase_admin import credentials, firestore

# Setup Firebase (Same as views.py)
if not firebase_admin._apps:
    cred = credentials.Certificate(
        "d:/xScout/xscout-68489-firebase-adminsdk-fbsvc-71d744a27c.json"
    )
    firebase_admin.initialize_app(cred)

db = firestore.client()

print("--- ENVIRONMENTS ---")
envs = db.collection("environments").stream()
for doc in envs:
    print(f"Code: {doc.id} => {doc.to_dict()}")

print("\n--- TELEMETRY (Users) ---")
users = db.collection("telemetry").stream()
found_any = False
for doc in users:
    found_any = True
    data = doc.to_dict()
    env = data.get("environment", "MISSING")
    print(
        f"User: {doc.id} | Env: {env} | Last Update: {data.get('timestamp')}"
    )

if not found_any:
    print("No users found in telemetry.")

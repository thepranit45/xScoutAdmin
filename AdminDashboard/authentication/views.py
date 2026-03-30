from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.contrib.auth.decorators import login_required
from .models import AuthorizedID
import json
import firebase_admin
from firebase_admin import credentials, firestore
import os
import datetime

# Robust Firebase Initialization (Singleton)
db = None
try:
    if not firebase_admin._apps:
        current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        # Search for any valid firebase json
        json_file = next((f for f in os.listdir(current_dir) if f.endswith('.json') and 'firebase-adminsdk' in f), 'serviceAccountKey.json')
        json_path = os.path.join(current_dir, json_file)

        if not os.path.exists(json_path):
             # Try parent dir
             json_path = os.path.join(current_dir, "..", json_file)

        if os.path.exists(json_path):
            cred = credentials.Certificate(json_path)
            firebase_admin.initialize_app(cred)
            db = firestore.client()
            print("✅ Admin Auth Engine (Firebase): INITIALIZED")
        else:
            print("⚠️ Admin Auth Engine: Credentials not found (Cloud Fallback Disabled)")
    else:
        db = firestore.client()
except Exception as e:
    print(f"❌ Firebase Init Error (Auth): {e}")
    db = None

@csrf_exempt
@require_POST
def verify_student_id(request):
    try:
        data = json.loads(request.body.decode('utf-8'))
        student_id = data.get("student_id", "").strip()

        if not student_id:
            return JsonResponse({"success": False, "message": "ID Required"}, status=400)

        print(f"📡 Verifying ID: {student_id}")

        # --- STEP 1: Check Local Ledger (Primary) ---
        try:
            student = AuthorizedID.objects.get(student_id=student_id)
            if student.is_active:
                print(f"✅ Auth Success (Local): {student_id}")
                return JsonResponse({
                    "success": True,
                    "message": "Authorized (Local)",
                    "redirect": "/dashboard/",
                })
            else:
                return JsonResponse({"success": False, "message": "Access Suspended Locally"}, status=403)
        except AuthorizedID.DoesNotExist:
            print(f"ℹ️ ID {student_id} not in local ledger, checking cloud...")

        # --- STEP 2: Check Cloud (Fallback) ---
        if db:
            try:
                # Try both collection names for compatibility
                for coll in ["authorized_users", "authorized_students"]:
                    doc_ref = db.collection(coll).document(student_id)
                    doc = doc_ref.get()
                    if doc.exists:
                        u_data = doc.to_dict()
                        if u_data.get("is_active", True) or u_data.get("isActive", True):
                            # Auto-cache to local ledger
                            AuthorizedID.objects.get_or_create(student_id=student_id, defaults={'description': 'Auto-Synced Cloud User'})
                            print(f"✅ Auth Success (Cloud): {student_id}")
                            return JsonResponse({
                                "success": True,
                                "message": "Authorized (Cloud)",
                                "redirect": "/dashboard/",
                            })
            except Exception as fe:
                print(f"❌ Cloud Check Error: {fe}")

        return JsonResponse({"success": False, "message": "ID Not Authorized"}, status=403)

    except Exception as e:
        err_msg = str(e)
        print(f"❌ Auth Crash: {err_msg}")
        if "Errno 5" in err_msg:
            err_msg = "Critical DB Lock / IO Error. Please restart the proctor server."
        return JsonResponse({"success": False, "message": err_msg}, status=500)

@csrf_exempt
@require_POST
@login_required
def add_authorized_user(request):
    try:
        data = json.loads(request.body)
        student_id = data.get("student_id")
        description = data.get("description", "")

        if not student_id: return JsonResponse({"success": False, "message": "ID Required"}, status=400)
            
        AuthorizedID.objects.get_or_create(student_id=student_id, defaults={'description': description, 'is_active': True})

        if db:
            try:
                db.collection("authorized_users").document(student_id).set({
                    "student_id": student_id,
                    "description": description,
                    "is_active": True,
                    "timestamp": datetime.datetime.now().isoformat()
                })
            except: pass

        return JsonResponse({"success": True, "message": "User added"})
    except Exception as e:
        return JsonResponse({"success": False, "message": str(e)}, status=500)

@login_required
def get_authorized_users(request):
    users = AuthorizedID.objects.all().order_by("-created_at").values("student_id", "description", "is_active", "created_at")
    return JsonResponse({"success": True, "users": list(users)})

@csrf_exempt
@require_POST
@login_required
def toggle_user_status(request):
    try:
        data = json.loads(request.body)
        student_id = data.get("student_id")
        user = AuthorizedID.objects.get(student_id=student_id)
        user.is_active = not user.is_active
        user.save()
        if db:
            try: db.collection("authorized_users").document(student_id).update({"is_active": user.is_active})
            except: pass
        return JsonResponse({"success": True, "active": user.is_active})
    except Exception as e:
        return JsonResponse({"success": False, "message": str(e)}, status=500)

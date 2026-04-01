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

# STRICT LOCAL AUTH OVERRIDE (Neutralize Cloud Deadlock)
def get_auth_db(): return None

@csrf_exempt
@require_POST
def verify_student_id(request):
    try:
        data = json.loads(request.body.decode('utf-8'))
        student_id = data.get("student_id", "").strip()

        if not student_id:
            return JsonResponse({"success": False, "message": "ID Required"}, status=400)

        print(f"Verifying ID: {student_id}")

        # --- STEP 1: Check Local Ledger (Primary) ---
        try:
            student = AuthorizedID.objects.get(student_id=student_id)
            if student.is_active:
                print(f"Auth Success (Local): {student_id}")
                return JsonResponse({
                    "success": True,
                    "message": "Authorized (Local)",
                    "redirect": "/dashboard/",
                })
            else:
                return JsonResponse({"success": False, "message": "Access Suspended Locally"}, status=403)
        except AuthorizedID.DoesNotExist:
            print(f"[AUTH] ID {student_id} not in local ledger, cloud check disabled.")

        # Cloud Fallback (Disabled for high-speed local mode)
        return JsonResponse({"success": False, "message": "ID Not Authorized in Local Ledger"}, status=403)

    except Exception as e:
        err_msg = str(e)
        print(f"Auth Crash: {err_msg}")
        if "Errno 5" in err_msg:
            err_msg = "Critical DB Lock / IO Error. Please restart the proctor server."
        return JsonResponse({"success": False, "message": err_msg}, status=500)

@csrf_exempt
@require_POST
@login_required
@csrf_exempt
@login_required
def add_authorized_user(request):
    try:
        data = json.loads(request.body)
        student_id = data.get("student_id")
        description = data.get("description", "")

        if not student_id:
            return JsonResponse({"success": False, "message": "ID Required"}, status=400)
            
        # STEP 1: Immediate Local Commit (Always works)
        AuthorizedID.objects.get_or_create(
            student_id=student_id, 
            defaults={'description': description, 'is_active': True}
        )

        # Cloud Sync Disabled
        return JsonResponse({"success": True, "message": "User sequence registered locally"})

        return JsonResponse({"success": True, "message": "User sequence registered"})
    except Exception as e:
        return JsonResponse({"success": False, "message": str(e)}, status=500)

@csrf_exempt
@login_required
def get_authorized_users(request):
    try:
        users = AuthorizedID.objects.all().order_by("-created_at").values("student_id", "description", "is_active")
        return JsonResponse({"success": True, "users": list(users)})
    except Exception as e:
        return JsonResponse({"success": False, "message": str(e)}, status=500)

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

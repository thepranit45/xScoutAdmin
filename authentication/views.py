from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.contrib.auth.decorators import login_required
from .models import AuthorizedID
import json
import firebase_admin
from firebase_admin import credentials, firestore
import os

# STRICT LOCAL AUTH OVERRIDE (Neutralize Cloud 429)
def get_auth_db(): return None
db = None

@csrf_exempt
@require_POST
def verify_student_id(request):
    try:
        data = json.loads(request.body.decode('utf-8'))
        student_id = data.get('student_id', '').strip()
        
        if not student_id:
            return JsonResponse({'success': False, 'message': 'ID Required'}, status=400)

        print(f"Verifying Student ID: {student_id}")

        # --- OPTIMIZATION: Check Local Ledger FIRST (Instant) ---
        # SEARCH LOCAL LEDGER (Case-Insensitive)
        local_user = AuthorizedID.objects.filter(student_id__iexact=student_id).first()
        if local_user:
            if local_user.is_active:
                print(f"[AUTH] Granted: {local_user.student_id}")
                return JsonResponse({
                    'success': True, 
                    'message': 'Authorized (Local Hub)', 
                    'redirect': '/dashboard/'
                })
            else:
                return JsonResponse({'success': False, 'message': 'ID Suspended Locally'}, status=403)
        
        print(f"[AUTH] Denied: {student_id} (Not in Local Ledger)")

        # --- FALLBACK: Check Cloud (Firestore) ---
        if db:
            try:
                # Check authorized_students with a short logic timeout check is not built-in, 
                # but we handle exceptions.
                doc_ref = db.collection('authorized_students').document(student_id)
                doc = doc_ref.get()
                if doc.exists:
                    user_data = doc.to_dict()
                    if user_data.get('isActive', True):
                        # Cache to local for next time
                        AuthorizedID.objects.get_or_create(student_id=student_id, defaults={'description': 'Cloud Synced User'})
                        print(f"Auth Success: {student_id} (Cloud Sync)")
                        return JsonResponse({
                            'success': True, 
                            'message': 'Authorized (Cloud Sync)', 
                            'redirect': '/dashboard/'
                        })
            except Exception as fe:
                print(f"Cloud Check Failed: {fe}")

        return JsonResponse({'success': False, 'message': 'ID Not Authorized'}, status=403)
            
    except Exception as e:
        print(f"Server Error in Verify: {e}")
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

@csrf_exempt
@require_POST
def add_authorized_user(request):
    """PROVISION_NODE: Strictly Local Ledger Setup"""
    try:
        data = json.loads(request.body)
        student_id = data.get('student_id', '').strip()
        if not student_id: return JsonResponse({'success': False, 'message': 'ID Required'}, status=400)
            
        # Create in Local SQLite Ledger
        user_obj, created = AuthorizedID.objects.get_or_create(
            student_id=student_id, 
            defaults={'description': data.get('description', 'Default Monitoring Target')}
        )
        
        print(f"[AUTH] Provisioned Local ID: {student_id}")
        return JsonResponse({'success': True, 'message': f'ID {student_id} Authorized Locally'})
            
    except Exception as e:
        print(f"[AUTH] Provisioning Crash: {e}")
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

@login_required
def get_authorized_users(request):
    users = AuthorizedID.objects.all().order_by('-created_at').values('student_id', 'description', 'is_active', 'created_at')
    return JsonResponse({'success': True, 'users': list(users)})

@csrf_exempt
@require_POST
@login_required
def toggle_user_status(request):
    try:
        data = json.loads(request.body)
        student_id = data.get('student_id')
        user = AuthorizedID.objects.get(student_id=student_id)
        user.is_active = not user.is_active
        user.save()
        if db:
            try: db.collection('authorized_students').document(student_id).update({'isActive': user.is_active})
            except: pass
        return JsonResponse({'success': True, 'active': user.is_active})
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

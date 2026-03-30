from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.contrib.auth.decorators import login_required
from .models import AuthorizedID
import json
import firebase_admin
from firebase_admin import credentials, firestore
import os

# Robust Firebase Initialization
db = None
try:
    if not firebase_admin._apps:
        current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        # Search for any valid firebase json
        json_file = next((f for f in os.listdir(current_dir) if f.endswith('.json') and 'firebase-adminsdk' in f), 'serviceAccountKey.json')
        cred_path = os.path.join(current_dir, json_file)

        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            db = firestore.client()
            print("✅ Firebase Auth Engine: INITIALIZED")
        else:
            print("⚠️ Firebase Credentials not found - Cloud Sync Disabled")
    else:
        db = firestore.client()
except Exception as e:
    print(f"❌ Firebase Init Error: {e}")
    db = None

@csrf_exempt
@require_POST
def verify_student_id(request):
    try:
        data = json.loads(request.body.decode('utf-8'))
        student_id = data.get('student_id', '').strip()
        
        if not student_id:
            return JsonResponse({'success': False, 'message': 'ID Required'}, status=400)

        print(f"🔍 Verifying Student ID: {student_id}")

        # --- OPTIMIZATION: Check Local Ledger FIRST (Instant) ---
        try:
            local_user = AuthorizedID.objects.get(student_id=student_id)
            if local_user.is_active:
                print(f"✅ Auth Success: {student_id} (Local Ledger)")
                return JsonResponse({
                    'success': True, 
                    'message': 'Authorized (Local Mode)', 
                    'redirect': '/dashboard/'
                })
            else:
                return JsonResponse({'success': False, 'message': 'ID Suspended Locally'}, status=403)
        except AuthorizedID.DoesNotExist:
            print(f"ℹ️ ID {student_id} not found locally, checking cloud...")

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
                        print(f"✅ Auth Success: {student_id} (Cloud Sync)")
                        return JsonResponse({
                            'success': True, 
                            'message': 'Authorized (Cloud Sync)', 
                            'redirect': '/dashboard/'
                        })
            except Exception as fe:
                print(f"❌ Cloud Check Failed: {fe}")

        return JsonResponse({'success': False, 'message': 'ID Not Authorized'}, status=403)
            
    except Exception as e:
        print(f"❌ Server Error in Verify: {e}")
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

@csrf_exempt
@require_POST
@login_required
def add_authorized_user(request):
    try:
        data = json.loads(request.body)
        student_id = data.get('student_id')
        if not student_id: return JsonResponse({'success': False, 'message': 'ID Required'}, status=400)
            
        AuthorizedID.objects.get_or_create(student_id=student_id, defaults={'description': data.get('description', '')})
        
        if db:
            try:
                db.collection('authorized_students').document(student_id).set({
                    'studentId': student_id,
                    'isActive': True,
                    'authorizedAt': firestore.SERVER_TIMESTAMP
                })
            except: pass
            
        return JsonResponse({'success': True, 'message': 'User authorized'})
    except Exception as e:
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

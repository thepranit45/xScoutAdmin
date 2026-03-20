from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.contrib.auth.decorators import login_required
from .models import AuthorizedID
import json
import firebase_admin
from firebase_admin import credentials, firestore
import os

# Initialize Firebase (Singleton)
if not firebase_admin._apps:
    try:
        current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        cred_path = os.path.join(current_dir, 'xscout-68489-firebase-adminsdk-fbsvc-71d744a27c.json')
        if not os.path.exists(cred_path):
             cred_path = os.path.join(current_dir, 'serviceAccountKey.json')

        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        else:
            firebase_admin.initialize_app()
    except Exception as e:
        print(f"Firebase Auth Init Warning: {e}")

db = firestore.client()

@csrf_exempt
@require_POST
def verify_student_id(request):
    try:
        data = json.loads(request.body)
        student_id = data.get('student_id')
        
        if not student_id:
            return JsonResponse({'success': False, 'message': 'Student ID is required'}, status=400)
            
        # 1. Check Firestore (Cloud Source of Truth)
        try:
            doc = db.collection('authorized_students').document(student_id).get()
            if doc.exists:
                # Firestore existence is enough for authorization in this flow
                return JsonResponse({
                    'success': True, 
                    'message': 'Connection Authorized (Cloud Sync)', 
                    'source': 'firestore',
                    'redirect': '/dashboard/'
                })
        except Exception as fe:
            print(f"Firestore check failed: {fe}")

        # 2. Fallback: Check local Database
        try:
            auth_id = AuthorizedID.objects.get(student_id=student_id, is_active=True)
            return JsonResponse({
                'success': True, 
                'message': 'Connection Authorized (Local Engine)', 
                'source': 'local',
                'redirect': '/dashboard/'
            })
        except AuthorizedID.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Access Denied: ID not authorized'}, status=403)
            
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

@csrf_exempt
@require_POST
@login_required
def add_authorized_user(request):
    try:
        data = json.loads(request.body)
        student_id = data.get('student_id')
        name = data.get('name', 'Admin Added User')
        description = data.get('description', '')
        
        if not student_id:
            return JsonResponse({'success': False, 'message': 'Student ID is required'}, status=400)
            
        # 1. Sync to Firestore
        try:
            db.collection('authorized_students').document(student_id).set({
                'studentId': student_id,
                'studentName': name,
                'description': description,
                'authorizedAt': firestore.SERVER_TIMESTAMP,
                'isActive': True
            })
        except Exception as fe:
            print(f"Firestore sync failed: {fe}")

        # 2. Keep local DB for redundancy
        if not AuthorizedID.objects.filter(student_id=student_id).exists():
            AuthorizedID.objects.create(student_id=student_id, description=description)
            
        return JsonResponse({'success': True, 'message': 'User authorized and synced to cloud'})
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

@login_required
def get_authorized_users(request):
    # Merge local and firestore? For simplicity, we'll return local but notes it might be lagging
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
        
        # Sync to Firestore
        try:
            db.collection('authorized_students').document(student_id).update({
                'isActive': user.is_active
            })
        except: pass
            
        return JsonResponse({'success': True, 'active': user.is_active})
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.contrib.auth.decorators import login_required
import json
import firebase_admin
from firebase_admin import credentials, firestore
import os
import datetime

# Initialize Firebase (Singleton pattern to match dashboard view)
if not firebase_admin._apps:
    try:
        current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        # Adjust path to find serviceAccountKey.json which is in the parent d:\xScout\AdminDashboard
        json_path = os.path.join(current_dir, 'serviceAccountKey.json')
        
        # Fallback if not found (e.g. if current_dir is inside authentication)
        if not os.path.exists(json_path):
             # Try going one level up d:\xScout
             json_path = os.path.join(current_dir, '..', 'serviceAccountKey.json')

        cred = credentials.Certificate(json_path)
        firebase_admin.initialize_app(cred)
    except Exception as e:
        print(f"Firebase Init Error in Auth: {e}")

try:
    db = firestore.client()
except Exception:
    db = None

@csrf_exempt
@require_POST
def verify_student_id(request):
    try:
        data = json.loads(request.body)
        student_id = data.get('student_id')
        
        if not student_id:
            return JsonResponse({'success': False, 'message': 'Student ID is required'}, status=400)
            
        # FIRESTORE QUERY
        if not db:
             return JsonResponse({'success': False, 'message': 'Database connection error'}, status=500)

        doc_ref = db.collection('authorized_users').document(student_id)
        doc = doc_ref.get()
        
        if doc.exists:
            user_data = doc.to_dict()
            if user_data.get('is_active', True):
                return JsonResponse({'success': True, 'message': 'Connection Authorized', 'redirect': '/dashboard/'})
            else:
                return JsonResponse({'success': False, 'message': 'Access Denied: ID is disabled'}, status=403)
        else:
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
        description = data.get('description', '')
        
        if not student_id:
            return JsonResponse({'success': False, 'message': 'Student ID is required'}, status=400)
            
        if not db:
             return JsonResponse({'success': False, 'message': 'Database connection error'}, status=500)

        # Check if exists in Firestore
        doc_ref = db.collection('authorized_users').document(student_id)
        if doc_ref.get().exists:
             return JsonResponse({'success': False, 'message': 'ID already exists'}, status=400)

        # Create in Firestore
        doc_ref.set({
            'student_id': student_id,
            'description': description,
            'is_active': True,
            'created_at': datetime.datetime.now().isoformat()
        })
        
        return JsonResponse({'success': True, 'message': 'User added successfully'})
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

@login_required
def get_authorized_users(request):
    try:
        if not db:
             return JsonResponse({'success': False, 'message': 'Database connection error'}, status=500)

        users_ref = db.collection('authorized_users').stream()
        users_list = []
        for doc in users_ref:
            users_list.append(doc.to_dict())
            
        # Sort manually since we can't easily order_by on stream without index sometimes
        users_list.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        
        return JsonResponse({'success': True, 'users': users_list})
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

@csrf_exempt
@require_POST
@login_required
def toggle_user_status(request):
    try:
        data = json.loads(request.body)
        student_id = data.get('student_id')
        
        if not db:
             return JsonResponse({'success': False, 'message': 'Database connection error'}, status=500)

        doc_ref = db.collection('authorized_users').document(student_id)
        doc = doc_ref.get()
        
        if doc.exists:
            current_status = doc.to_dict().get('is_active', True)
            new_status = not current_status
            doc_ref.update({'is_active': new_status})
            return JsonResponse({'success': True, 'active': new_status})
        else:
            return JsonResponse({'success': False, 'message': 'User not found'}, status=404)
            
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from .models import AuthorizedID
import json

@csrf_exempt
@require_POST
def verify_student_id(request):
    try:
        data = json.loads(request.body)
        student_id = data.get('student_id')
        
        if not student_id:
            return JsonResponse({'success': False, 'message': 'Student ID is required'}, status=400)
            
        # Check if ID exists and is active
        try:
            auth_id = AuthorizedID.objects.get(student_id=student_id, is_active=True)
            return JsonResponse({'success': True, 'message': 'Connection Authorized', 'redirect': '/dashboard/'})
        except AuthorizedID.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Access Denied: ID not authorized'}, status=403)
            
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

from django.contrib.auth.decorators import login_required

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
            
        if AuthorizedID.objects.filter(student_id=student_id).exists():
             return JsonResponse({'success': False, 'message': 'ID already exists'}, status=400)

        AuthorizedID.objects.create(student_id=student_id, description=description)
        return JsonResponse({'success': True, 'message': 'User added successfully'})
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
        return JsonResponse({'success': True, 'active': user.is_active})
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

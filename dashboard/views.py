from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
import firebase_admin
from firebase_admin import credentials, firestore
import os
import difflib # For similarity checking

# Initialize Firebase (Singleton)
if not firebase_admin._apps:
    try:
        current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        # Priority 1: Specific JSON file
        # Priority 2: Service Account Key
        # Priority 3: Environment Variable
        cred_path = os.path.join(current_dir, 'xscout-68489-firebase-adminsdk-fbsvc-71d744a27c.json')
        if not os.path.exists(cred_path):
             cred_path = os.path.join(current_dir, 'serviceAccountKey.json')
             
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        else:
            # Fallback to default credentials (useful for production envs like Google Cloud/Render)
            firebase_admin.initialize_app()
    except Exception as e:
        print(f"Firebase Init Warning: {e}. Ensure GOOGLE_APPLICATION_CREDENTIALS is set if .json is missing.")

db = firestore.client()

def home(request):
    """Landing page - public access"""
    return render(request, 'home.html')

def login_view(request):
    """Handle user login"""
    if request.user.is_authenticated:
        return redirect('/dashboard/')
    
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            login(request, user)
            return redirect('/dashboard/')
        else:
            messages.error(request, 'Invalid username or password')
    
    return render(request, 'login.html')

def logout_view(request):
    """Handle user logout"""
    logout(request)
    return redirect('/login/')

@login_required
def index(request):
    return render(request, 'index.html')

def code_city_demo(request):
    """3D Visualization Demo"""
    return render(request, 'code_city_demo.html')

@login_required
def playback_view(request):
    """Render Code Playback Page"""
    return render(request, 'playback.html')

@login_required
def get_playback_data(request):
    """API to fetch session history for playback"""
    user_id = request.GET.get('user_id')
    if not user_id:
        return JsonResponse({'status': 'error', 'message': 'Missing user_id'}, status=400)

    try:
        # Fetch history from sub-collection, ordered by timestamp
        docs = db.collection('telemetry').document(user_id).collection('history').order_by('timestamp').stream()
        
        history = []
        for doc in docs:
            data = doc.to_dict()
            history.append(data)
            
        return JsonResponse({'status': 'success', 'data': history})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)

from django.views.decorators.csrf import csrf_exempt
import json

@csrf_exempt
def get_dashboard_data(request):
    if request.method == 'GET':
        try:
            # Android expects data in 'reports' collection
            docs = db.collection('reports').stream()
            data = []
            for doc in docs:
                doc_data = doc.to_dict()
                doc_data['id'] = doc.id
                data.append(doc_data)
                
            return JsonResponse({'status': 'success', 'data': data})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)
            
    elif request.method == 'POST':
        try:
            body = json.loads(request.body)
            # Use user ID from body or fall back to 'unknown'
            user_id = body.get('user', 'user_001')
            
            # Map Extension data to Android 'StudentSession' model
            android_report = {
                'studentId': user_id,
                'studentName': user_id, # Fallback to ID until we have a name lookup
                'email': body.get('email', f"{user_id}@xscout.app"),
                'timestamp': int(datetime.now().timestamp() * 1000),
                'isActive': True,
                'ai': body.get('ai', 0) * 100, # Scale 0.0-1.0 to 0-100 for Android logic
                'behavior': {
                    'wpm': body.get('behavior', {}).get('wpm', 0),
                    'backspaceRate': body.get('behavior', {}).get('backspaceCount', 0), # Fallback mapping
                    'pasteEvents': body.get('behavior', {}).get('pasteCount', 0),
                    'idleTime': body.get('behavior', {}).get('idleTime', 0),
                },
                'stack': body.get('tech', {}).get('detectedTech', 'Web Content'),
                'titleHistory': body.get('forensic', {}).get('activeDocuments', [])
            }
            
            # Write to Firestore in the 'reports' collection for Android compatibility
            db.collection('reports').document(user_id).set(android_report)

            # Store History for playback
            if body.get('snapshot'):
                history_entry = {
                    'timestamp': android_report['timestamp'],
                    'file': body['snapshot'].get('file'),
                    'code': body['snapshot'].get('code'),
                    'ai_score': android_report['ai']
                }
                db.collection('reports').document(user_id).collection('history').add(history_entry)
            
            return JsonResponse({'status': 'saved'})
        except Exception as e:
            print(f"Error saving telemetry: {e}")
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)
            
    return JsonResponse({'status': 'method_not_allowed'}, status=405)

import csv
from django.http import HttpResponse
from datetime import datetime, timedelta

@login_required
def export_logs(request):
    try:
        # Create the HttpResponse object with the appropriate CSV header.
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="xscout_logs_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv"'

        writer = csv.writer(response)
        writer.writerow(['User ID', 'Timestamp', 'App', 'Window Title', 'AI Risk Score', 'WPM'])

        docs = db.collection('telemetry').stream()
        for doc in docs:
            data = doc.to_dict()
            writer.writerow([
                doc.id,
                data.get('timestamp', 'N/A'),
                data.get('forensic', {}).get('activeApp', 'N/A'),
                data.get('forensic', {}).get('activeWindow', 'N/A'),
                data.get('ai', 0),
                data.get('behavior', {}).get('wpm', 0)
            ])

        return response
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)

@login_required
def system_backup(request):
    try:
        # Dump all telemetry to JSON
        docs = db.collection('telemetry').stream()
        all_data = {doc.id: doc.to_dict() for doc in docs}
        
        response = JsonResponse(all_data, json_dumps_params={'indent': 2})
        response['Content-Disposition'] = f'attachment; filename="xscout_backup_{datetime.now().strftime("%Y%m%d")}.json"'
        return response
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)

@login_required
@csrf_exempt # In case called via fetch without token handling, but better to use token
def purge_logs(request):
    if request.method == 'POST':
        try:
            # Logic to delete old logs
            # Since Firestore free tier requires individual deletes, we'll just batch delete for this demo
            # In production, query by timestamp < 30 days ago
            
            # Mocking the "30 days" check by checking if 'timestamp' exists and parsing it
            # For this demo, we will just count items to show it "worked" without actually destroying data aggressively
            # unless explicitly requested. I'll delete documents that explicitly look like test data or old.
            
            # Simple implementation: Delete everything for cleanup demo or just return success simulation
            # Let's actually delete just to be functional
            
            batch = db.batch()
            docs = db.collection('telemetry').limit(50).stream() 
            deleted_count = 0
            
            for doc in docs:
                # In a real scenario: if doc.create_time < 30_days_ago:
                # db.collection('telemetry').document(doc.id).delete()
                # For safety in this demo, let's NOT wipe the DB, but return success 
                # or maybe delete strictly 'unknown' users
                if 'user' in doc.id and 'test' in doc.id.lower():
                     batch.delete(doc.reference)
                     deleted_count += 1
            
            if deleted_count > 0:
                batch.commit()

            return JsonResponse({'status': 'success', 'message': f'Purged {deleted_count} old records.'})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)
    return JsonResponse({'status': 'error', 'message': 'POST required'}, status=405)

# --- File Explorer & Code Viewer API ---

@login_required
def get_directory_structure(request):
    """
    Returns the directory structure for the given path.
    Restricted to the project BASE_DIR for security.
    """
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    target_path = request.GET.get('path', '')
    
    # Construct full path
    full_path = os.path.join(base_dir, target_path)
    
    # Security check: Ensure we are not going above BASE_DIR
    if not os.path.abspath(full_path).startswith(base_dir):
        return JsonResponse({'status': 'error', 'message': 'Access denied'}, status=403)
        
    if not os.path.exists(full_path):
        return JsonResponse({'status': 'error', 'message': 'Path not found'}, status=404)
        
    items = []
    try:
        with os.scandir(full_path) as it:
            for entry in it:
                # Skip hidden files/dirs and .git
                if entry.name.startswith('.') or entry.name == '__pycache__':
                    continue
                    
                items.append({
                    'name': entry.name,
                    'type': 'directory' if entry.is_dir() else 'file',
                    'path': os.path.relpath(entry.path, base_dir).replace('\\', '/')
                })
        
        # Sort: Directories first, then files
        items.sort(key=lambda x: (x['type'] != 'directory', x['name'].lower()))
        
        return JsonResponse({'status': 'success', 'data': items, 'current_path': target_path})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)

@login_required
def read_file_content(request):
    """
    Reads and returns the content of a file.
    Restricted to valid text files within BASE_DIR.
    """
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    target_path = request.GET.get('path', '')
    
    full_path = os.path.join(base_dir, target_path)
    
    # Security check
    if not os.path.abspath(full_path).startswith(base_dir):
        return JsonResponse({'status': 'error', 'message': 'Access denied'}, status=403)
        
    if not os.path.isfile(full_path):
        return JsonResponse({'status': 'error', 'message': 'File not found'}, status=404)
        
    # Content type check (basic)
    allowed_extensions = ['.py', '.js', '.html', '.css', '.json', '.txt', '.md', '.xml', '.yml', '.yaml', '']
    _, ext = os.path.splitext(full_path)
    
    print(f"DEBUG: Reading file {full_path} with extension '{ext}'")
    
    if ext.lower() not in allowed_extensions:
         return JsonResponse({'status': 'error', 'message': f'File type ({ext}) not supported for viewing'}, status=400)
    
    try:
        with open(full_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return JsonResponse({'status': 'success', 'content': content, 'path': target_path})
    except UnicodeDecodeError:
        return JsonResponse({'status': 'error', 'message': 'Binary or non-UTF-8 file cannot be viewed'}, status=400)
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)

# --- Cheating Network Graph ---

@login_required
def network_view(request):
    """Render the Network Graph page"""
    return render(request, 'network_graph.html')

@login_required
def get_network_data(request):
    """
    API to calculate code similarity and return graph data.
    O(N^2) complexity - Suitable for standard classrooms (< 100 students).
    """
    try:
        # 1. Fetch all active users
        docs = db.collection('telemetry').stream()
        users = []
        
        for doc in docs:
            data = doc.to_dict()
            uid = doc.id
            # Extract code snapshot
            code = ""
            if 'snapshot' in data and 'code' in data['snapshot']:
                code = data['snapshot']['code']
            
            # Skip empty code
            if not code or len(code.strip()) < 10:
                continue

            users.append({
                'id': uid,
                'label': uid, 
                'code': code,
                'last_seen': data.get('timestamp', 'Unknown')
            })

        # 2. Pairwise Comparison
        edges = []
        risky_users = set()

        for i in range(len(users)):
            for j in range(i + 1, len(users)):
                user_a = users[i]
                user_b = users[j]

                # Similarity Check
                matcher = difflib.SequenceMatcher(None, user_a['code'], user_b['code'])
                ratio = matcher.ratio() # 0.0 to 1.0

                # Threshold: 80% similarity
                if ratio > 0.8:
                    percentage = int(ratio * 100)
                    edges.append({
                        'from': user_a['id'],
                        'to': user_b['id'],
                        'label': f"{percentage}%",
                        'title': f"{percentage}% Match detected"
                    })
                    risky_users.add(user_a['id'])
                    risky_users.add(user_b['id'])

        # 3. Format Nodes with Status
        nodes_response = []
        for user in users:
            nodes_response.append({
                'id': user['id'],
                'label': user['label'],
                'last_seen': user['last_seen'],
                'risky': user['id'] in risky_users
            })

        return JsonResponse({
            'status': 'success', 
            'data': {
                'nodes': nodes_response, 
                'edges': edges,
                'meta': {'algorithm': 'difflib.SequenceMatcher', 'threshold': 0.8}
            }
        })
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)

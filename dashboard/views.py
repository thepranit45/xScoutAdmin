# Project: xScout - Force Reload for Templates v793
from django.shortcuts import render, redirect
from django.http import JsonResponse, HttpResponse
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.views.decorators.csrf import csrf_exempt
import firebase_admin
from firebase_admin import credentials, firestore
import os
import difflib 
import json
import csv
from datetime import datetime
from authentication.models import AuthorizedID, TelemetryPulse, CodeSnapshot, Environment

# Custom JSON encoder to handle Firestore datetime objects
class FirestoreEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

# STRICT LOCAL OVERRIDE (Neutralize Cloud 429)
def initialize_firebase(): return None
db = None
LOCAL_TELEMETRY = {}
init_error = None

def home(request):
    """Landing page - public access"""
    return render(request, 'home.html')

@login_required
def cluster_explore(request, node_code):
    """Full-screen immersive forensic map for a specific cluster"""
    return render(request, 'cluster_explore.html', {'node_code': node_code})

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
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__))).replace('\\', '/')
    return render(request, 'index.html', {'base_dir': base_dir})

def code_city_demo(request):
    """3D Visualization Demo"""
    return render(request, 'code_city_demo.html')

@login_required 
def playback_view(request):
    """Render Code Playback Page"""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__))).replace('\\', '/')
    return render(request, 'playback.html', {'base_dir': base_dir})

@login_required 
def get_playback_data(request, user_id=None):
    """API: Full-SQLite Forensic Playback with Root Discovery"""
    if not user_id: user_id = request.GET.get('user_id')
    if not user_id: return JsonResponse({'status': 'error', 'message': 'Missing user_id'}, status=400)

    try:
        # Fetch pulses for this developer (most recent 250)
        pulses = TelemetryPulse.objects.filter(developer_id=user_id).order_by('timestamp')
        
        history = []
        root_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # Default to admin root
        
        # Discover latest root from forensic pulses
        latest_pulse = pulses.last()
        if latest_pulse:
            try:
                raw_payload = json.loads(latest_pulse.raw_data)
                # PRIORITY 1: Explicit Workspace Path from Project Scanner
                if raw_payload.get('project') and raw_payload['project'].get('path'):
                    root_path = raw_payload['project']['path'].replace('\\', '/')
                else:
                    # PRIORITY 2: Infer from latest code snapshot
                    latest_with_snap = pulses.filter(snapshots__isnull=False).last()
                    if latest_with_snap:
                        snap = latest_with_snap.snapshots.first()
                        if snap and snap.filename:
                            p = snap.filename.replace('\\', '/')
                            parts = p.split('/')
                            # Deep detection: climb up until we find a project-like folder
                            if len(parts) >= 2:
                                root_path = "/".join(parts[:2])
            except: pass

        for pulse in pulses[:250]: # Increased cap for deeper forensics
            try:
                data = json.loads(pulse.raw_data)
                # Attach the actual code snapshot if it exists
                snapshot_obj = pulse.snapshots.first() 
                if snapshot_obj:
                    data['snapshot'] = {
                        'file': snapshot_obj.filename,
                        'code': snapshot_obj.content,
                        'language': snapshot_obj.language
                    }
                data['timestamp'] = pulse.timestamp.isoformat()
                history.append(data)
            except: continue
            
        return JsonResponse({'status': 'success', 'data': history, 'root_path': root_path})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)

@csrf_exempt
def get_dashboard_data(request):
    """MASTER PULSE ENGINE - Full SQLite Hub Conversion"""
    if request.method == "POST":
        try:
            body = json.loads(request.body)
            uid = body.get("user", body.get("student_id", "nexus_node"))
            
            # Risk Score Processing Logic (Ensure it's always an integer)
            raw_ai = body.get('ai', 0)
            if raw_ai is None: raw_ai = 0
            
            risk_score = int(raw_ai * 100) if isinstance(raw_ai, (float, int)) and isinstance(raw_ai, float) else int(raw_ai)

            # Commit to SQLite (Permanent Ledger)
            pulse = TelemetryPulse.objects.create(
                developer_id=uid,
                node_code=body.get('node_code'),  # RESTORE NODE MAPPING
                risk_score=risk_score,
                raw_data=json.dumps(body)
            )
            
            # 2. Extract Forensic & Snapshot (Handle stringified payloads from some extension versions)
            forensic = body.get('forensic', {})
            if isinstance(forensic, str):
                try: forensic = json.loads(forensic)
                except: forensic = {}
                
            snapshot = body.get('snapshot') or (forensic.get('snapshot') if isinstance(forensic, dict) else {})
            
            if snapshot and isinstance(snapshot, dict):
                CodeSnapshot.objects.create(
                    pulse=pulse,
                    filename=snapshot.get('file') or snapshot.get('filename') or 'unknown',
                    content=snapshot.get('code') or snapshot.get('content') or '',
                    language=snapshot.get('language') or 'text'
                )
            
            # Update RAM Cache (Dashboard)
            body["id"] = uid
            if "timestamp" not in body: body["timestamp"] = datetime.now().isoformat()
            LOCAL_TELEMETRY[uid] = body
            
            return JsonResponse({"status": "saved", "hub": "sqlite_local"})
        except Exception as e:
            print(f"TELEMETRY_SYNC_ERROR: {e}")
            return JsonResponse({"status": "error", "message": f"Sync rejected: {str(e)}"}, status=400)
    
    # GET: Summarize current status for Fleet Dashboard
    data = []
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    for dev_id, pulse_entry in LOCAL_TELEMETRY.items():
        if not pulse_entry: continue # Prevent crash on empty sessions
        
        # Support both latest-only dict or historical pulse list (for future-proofing)
        latest = pulse_entry[-1] if isinstance(pulse_entry, list) else pulse_entry
        root_path = base_dir

        try:
            # Extract raw payload: Using dict from RAM cache directly or unpacking if it's a Pulse instance
            if isinstance(latest, dict) and 'raw_data' not in latest:
                raw_payload = latest
            else:
                raw_data = getattr(latest, 'raw_data', latest.get('raw_data', '{}') if hasattr(latest, 'get') else '{}')
                raw_payload = json.loads(raw_data) if isinstance(raw_data, str) else raw_data

            if raw_payload.get('project') and raw_payload['project'].get('path'):
                root_path = raw_payload['project']['path'].replace('\\', '/')
            else:
                # Fallback to snap inference from SQLite
                latest_with_file = TelemetryPulse.objects.filter(developer_id=dev_id, snapshots__isnull=False).last()
                if latest_with_file:
                    snap = latest_with_file.snapshots.first()
                    if snap and snap.filename:
                        p = snap.filename.replace('\\', '/')
                        parts = p.split('/')
                        if len(parts) >= 2:
                            root_path = "/".join(parts[:2])
        except: pass

        summary = latest.copy() if hasattr(latest, 'copy') else {}
        summary["id"] = dev_id
        summary["root_path"] = root_path
        data.append(summary)

    if not data:
        data = [{
            "id": "Nexus-Sync-Node",
            "timestamp": datetime.now().isoformat(),
            "forensic": {"activeApp": "Engine Operational (Full-SQLite Hub Active)"},
            "status": "system",
            "root_path": base_dir
        }]
    return JsonResponse({"status": "success", "data": data})

@login_required
def export_logs(request):
    try:
        # Create the HttpResponse object with the appropriate CSV header.
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="xscout_logs_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv"'

        writer = csv.writer(response)
        writer.writerow(['User ID', 'Timestamp', 'App', 'Window Title', 'AI Risk Score', 'WPM'])

        if db:
            docs = db.collection('reports').stream()
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
        all_data = {}
        if db:
            docs = db.collection('reports').stream()
            all_data = {doc.id: doc.to_dict() for doc in docs}
        
        all_json = json.dumps(all_data, indent=2, cls=FirestoreEncoder)
        response = HttpResponse(all_json, content_type='application/json')
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
            deleted_count = 0
            if db:
                batch = db.batch()
                docs = db.collection('reports').limit(50).stream() 
                
                for doc in docs:
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
    
    # Security check: Ensure we are not going above BASE_DIR unless it's a valid absolute path
    is_absolute = os.path.isabs(target_path)
    if is_absolute:
        full_path = target_path
    else:
        full_path = os.path.join(base_dir, target_path)

    # Security check: Relative paths must be within BASE_DIR. 
    # Absolute paths (initiated by the Admin via telemetry discovery) are trusted.
    if not is_absolute:
        if not os.path.normpath(full_path).startswith(os.path.normpath(base_dir)):
            return JsonResponse({'status': 'error', 'message': f'Access denied to {target_path}'}, status=403)
        
    if not os.path.exists(full_path):
        return JsonResponse({'status': 'error', 'message': f'Path not found: {full_path}'}, status=404)
        
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
                    'path': entry.path.replace('\\', '/')
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
    Restricted to valid text files within BASE_DIR (unless absolute path is provided by Admin).
    """
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    target_path = request.GET.get('path', '')
    
    is_absolute = os.path.isabs(target_path)
    if is_absolute:
        full_path = target_path
    else:
        full_path = os.path.join(base_dir, target_path)
    
    # Security check: Relative paths only
    if not is_absolute:
        if not os.path.normpath(full_path).startswith(os.path.normpath(base_dir)):
            return JsonResponse({'status': 'error', 'message': f'Access denied to {target_path}'}, status=403)
        
    if not os.path.isfile(full_path):
        return JsonResponse({'status': 'error', 'message': f'File not found: {full_path}'}, status=404)
        
    # Content type check (Extensive source code support)
    allowed_extensions = [
        '.py', '.js', '.ts', '.tsx', '.jsx', '.html', '.css', '.json', '.txt', '.md', 
        '.xml', '.yml', '.yaml', '.gradle', '.kt', '.ktm', '.java', '.c', '.cpp', 
        '.h', '.hpp', '.cs', '.sh', '.bat', '.ps1', '.sql', '.env', '.gitignore', 
        '.dockerfile', '.properties', '.toml', '.lock', '.cfg', ''
    ]
    _, ext = os.path.splitext(full_path)
    
    if ext.lower() not in allowed_extensions and not full_path.endswith('Dockerfile'):
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
    """Render the Network Node page"""
    return render(request, 'network_node.html')

@login_required
def get_network_data(request):
    """
    API to calculate code similarity and return graph data.
    O(N^2) complexity - Suitable for standard classrooms (< 100 students).
    """
    try:
        node_code = request.GET.get('node_code')
        # 1. Fetch latest pulse for all users with code snapshots (Query SQLite Ledger)
        users = []
        pulses_query = TelemetryPulse.objects.all()
        if node_code:
            pulses_query = pulses_query.filter(node_code__iexact=node_code)
            
        developer_ids = pulses_query.values_list('developer_id', flat=True).distinct()
        
        for uid in developer_ids:
            # Find the last pulse that actually contains code for this developer
            query = TelemetryPulse.objects.filter(developer_id=uid).exclude(snapshots=None).order_by('timestamp')
            if node_code:
                query = query.filter(node_code__iexact=node_code)
            latest_with_code = query.last()
            
            # FALLBACK to latest pulse if no snapshots exist yet
            if not latest_with_code:
                fallback_query = TelemetryPulse.objects.filter(developer_id=uid).order_by('timestamp')
                if node_code:
                    fallback_query = fallback_query.filter(node_code__iexact=node_code)
                latest_with_code = fallback_query.last()
                
            if not latest_with_code:
                continue
                
            code_content = ""
            try:
                snapshot = latest_with_code.snapshots.first()
                if snapshot and snapshot.content:
                    code_content = snapshot.content
            except:
                pass

            users.append({
                'id': uid,
                'label': uid, 
                'code': code_content,
                'last_seen': latest_with_code.timestamp.isoformat(),
                'rank': getattr(latest_with_code, 'rank', 'developer')
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
                'risky': user['id'] in risky_users,
                'rank': user.get('rank', 'developer')
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

@login_required
@csrf_exempt
def create_node(request):
    """API: Provision a new Environment Node (Super Developer action)"""
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            code = data.get('node_code')
            desc = data.get('description', '')
            
            if not code:
                return JsonResponse({'status': 'error', 'message': 'Node Code Required'}, status=400)
                
            if Environment.objects.filter(invite_code=code).exists():
                return JsonResponse({'status': 'error', 'message': 'Node Code already exists'}, status=400)
                
            Environment.objects.create(
                invite_code=code,
                created_by=request.user,
                description=desc
            )
            return JsonResponse({'status': 'success', 'message': f'Environment {code} provisioned.'})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)
    return JsonResponse({'status': 'error', 'message': 'POST Required'}, status=405)

@login_required
def get_environments(request):
    """API: List all provisioned environment nodes"""
    try:
        envs = Environment.objects.all().order_by('-created_at')
        data = []
        for env in envs:
            # Case-insensitive count of active developer pulses for this node_code
            user_count = TelemetryPulse.objects.filter(node_code__iexact=env.invite_code).values('developer_id').distinct().count()
            data.append({
                'invite_code': env.invite_code,
                'description': env.description,
                'created_by': env.created_by.username,
                'created_at': env.created_at.isoformat(),
                'user_count': user_count
            })
        return JsonResponse({'status': 'success', 'data': data})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)

@csrf_exempt
@login_required
def delete_user_session(request, user_id):
    """Admin: Permanent Wipe of User Session from Ledger & Cache"""
    if request.method == "POST":
        try:
            # 1. Purge from SQLite Ledger
            TelemetryPulse.objects.filter(developer_id=user_id).delete()
            
            # 2. Flush from RAM Cache
            if user_id in LOCAL_TELEMETRY:
                del LOCAL_TELEMETRY[user_id]
            
            return JsonResponse({"status": "success", "message": f"Session ledger for {user_id} purged."})
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    return JsonResponse({"status": "error", "message": "POST required"}, status=405)

@csrf_exempt
def debug_server_view(request):
    """PUBLIC: Diagnostic view to help find out why telemetry isn't saved"""
    try:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        files = os.listdir(base_dir)
        
        # Search for any valid firebase json
        json_file = next((f for f in files if f.endswith('.json') and ('firebase' in f.lower() or 'service' in f.lower())), "NOT FOUND")

        status_data = {
            'status': 'diagnostic',
            'dashboard_db': str(db),
            'init_error': init_error,
            'base_dir_on_server': base_dir,
            'root_files': files,
            'found_json': json_file,
            'apps_count': len(firebase_admin._apps),
            'method': request.method
        }
        return JsonResponse(status_data, json_dumps_params={'indent': 2})
    except Exception as e:
        return JsonResponse({'status': 'crash', 'error': str(e)}, status=500)

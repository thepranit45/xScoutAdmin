import time
import json
import requests
import ctypes
from datetime import datetime

# Configuration
DASHBOARD_URL = "http://127.0.0.1:8001/api/telemetry/"
USER_ID = "pranit_desktop"

def get_active_window_title():
    try:
        hwnd = ctypes.windll.user32.GetForegroundWindow()
        length = ctypes.windll.user32.GetWindowTextLengthW(hwnd)
        buff = ctypes.create_unicode_buffer(length + 1)
        ctypes.windll.user32.GetWindowTextW(hwnd, buff, length + 1)
        return buff.value
    except:
        return "Unknown"

print(f"[*] xScout Desktop Agent Running for user: {USER_ID}")
print(f"[*] Sending telemetry to {DASHBOARD_URL}")
print("[*] Press Ctrl+C to stop")

# Keep track of history locally
history_buffer = []

while True:
    try:
        current_window = get_active_window_title()
        timestamp = datetime.now().strftime("%I:%M:%S %p")
        
        # Determine App Type based on title
        app_type = 'other'
        context = 'General'
        
        if 'Chrome' in current_window or 'Edge' in current_window:
            app_type = 'chrome'
            context = 'Research'
        elif 'Visual Studio Code' in current_window:
            app_type = 'code'
            context = 'Development'
        elif 'Discord' in current_window:
             app_type = 'communication'
        
        # Add to history buffer (keep last 5)
        history_item = {
            "app": app_type,
            "title": current_window,
            "context": context,
            "time": timestamp,
            "tabs": [current_window] # In a generic agent, title often contains the tab name
        }
        
        # Avoid duplicate consecutive entries to keep clean
        if not history_buffer or history_buffer[0]['title'] != current_window:
            history_buffer.insert(0, history_item)
            history_buffer = history_buffer[:10] # Keep last 10
            print(f"[Captured] {current_window}")

        # Payload matching the dashboard expectation
        payload = {
            "user": USER_ID,
            "timestamp": datetime.now().isoformat(),
            "ai": 0.1, # Low risk for now
            "behavior": {"wpm": 0},
            "forensic": {
                "activeDocuments": [],
                "appHistory": history_buffer
            }
        }
        
        requests.post(DASHBOARD_URL, json=payload)
        
    except Exception as e:
        print(f"[Error] {e}")
        
    time.sleep(2)

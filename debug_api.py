import requests
import json
import time

url = 'http://127.0.0.1:8000/api/telemetry/'
data = {
    "user": "debug_script",
    "timestamp": "2026-01-28T12:00:00Z",
    "behavior": {"wpm": 42},
    "forensic": {},
    "ai": 0.5
}

print(f"Attempting POST to {url}...")
try:
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"FAILED: {e}")

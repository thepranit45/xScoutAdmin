import requests

def diagnostic():
    urls = [
        "http://127.0.0.1:8000/",
        "http://127.0.0.1:8000/auth/api/verify-id/",
        "http://127.0.0.1:8000/admin/"
    ]
    
    for url in urls:
        try:
            print(f"--- Checking {url} ---")
            r = requests.get(url, timeout=3)
            print(f"Status: {r.status_code}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    diagnostic()

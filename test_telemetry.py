import requests
import json

def test_telemetry():
    url = "http://127.0.0.1:8000/api/telemetry/"
    print(f"Testing GET {url}...")
    try:
        response = requests.get(url, timeout=5)
        print(f"Status Code: {response.status_code}")
        try:
            data = response.json()
            print("Response JSON:")
            print(json.dumps(data, indent=2))
        except:
            print("Response Text (Not JSON):")
            print(response.text[:500])
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    test_telemetry()

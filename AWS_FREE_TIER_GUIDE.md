# 🛡️ xScout: AWS Free Tier Deployment Guide

Follow these exact steps to host your **xScout Dashboard** on the AWS Free Tier (EC2) for 12 months at **$0 cost**.

---

## 🛠️ Phase 1: Launch your Free Server (AWS Console)
1.  **Sign in** to [AWS Console](https://console.aws.amazon.com/).
2.  Search for **EC2** and click **Launch Instance**.
3.  **Name**: `xScout-Server`
4.  **AMI (OS)**: Select **Ubuntu Server 22.04 LTS** (Marked "Free tier eligible").
5.  **Instance Type**: `t2.micro` (or `t3.micro` if eligible in your region).
6.  **Key Pair**: Create a new key pair (e.g., `xscout-key.pem`), download and keep it safe!
7.  **Network Settings (Security Group)**:
    *   ✅ Allow SSH traffic (Port 22).
    *   ✅ Allow HTTPS traffic (Port 443).
    *   ✅ Allow HTTP traffic (Port 80).
    *   ✅ **Add custom rule**: Custom TCP, Port `8000`, Source `Anywhere (0.0.0.0/0)`.

---

## 🐧 Phase 2: Connect to your Server
1.  Open your terminal on your PC (or CMD).
2.  Navigate to where you saved `xscout-key.pem`.
3.  **Run this command** (replace with your server's Public IP):
    ```bash
    ssh -i "xscout-key.pem" ubuntu@YOUR_SERVER_IP
    ```

---

## ⚙️ Phase 3: Setup the Ecosystem
Once you are logged into the Ubuntu server, run these commands one by one:

```bash
# 1. Update and install Python/Nginx
sudo apt update && sudo apt install -y python3-pip python3-venv git nginx

# 2. Clone the xScout repository
git clone https://github.com/thepranit45/xScoutAdmin.git xscout
cd xscout

# 3. Create a Virtual Environment
python3 -m venv venv
source venv/bin/activate

# 4. Install Dependencies
pip install -r requirements.txt
pip install gunicorn  # Recommended for production
```

---

## 🛡️ Phase 4: Configure xScout Secrets
You need to move your `db.sqlite3` and your **Firebase JSON** to the server.

1.  **Update settings.py**:
    ```bash
    nano dashboard/settings.py
    ```
    *   Find `ALLOWED_HOSTS = []` and change it to:
        `ALLOWED_HOSTS = ['YOUR_SERVER_IP', 'localhost', '127.0.0.1']`

2.  **Migrate & Static Files**:
    ```bash
    python3 manage.py migrate
    python3 manage.py collectstatic --noinput
    ```

---

## 🚀 Phase 5: Go Live (Persistent)
To keep the server running securely on port 80, use **Gunicorn + Nginx**:

### 1. Simple Run (Gunicorn Only)
```bash
# Run in the background on port 8000
gunicorn --bind 0.0.0.0:8000 dashboard.wsgi &
```

### 2. Professional Run (Nginx Reverse Proxy)
Recommended for stability and using Port 80 without `:8000`:

1.  **Configure Nginx**:
    ```bash
    sudo nano /etc/nginx/sites-available/xscout
    ```
    Paste this in (replace `YOUR_SERVER_IP`):
    ```nginx
    server {
        listen 80;
        server_name YOUR_SERVER_IP;

        location / {
            include proxy_params;
            proxy_pass http://localhost:8000;
        }
    }
    ```
2.  **Enable & Restart**:
    ```bash
    sudo ln -s /etc/nginx/sites-available/xscout /etc/nginx/sites-enabled
    sudo nginx -t
    sudo systemctl restart nginx
    ```
3.  **Start Gunicorn**:
    ```bash
    gunicorn --bind 127.0.0.1:8000 dashboard.wsgi &
    ```

### 🌍 Access your Dashboard:
Open your browser and go to:
`http://YOUR_SERVER_IP` (No port needed!)

---

## 💡 Troubleshooting
*   **Static Files not loading?** Run `python3 manage.py collectstatic`. 
*   **Firebase Connection Error?** Ensure you have uploaded your `xscout-*.json` file to the same folder where `settings.py` is looking for it.
*   **Port 8000 blocked?** Double check your **AWS EC2 Security Group** allows inbound TCP on port 8000.

**Need a domain name?** You can use **DuckDNS** or **No-IP** for free to point a name to your AWS IP! 🛡️🚀

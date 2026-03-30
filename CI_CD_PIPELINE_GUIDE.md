# Complete Django CI/CD Pipeline Guide

This guide walks you through the entire automated setup we just injected into your project. Now, every time you push to the `main` branch, GitHub will automatically SSH into your EC2 instance, rebuild the containers, and deploy your app.

Here is the resulting folder structure we created:
```text
xScout/
│
├── .github/
│   └── workflows/
│       └── deploy.yml      # The CI/CD instructions for GitHub Actions
│
├── nginx/
│   └── nginx.conf          # Nginx configuration for reverse-proxy and static files
│
├── Dockerfile              # Instructions to build your Django Python environment
├── docker-compose.yml      # Combines Django and Nginx into a single service
├── .env                    # (You must create this!) Your secret variables
└── requirements.txt
```

---

## Step 1: Initial AWS EC2 Preparation

Before GitHub can automatically deploy your code, you must manually log into your AWS EC2 Ubuntu instance *once* to install Docker and clone your repository.

SSH into your server:
```bash
ssh -i your-key.pem ubuntu@yours-ec2-ip
```

Update packages and install Docker & Docker-Compose:
```bash
sudo apt update
sudo apt install -y docker.io docker-compose git

# Add ubuntu user to docker group (so you don't have to type 'sudo docker')
sudo usermod -aG docker ubuntu
```

Clone your repository (if you haven't already):
```bash
# This exact folder name 'xScout' is what GitHub Actions will look for!
git clone https://github.com/your-username/xScout.git
cd xScout
```

Create your production `.env` file on the server (do NOT commit this to GitHub!):
```bash
nano .env
```
Paste your secrets:
```env
DEBUG=False
SECRET_KEY=your-super-secret-production-key
ALLOWED_HOSTS=13.126.202.124,yourdomain.com
```

---

## Step 2: Configure GitHub Actions Secrets

GitHub needs permission to SSH into your server. Go to your repository on GitHub.com:
1. Navigate to **Settings** > **Secrets and variables** > **Actions**
2. Click **New repository secret**
3. Create the following three secrets:

* **`EC2_HOST`**: Your server IP address (e.g., `13.126.202.124`)
* **`EC2_USERNAME`**: The default username (usually `ubuntu`)
* **`EC2_SSH_KEY`**: The raw contents of your `.pem` private key file used to connect to AWS.

---

## Step 3: Run Locally (Testing)

You can test this exact containerized environment locally on your Windows machine before pushing it:

1. Create a `.env` file inside `d:\xScout\` with your debug keys.
2. Open PowerShell or Command Prompt in `d:\xScout\` and run:

```bash
docker-compose build
docker-compose up -d
```
Your app will be live at `http://localhost`. To stop it, run `docker-compose down`.

---

## Step 4: The CI/CD Automation

You are completely set up. From now on, simply run:

```bash
git add .
git commit -m "Deploying to production"
git push origin main
```

**What happens next?**
1. GitHub receives the code.
2. The `.github/workflows/deploy.yml` triggers.
3. GitHub logs into your EC2 server securely via SSH.
4. It reads the `docker-compose.yml` to build the new changes in the background.
5. It safely shuts down your old app and brings up the new one (`docker-compose down && docker-compose up -d`).
6. It runs your database migrations and collects static files automatically (`docker-compose exec -T web python manage.py migrate`).

Your live app will update within 1-2 minutes seamlessly!

*(Note: In `docker-compose.yml`, I provided a commented-out block for PostgreSQL. When you're ready to migrate off SQLite, simply uncomment those lines and add the `db` link to your `web` container)*

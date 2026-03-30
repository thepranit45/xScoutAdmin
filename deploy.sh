#!/bin/bash
# 🚀 xScout Fast Deploy

# 1. Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# 2. Activate environment
echo "🐍 Activating environment..."
source venv/bin/activate

# 3. Quick Update
echo "📦 Updating requirements & database..."
pip install -r requirements.txt
python3 manage.py migrate --noinput
python3 manage.py collectstatic --noinput

# 4. Restart Gunicorn
echo "🔄 Restarting Server..."
pkill gunicorn || true
gunicorn --bind 127.0.0.1:8000 dashboard.wsgi --daemon

echo "✅ Update Complete!"

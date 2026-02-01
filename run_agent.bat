@echo off
echo [*] Installing Dependencies (requests)...
pip install requests

echo.
echo [*] Starting xScout Desktop Agent...
echo     (Keep this window open to monitor active windows)
python desktop_agent.py
pause

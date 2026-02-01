# xScout System: User Guide

This guide explains how to run the complete xScout Forensic Monitoring System, from the Admin Dashboard to the Student Extension.

## 1. Admin Dashboard (The Monitor)

This is where you view live telemetry and alerts.

1.  **Open the Live URL:**
    *   Go to: `https://thepranit19.pythonanywhere.com`
2.  **Login:**
    *   Use the admin credentials you created (e.g., username `admin`).
3.  **Monitor:**
    *   You will see the main dashboard.
    *   As students connect, their cards will appear live in the grid.
    *   Click on a student card for detailed forensic logs.

## 2. Student Client (The Extension)

This is what the students/users install on their VS Code.

1.  **Install:**
    *   Open **Visual Studio Code**.
    *   Go to the **Extensions** view (Ctrl+Shift+X).
    *   Search for **`xScout Nexus`** (or `thepranit`).
    *   Click **Install**.
2.  **Connect:**
    *   Press `Ctrl+Shift+P` (Command Palette) and type `xScout: Login`.
    *   (Or type `xScout: Open Report`).
    *   Enter a **Student ID** (e.g., `student_01`).
    *   Click **Connect**.
3.  **Status:**
    *   If successful, it will say "MONITORING ACTIVE".
    *   The extension is now sending WPM, AI usage, and document activity to your Dashboard securely over HTTPS.

## 3. The Full Workflow

1.  **Admin** logs into `https://thepranit19.pythonanywhere.com`.
2.  **Student** installs extension and connects.
3.  **Admin** immediately sees the student appear on the dashboard.
4.  **Student** types code or pastes text (monitoring happens in background).
5.  **Admin** sees live metrics.

## Troubleshooting

*   **"Command 'xscout.openReport' not found":**
    *   This means the extension **crashed on startup** or wasn't installed correctly.
    *   **Fix:** Restart VS Code. If it persists, reinstall the extension.
    *   **Developer Fix:** Ensure you ran `npm install` in the extension folder before publishing.
*   **"Connection Failed" in Extension:**
    *   Ensure the student has internet access.
    *   Ensure the dashboard server (`thepranit19.pythonanywhere.com`) is running (check by visiting it in a browser).
*   **"Invalid credentials" on Dashboard:**
    *   Ensure you are using the correct admin password.

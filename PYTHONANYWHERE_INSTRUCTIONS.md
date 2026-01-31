# Deploy to PythonAnywhere

PythonAnywhere is a manual but simple platform. Follow these steps in their web dashboard.

## 1. Get the Code
1.  Log in to [PythonAnywhere](https://www.pythonanywhere.com/).
2.  Go to the **Consoles** tab and start a **Bash** console.
3.  Clone your repository:
    ```bash
    git clone https://github.com/thepranit45/xScoutAdmin.git
    cd xScoutAdmin
    ```

## 2. Set up Virtual Environment
1.  Create a virtual environment (replace `myenv` with a name you like):
    ```bash
    mkvirtualenv --python=/usr/bin/python3.10 myenv
    ```
2.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```

## 3. Configure Web App
1.  Go to the **Web** tab.
2.  **Add a new web app**.
3.  Select **Manual configuration** (do NOT select Django, manual gives you more control and is often better for existing projects).
4.  Select **Python 3.10**.

## 4. Configure Paths & Virtualenv
In the **Web** tab configuration:
1.  **Source code**: Enter the path to your folder, e.g., `/home/yourusername/xScoutAdmin`.
2.  **Virtualenv**: Enter the path to your env, e.g., `/home/yourusername/.virtualenvs/myenv`.

## 5. Configure WSGI File
1.  Click the link next to **WSGI configuration file** (it looks like `/var/www/yourusername_pythonanywhere_com_wsgi.py`).
2.  Delete everything and paste this:

    ```python
    import os
    import sys

    # Assuming your username is 'thepranit45' and repo is 'xScoutAdmin'
    # UPDATE THIS PATH TO MATCH YOUR ACTUAL PATH
    path = '/home/yourusername/xScoutAdmin'
    if path not in sys.path:
        sys.path.append(path)

    os.environ['DJANGO_SETTINGS_MODULE'] = 'dashboard.settings'

    from django.core.wsgi import get_wsgi_application
    application = get_wsgi_application()
    ```
3.  Save the file.

## 6. Static Files (CSS/JS)
1.  Go back to the **Web** tab.
2.  Under **Static files**:
    - **URL**: `/static/`
    - **Directory**: `/home/yourusername/xScoutAdmin/staticfiles` (Note: Run `python manage.py collectstatic` in the console first if this folder doesn't exist).

## 7. Database
1.  In the Bash console, run migrations:
    ```bash
    python manage.py migrate
    ```

## 8. Finish
1.  Go to the **Web** tab and click pointer **Reload**.
2.  Visit your site at `yourusername.pythonanywhere.com`.

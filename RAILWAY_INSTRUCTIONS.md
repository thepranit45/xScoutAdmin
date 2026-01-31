# Deploy to Railway

1.  **Push Changes**: I have added a `Procfile` and updated `settings.py`. Push these changes to GitHub.
    ```bash
    git add .
    git commit -m "Configure for Railway deployment"
    git push
    ```

2.  **Create Project on Railway**:
    - Go to [Railway Dashboard](https://railway.app/dashboard).
    - Click **+ New Project** -> **GitHub Repo**.
    - Select your repository: `xScoutAdmin`.

3.  **Configure Service**:
    - Railway will automatically detect the `Procfile` and `requirements.txt`.
    - It will start building immediately.

4.  **Add Database (PostgreSQL)**:
    - In your Railway project view, right-click (or click + New) -> **Database** -> **PostgreSQL**.
    - Once created, Railway automatically injects `DATABASE_URL` into your service if they are in the same project. Use the "Connect" feature to link them just to be sure, or check the "Variables" tab of your web service.

5.  **Environment Variables**:
    - Go to your Web Service -> **Variables**.
    - Add `SECRET_KEY`: (You can generate a random string).
    - Add `DISABLE_COLLECTSTATIC`: `1` (Optional: faster build if you run it in start command, but usually Railway runs build command automatically if defined in `nixpacks.toml` or purely python. Railway's default build might likely just do pip install.
    - **Recommended**: To run migrations and collectstatic, you can set the **Build Command** in Railway settings to:
      `./build.sh`

6.  **Verify**:
    - Railway provides a default domain. Click it to view your site.

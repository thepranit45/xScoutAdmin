const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

class ReportPanel {
    static createOrShow(extensionUri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (ReportPanel.currentPanel) {
            ReportPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'xscoutReport',
            'xScout Nexus',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'src', 'ui')]
            }
        );

        ReportPanel.currentPanel = new ReportPanel(panel, extensionUri);
    }

    constructor(panel, extensionUri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, []);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'login':
                        if (ReportPanel.onLogin) {
                            ReportPanel.onLogin(message.user);
                        }
                        return;
                }
            },
            null,
            []
        );
    }

    dispose() {
        ReportPanel.currentPanel = undefined;
        this._panel.dispose();
    }

    _update() {
        const webview = this._panel.webview;
        // DIRECT HTML EMBED for debugging (bypassing fs)
        const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>xScout Login</title>
    <style>
        body { background-color: #0a0a0a; color: white; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .container { background: #1a1a1a; padding: 40px; border-radius: 12px; text-align: center; border: 1px solid #333; width: 300px; }
        input { width: 100%; padding: 10px; margin: 15px 0; background: #222; border: 1px solid #444; color: white; border-radius: 6px; box-sizing: border-box;}
        button { width: 100%; padding: 10px; background: #B026FF; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; }
        button:hover { opacity: 0.9; }
        h1 { margin-bottom: 5px; }
        p { color: #888; font-size: 0.9em; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="container" id="login-view">
        <h1>xScout</h1>
        <p>Forensic Monitoring</p>
        <input type="text" id="username" placeholder="Enter Student ID" />
        <button onclick="login()">Connect</button>
        <div id="error-msg" style="color: #ff6b6b; margin-top: 10px; font-size: 0.8em; display: none;"></div>
    </div>

    <div id="dashboard-view" class="container" style="display: none;">
        <h2 style="color: #00ff00;">Monitoring Active</h2>
        <p>Session ID: <span id="session-id">...</span></p>
        <div style="margin-top:20px; font-size: 2em;" id="wpm">--</div>
        <div style="color: #888; font-size: 0.8em;">WPM Activity</div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        function login() {
            const user = document.getElementById('username').value;
            if(user) {
                document.querySelector('button').innerText = 'Verifying...';
                vscode.postMessage({ command: 'login', user: user });
            }
        }
        window.addEventListener('message', event => {
            const msg = event.data;
            if(msg.command === 'loginSuccess') {
                document.getElementById('login-view').style.display = 'none';
                document.getElementById('dashboard-view').style.display = 'block';
                document.getElementById('session-id').innerText = msg.user;
            } else if(msg.command === 'loginFailed') {
                 document.querySelector('button').innerText = 'Connect';
                 const err = document.getElementById('error-msg');
                 err.innerText = msg.message;
                 err.style.display = 'block';
            } else if(msg.command === 'updateData') {
                if(msg.data.behavior) document.getElementById('wpm').innerText = msg.data.behavior.wpm || 0;
            }
        });
    </script>
</body>
</html>`;

        this._panel.webview.html = htmlContent;
    }

    // Example of sending data to the view
    update(data) {
        this._panel.webview.postMessage({ command: 'updateData', data: data });
    }
}


ReportPanel.currentPanel = undefined;
ReportPanel.onLogin = undefined; // Callback for login event

module.exports = { ReportPanel };

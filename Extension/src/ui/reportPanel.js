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
            'xscout-report-view',
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
                            ReportPanel.onLogin(message.user, message.nodeCode);
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
    <title>xScout Nexus</title>
    <style>
        :root {
            --accent-primary: #06b6d4;
            --accent-secondary: #8b5cf6;
            --glass-bg: rgba(12, 14, 25, 0.45);
            --border-glow: rgba(6, 182, 212, 0.3);
            --text-main: #ffffff;
            --text-dim: rgba(255, 255, 255, 0.4);
        }

        @font-face {
            font-family: 'JetBrains Mono';
            src: url('https://cdn.jsdelivr.net/gh/JetBrains/JetBrainsMono/web/woff2/JetBrainsMono-Bold.woff2') format('woff2');
        }

        body { 
            margin: 0; padding: 0; min-height: 100vh; overflow: hidden;
            background-color: #03040B; color: var(--text-main);
            font-family: 'Inter', -apple-system, sans-serif;
            display: flex; align-items: center; justify-content: center;
        }

        /* CINEMATIC ENGINE */
        .video-bg {
            position: fixed; inset: 0; width: 100vw; height: 100vh; 
            object-fit: cover; z-index: -20; opacity: 0.6;
            filter: saturate(1.4) contrast(1.1) brightness(0.8);
        }
        .video-overlay {
            position: fixed; inset: 0; z-index: -10;
            background: radial-gradient(circle at center, transparent 30%, #03040B 100%);
        }
        .grid-mesh {
            position: fixed; inset: 0; z-index: -5;
            background-image: radial-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px);
            background-size: 30px 30px;
        }

        .container { 
            width: 380px; padding: 50px 40px; border-radius: 28px;
            background: var(--glass-bg); backdrop-filter: blur(40px);
            border: 1px solid rgba(255,255,255,0.1);
            box-shadow: 0 50px 100px rgba(0,0,0,0.8), inset 0 0 40px rgba(6, 182, 212, 0.05);
            text-align: center; position: relative;
        }

        .logo-area { margin-bottom: 40px; }
        .brand-name { font-size: 2.8rem; font-weight: 900; letter-spacing: -2px; margin: 0; }
        .brand-sub { font-size: 0.7rem; color: var(--accent-primary); font-weight: 800; letter-spacing: 4px; text-transform: uppercase; margin-top: 5px; }

        .form-group { text-align: left; margin-bottom: 25px; }
        .field-label { 
            font-size: 10px; font-weight: 900; color: var(--text-dim); text-transform: uppercase; 
            letter-spacing: 2px; margin-bottom: 10px; display: block;
        }

        input { 
            width: 100%; padding: 18px 20px; box-sizing: border-box;
            background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(255,255,255,0.05);
            border-radius: 16px; color: white; font-size: 15px; font-weight: 500;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            outline: none;
        }
        input:focus { 
            border-color: var(--accent-primary); 
            box-shadow: 0 0 30px rgba(6, 182, 212, 0.15);
            background: rgba(0, 0, 0, 0.6);
        }

        button { 
            width: 100%; padding: 18px; margin-top: 15px; border-radius: 16px;
            background: linear-gradient(135deg, #3B82F6, #8B5CF6);
            color: white; border: none; font-weight: 900; font-size: 14px;
            letter-spacing: 2px; cursor: pointer; transition: all 0.3s;
            box-shadow: 0 10px 25px rgba(59, 130, 246, 0.3);
        }
        button:hover { transform: translateY(-3px) scale(1.02); filter: brightness(1.1); box-shadow: 0 15px 35px rgba(59, 130, 246, 0.4); }
        button:disabled { opacity: 0.5; transform: none; }

        .admin-box {
            margin-top: 45px; padding-top: 30px; border-top: 1px solid rgba(255,255,255,0.05);
            text-align: center;
        }
        .admin-name { font-size: 13px; font-weight: 900; letter-spacing: 1.5px; color: white; margin-bottom: 5px; }
        .admin-phone { font-size: 11px; font-weight: 500; color: var(--text-dim); }

        #error-msg {
            margin-top: 20px; padding: 12px; border-radius: 12px;
            background: rgba(220, 38, 38, 0.1); border: 1px solid rgba(220, 38, 38, 0.2);
            color: #ef4444; font-size: 12px; font-weight: 600; display: none;
        }
    </style>
</head>
<body>
    <video class="video-bg" autoplay loop muted playsinline>
        <source src="https://storage.googleapis.com/gweb-gemini-cdn/gemini/uploads/89e9004d716a7803fc7c9aab18c985af783f5a36.mp4" type="video/mp4">
    </video>
    <div class="video-overlay"></div>
    <div class="grid-mesh"></div>

    <div class="container" id="login-view">
        <div class="logo-area">
            <h1 class="brand-name">xScout</h1>
            <div class="brand-sub">Forensic Terminal</div>
        </div>

        <div class="form-group">
            <label class="field-label">Developer Identity</label>
            <input type="text" id="username" autocomplete="off" />
        </div>

        <div class="form-group">
            <label class="field-label">Secure Node ID</label>
            <input type="text" id="node-code" autocomplete="off" />
        </div>

        <button onclick="login()">CONNECT</button>
        
        <div class="admin-box">
            <div class="admin-name">PRANIT GOPALE</div>
            <div class="admin-phone">Lead Forensic Engineer • 9970343404</div>
        </div>

        <div id="error-msg"></div>
    </div>


    <div id="dashboard-view" class="container" style="display: none;">
        <div style="font-size: 0.7rem; color: #34d399; font-weight: 800; letter-spacing: 0.2em; margin-bottom: 20px; border: 1px solid rgba(52, 211, 153, 0.2); display: inline-block; padding: 4px 12px; rounded: 4px; background: rgba(52, 211, 153, 0.05);">
            <span class="pulse-live"></span> SIGNAL_STATE: ACTIVE
        </div>
        <div style="font-size: 0.9rem; color: #fff; font-weight: 800; text-transform: uppercase;">Node: <span id="session-id" style="color: var(--accent-tertiary);">--</span></div>
        <div style="font-size: 0.6rem; color: var(--text-dim); margin-top: 4px;">Cluster: <span id="node-id" style="color: #fff;">GLOBAL</span></div>
        
        <div class="metric-grid">
            <div class="metric-card">
                <span class="metric-val" id="wpm">0</span>
                <span class="metric-lbl">WPM Flow</span>
            </div>
            <div class="metric-card">
                <span class="metric-val" id="ai-score" style="color: var(--accent-secondary);">0%</span>
                <span class="metric-lbl">AI Variance</span>
            </div>
        </div>

        <div id="terminal-box"></div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        function login() {
            const user = document.getElementById('username').value;
            const node = document.getElementById('node-code').value;
            if(user) {
                document.querySelector('button').disabled = true;
                document.querySelector('button').innerText = 'Syncing...';
                vscode.postMessage({ command: 'login', user: user, nodeCode: node });
            }
        }
        window.addEventListener('message', event => {
            const msg = event.data;
            if(msg.command === 'loginSuccess') {
                document.getElementById('login-view').style.display = 'none';
                document.getElementById('dashboard-view').style.display = 'block';
                document.getElementById('session-id').innerText = msg.user;
                document.getElementById('node-id').innerText = msg.nodeCode || 'GLOBAL';
            } else if(msg.command === 'loginFailed') {
                 document.querySelector('button').disabled = false;
                 document.querySelector('button').innerText = 'Initiate Link';
                 const err = document.getElementById('error-msg');
                 err.innerText = "⚠️ " + msg.message;
                 err.style.display = 'block';
            } else if(msg.command === 'updateData') {
                const data = msg.data;
                document.getElementById('wpm').innerText = data.behavior.wpm || 0;
                document.getElementById('ai-score').innerText = (data.ai * 100).toFixed(0) + '%';
                
                if(data.terminal && data.terminal.history) {
                    const box = document.getElementById('terminal-box');
                    box.innerHTML = data.terminal.history.slice(-4).map(h => 
                        \`<div style="color: \${h.isError ? '#ff6b6b' : '#34d399'}">> \${h.activity}</div>\`
                    ).join('');
                }
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

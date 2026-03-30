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
                            ReportPanel.onLogin(message.user, message.inviteCode);
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
            --bg-color: #03040B;
            --accent-primary: #1275e2;
            --accent-secondary: #a855f7;
            --accent-tertiary: #00c9ff;
            --text-main: #f8fafc;
            --text-dim: #94a3b8;
            --border: rgba(255, 255, 255, 0.08);
            --glass-bg: rgba(255, 255, 255, 0.03);
            --glass-blur: blur(28px);
        }

        body { 
            background-color: var(--bg-color); 
            color: var(--text-main); 
            font-family: 'Inter', -apple-system, sans-serif; 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center; 
            min-height: 100vh; 
            margin: 0; 
            overflow: hidden;
            background-attachment: fixed;
        }

        /* STITCH CINEMATIC EFFECTS */
        .grid-bg {
            position: fixed; inset: 0;
            background-image: radial-gradient(rgba(18, 117, 226, 0.1) 1px, transparent 1px);
            background-size: 30px 30px;
            z-index: -5;
            opacity: 0.8;
            mask-image: radial-gradient(circle at center, black 30%, transparent 90%);
        }

        .wave-bg {
            position: fixed; inset: 0;
            background: radial-gradient(circle at 50% -20%, rgba(168, 85, 247, 0.15) 0%, transparent 60%);
            z-index: -4;
        }

        .container { 
            background: var(--glass-bg); 
            padding: 40px; 
            border-radius: 24px; 
            text-align: center; 
            border: 1px solid var(--border); 
            width: 85%;
            max-width: 320px; 
            backdrop-filter: var(--glass-blur);
            -webkit-backdrop-filter: var(--glass-blur);
            box-shadow: 0 40px 100px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05);
            position: relative;
            z-index: 10;
        }

        .brand-logo {
            font-size: 2.2rem;
            font-weight: 800;
            letter-spacing: -0.05em;
            background: linear-gradient(to right, #fff, var(--text-dim));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 8px;
        }

        p { color: var(--text-dim); font-size: 0.85rem; margin-bottom: 30px; letter-spacing: 0.05em; font-weight: 500;}
        
        input { 
            width: 100%; padding: 14px; margin: 12px 0; 
            background: rgba(0,0,0,0.4); border: 1px solid var(--border); 
            color: white; border-radius: 14px; box-sizing: border-box;
            font-family: inherit; font-size: 1rem; transition: all 0.3s;
            outline: none;
        }
        input:focus { border-color: var(--accent-primary); box-shadow: 0 0 15px rgba(18, 117, 226, 0.2); background: rgba(0,0,0,0.6); }

        button { 
            width: 100%; padding: 14px; 
            background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary)); 
            color: white; border: none; border-radius: 14px; 
            cursor: pointer; font-weight: 700; font-size: 1rem;
            transition: transform 0.2s, opacity 0.2s;
            box-shadow: 0 10px 20px rgba(168, 85, 247, 0.2);
            margin-top: 10px;
        }
        button:hover { transform: translateY(-2px); opacity: 0.9; }
        button:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        /* DASHBOARD METRICS */
        .metric-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 25px; }
        .metric-card {
            background: rgba(255,255,255,0.02);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 15px;
            text-align: center;
        }
        .metric-val { font-size: 1.5rem; font-weight: 800; color: white; display: block; }
        .metric-lbl { font-size: 0.65rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; }

        #terminal-box {
            margin-top: 20px;
            background: rgba(0,0,0,0.5);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 12px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.7rem;
            height: 80px;
            overflow-y: auto;
            text-align: left;
            line-height: 1.4;
        }

        .pulse-live {
            display: inline-block; width: 8px; height: 8px; background: #34d399; border-radius: 50%;
            box-shadow: 0 0 10px #34d399; margin-right: 8px;
        }
    </style>
</head>
<body>
    <div class="grid-bg"></div>
    <div class="wave-bg"></div>

    <div class="container" id="login-view">
        <div class="brand-logo">xScout</div>
        <p>Quantum Forensic Nexus</p>
        <input type="text" id="username" placeholder="Student ID (e.g. s1)" />
        <button onclick="login()">Initiate Link</button>
        <div id="error-msg" style="color: #ff6b6b; margin-top: 15px; font-size: 0.8rem; font-weight: 600; display: none;"></div>
    </div>

    <div id="dashboard-view" class="container" style="display: none;">
        <div style="font-size: 0.75rem; color: #34d399; font-weight: 700; letter-spacing: 0.1em; margin-bottom: 20px;">
            <span class="pulse-live"></span> SYSTEM ACTIVE
        </div>
        <div style="font-size: 1rem; color: white; font-weight: 600;">ID: <span id="session-id">--</span></div>
        
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
            if(user) {
                document.querySelector('button').disabled = true;
                document.querySelector('button').innerText = 'Syncing...';
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

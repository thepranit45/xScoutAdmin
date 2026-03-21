const vscode = require('vscode');
const { AI_Scanner } = require('./modules/aiScanner');
const { Behavior_Scanner } = require('./modules/behaviorScanner');
const { Forensic_Scanner } = require('./modules/forensicScanner');
const { Project_Scanner } = require('./modules/projectScanner');
const { Tech_Scanner } = require('./modules/techScanner');
const { ReportPanel } = require('./ui/reportPanel');
const https = require('https');
const http = require('http');

const config = vscode.workspace.getConfiguration('xscout');
const DASHBOARD_HOST = config.get('dashboardHost') || '127.0.0.1';
const DASHBOARD_PORT = config.get('dashboardPort') || 8000;
const DASHBOARD_PATH = '/api/telemetry/';

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	console.log('🚀 xScout Master Engine: ONLINE 🚀');

	// Initialize Scanners
	const aiScanner = new AI_Scanner();
	const behaviorScanner = new Behavior_Scanner();
	const forensicScanner = new Forensic_Scanner();
	const projectScanner = new Project_Scanner();
	const techScanner = new Tech_Scanner();

	let activeUser = config.get('studentId') || null; 
	let telemetryInterval = null;

	// AUTO-PILOT: Attempt to verify stored ID immediately
	if (activeUser) {
		console.log(`📡 Auto-Pilot: Connecting with ID: ${activeUser}`);
		verifyUser(activeUser);
	}

	function verifyUser(user) {
		const verifyData = JSON.stringify({ student_id: user });
		const verifyOptions = {
			hostname: DASHBOARD_HOST,
			port: DASHBOARD_PORT,
			path: '/auth/api/verify-id/',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': Buffer.byteLength(verifyData)
			}
		};

		const requestModule = DASHBOARD_PORT === 443 ? https : http;
		const verifyReq = requestModule.request(verifyOptions, (res) => {
			let data = '';
			res.setEncoding('utf8');
			res.on('data', chunk => data += chunk);
			res.on('end', () => {
				try {
					const response = JSON.parse(data);
					if (response.success) {
						activeUser = user;
						vscode.window.showInformationMessage(`✅ xScout Connected: ${user} (Final Ready Mode)`);
						startTelemetryLoop();

						if (ReportPanel.currentPanel) {
							ReportPanel.currentPanel._panel.webview.postMessage({ command: 'loginSuccess', user: user });
						}
					} else {
						console.error(`⛔ xScout Auth Error: ${response.message}`);
					}
				} catch (e) { console.error('Verify JSON Error', e); }
			});
		});
		verifyReq.on('error', (e) => console.error('Verify Connect Error', e));
		verifyReq.write(verifyData);
		verifyReq.end();
	}

	function startTelemetryLoop() {
		if (telemetryInterval) clearInterval(telemetryInterval);

		telemetryInterval = setInterval(async () => {
			if (!activeUser) return;

			// Capture all forensic and behavior signals
			const behavior = behaviorScanner.scan() || {};
			const forensic = forensicScanner.scan() || {};
			const project = await projectScanner.scan() || {};
			const tech = await techScanner.scan() || {};

			const pulseData = {
				timestamp: new Date().toISOString(),
				behavior: behavior,
				forensic: forensic,
				project: project,
				tech: tech,
				ai: aiScanner.lastScanResult || 0,
				user: activeUser
			};

			const postData = JSON.stringify(pulseData);
			const options = {
				hostname: DASHBOARD_HOST,
				port: DASHBOARD_PORT,
				path: DASHBOARD_PATH,
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Content-Length': Buffer.byteLength(postData)
				}
			};

			const requestModule = DASHBOARD_PORT === 443 ? https : http;
			const req = requestModule.request(options, (res) => {
				if (res.statusCode === 200 || res.statusCode === 201) {
					console.log('📡 Telemetry Signal Sent');
				} else {
					console.error(`📡 SIGNAL FAILED: ${res.statusCode}`);
				}
			});

			req.on('error', (e) => console.error(`Signal Transmission Error: ${e.message}`));
			req.write(postData);
			req.end();
		}, 5000);

		context.subscriptions.push({ dispose: () => clearInterval(telemetryInterval) });
	}

	// Listen for Login from UI (Manual override)
	ReportPanel.onLogin = (user) => {
		console.log(`Manual Override: Connecting ${user}`);
		verifyUser(user);
	};

	// Register Commands
	context.subscriptions.push(vscode.commands.registerCommand('xscout.login', () => {
		ReportPanel.createOrShow(context.extensionUri);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('xscout.openReport', () => {
		ReportPanel.createOrShow(context.extensionUri);
	}));

	// Initial UI Trigger
	ReportPanel.createOrShow(context.extensionUri);
}

function deactivate() { }

module.exports = {
	activate,
	deactivate
}

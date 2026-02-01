const vscode = require('vscode');
const { AI_Scanner } = require('./modules/aiScanner');
const { Behavior_Scanner } = require('./modules/behaviorScanner');
const { Forensic_Scanner } = require('./modules/forensicScanner');
const { Project_Scanner } = require('./modules/projectScanner');
const { Tech_Scanner } = require('./modules/techScanner');
const { ReportPanel } = require('./ui/reportPanel');
const https = require('https');
const http = require('http');
// const admin = require('firebase-admin');
// const serviceAccount = require('../serviceAccountKey.json');

const DASHBOARD_HOST = 'thepranit19.pythonanywhere.com';
const DASHBOARD_PORT = 443;
// const DASHBOARD_HOST = '127.0.0.1';
// const DASHBOARD_PORT = 8000;
const DASHBOARD_PATH = '/api/telemetry/';

/*
try {
	admin.initializeApp({
		credential: admin.credential.cert(serviceAccount)
	});
	console.log('Firebase Admin Initialized successfully');
} catch (error) {
	console.error('Error initializing Firebase Admin:', error);
}
const db = admin.firestore();
*/

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	console.log('xScout is now active!');

	// Initialize Scanners
	const aiScanner = new AI_Scanner();
	const behaviorScanner = new Behavior_Scanner();
	const forensicScanner = new Forensic_Scanner();
	const projectScanner = new Project_Scanner();
	const techScanner = new Tech_Scanner();

	let activeUser = null; // Default null until authorized
	let telemetryInterval = null;

	// Listen for Login from UI
	ReportPanel.onLogin = (user) => {
		console.log(`Verifying User: ${user}`);

		// CHECK AUTHORIZATION
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
			res.on('data', chunk => data += chunk);
			res.on('end', () => {
				try {
					const response = JSON.parse(data);
					if (response.success) {
						activeUser = user;
						vscode.window.showInformationMessage(`✅ xScout Authorized: Tracking active for ${user}`);
						startTelemetryLoop();

						// Notify Panel
						if (ReportPanel.currentPanel) {
							ReportPanel.currentPanel._panel.webview.postMessage({ command: 'loginSuccess', user: user });
						}
					} else {
						vscode.window.showErrorMessage(`⛔ Access Denied: ID '${user}' is NOT authorized by Admin.`);
						// Notify Panel
						if (ReportPanel.currentPanel) {
							ReportPanel.currentPanel._panel.webview.postMessage({ command: 'loginFailed', message: 'ID Not Authorized' });
						}
					}
				} catch (e) {
					vscode.window.showErrorMessage('Server Error: Could not verify ID.');
				}
			});
		});

		verifyReq.on('error', (e) => {
			vscode.window.showErrorMessage('Connection Failed: Dashboard unreachable.');
		});

		verifyReq.write(verifyData);
		verifyReq.end();
	};

	function startTelemetryLoop() {
		if (telemetryInterval) clearInterval(telemetryInterval);

		telemetryInterval = setInterval(async () => {
			if (!activeUser) return;

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
				ai: aiScanner.lastScanResult || 0
			};

			console.log('Telemetry Pulse:', pulseData);

			// Detailed Log for User Verification
			if (pulseData.forensic && pulseData.forensic.activeDocuments) {
				console.log('User is accessing:', pulseData.forensic.activeDocuments);
			}

			// Send to Dashboard (via Native HTTP)
			pulseData.user = activeUser;

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
				if (res.statusCode === 200) {
					console.log('Telemetry sent to Dashboard API');
				} else {
					console.error(`Dashboard API Error: ${res.statusCode}`);
				}
			});

			req.on('error', (e) => {
				console.error(`Problem with request: ${e.message}`);
			});

			req.write(postData);
			req.end();
		}, 5000);

		context.subscriptions.push({ dispose: () => clearInterval(telemetryInterval) });
	}

	// Register Commands
	let loginDisposable = vscode.commands.registerCommand('xscout.login', function () {
		vscode.window.showInformationMessage('xScout: Please log in via the Report Panel.');
		ReportPanel.createOrShow(context.extensionUri);
	});

	let openReportDisposable = vscode.commands.registerCommand('xscout.openReport', function () {
		ReportPanel.createOrShow(context.extensionUri);
	});

	context.subscriptions.push(loginDisposable);
	context.subscriptions.push(openReportDisposable);

	// Initial Trigger
	ReportPanel.createOrShow(context.extensionUri);
}

function deactivate() { }

module.exports = {
	activate,
	deactivate
}

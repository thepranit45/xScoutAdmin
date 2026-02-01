const vscode = require('vscode');
const activeWin = require('active-win');

class Forensic_Scanner {
    constructor() {
        this.visitedDocs = new Set();
        this.appHistory = new Map(); // Store unique apps by name
        this.urlHistory = new Set(); // Track all unique URLs visited
        this.lastScanTime = Date.now();

        // Start periodic scanning of active windows
        this.startWindowTracking();
    }

    startWindowTracking() {
        // Scan active window every 2 seconds
        setInterval(async () => {
            try {
                const window = await activeWin();
                if (window) {
                    this.trackApplication(window);
                }
            } catch (error) {
                console.error('Error tracking active window:', error);
            }
        }, 2000);
    }

    /**
     * Extract URL from browser window title
     * Browser titles often contain the URL or domain
     */
    extractUrlFromTitle(title, appName) {
        // Common browser title formats:
        // Chrome: "Page Title - Google Chrome" or "domain.com - Google Chrome"
        // Firefox: "Page Title — Mozilla Firefox" or "domain.com — Mozilla Firefox"
        // Edge: "Page Title - Microsoft Edge"

        let extractedUrl = null;

        // Try to find URL patterns in the title
        const urlPattern = /(https?:\/\/[^\s]+)/gi;
        const urlMatch = title.match(urlPattern);
        if (urlMatch) {
            extractedUrl = urlMatch[0];
        } else {
            // Try to extract domain from title (before browser name)
            const browserNames = ['Google Chrome', 'Mozilla Firefox', 'Microsoft Edge', 'Edge', 'Chrome', 'Firefox'];
            let cleanTitle = title;

            for (const browserName of browserNames) {
                const separators = [' - ', ' — ', ' – ', ' | '];
                for (const sep of separators) {
                    if (cleanTitle.includes(sep + browserName)) {
                        cleanTitle = cleanTitle.split(sep + browserName)[0];
                        break;
                    }
                }
            }

            // Check if it looks like a domain
            const domainPattern = /([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/;
            const domainMatch = cleanTitle.match(domainPattern);
            if (domainMatch) {
                extractedUrl = 'https://' + domainMatch[0];
            } else {
                // If no URL found, use the cleaned title
                extractedUrl = cleanTitle.trim();
            }
        }

        return extractedUrl;
    }

    /**
     * Determine if an app is a web browser
     */
    isBrowser(appName) {
        const browserKeywords = ['chrome', 'firefox', 'edge', 'brave', 'opera', 'safari'];
        return browserKeywords.some(keyword => appName.toLowerCase().includes(keyword));
    }

    trackApplication(window) {
        const appName = window.owner.name || 'Unknown';
        const title = window.title || 'Untitled';
        const currentTime = new Date().toLocaleTimeString();
        const isBrowser = this.isBrowser(appName);

        // Determine context based on app
        let context = 'General Use';
        if (isBrowser) {
            context = 'Web Browsing';
        } else if (appName.toLowerCase().includes('code') || appName.toLowerCase().includes('visual studio')) {
            context = 'Development';
        } else if (appName.toLowerCase().includes('slack') || appName.toLowerCase().includes('teams') || appName.toLowerCase().includes('discord')) {
            context = 'Communication';
        } else if (appName.toLowerCase().includes('word') || appName.toLowerCase().includes('excel') || appName.toLowerCase().includes('powerpoint')) {
            context = 'Productivity';
        }

        // Extract URL if it's a browser
        let tabEntry = title;
        let extractedDomain = null;

        if (isBrowser) {
            const extractedUrl = this.extractUrlFromTitle(title, appName);

            if (extractedUrl && extractedUrl.startsWith('http')) {
                // Full URL extracted
                tabEntry = extractedUrl;
                this.urlHistory.add(extractedUrl);

                // Extract domain for prepending
                try {
                    const url = new URL(extractedUrl);
                    extractedDomain = url.hostname;
                } catch (e) { }
            } else {
                // Try to extract domain from title for better display
                // Remove browser name from title first
                let cleanTitle = title
                    .replace(/ - Google Chrome$/i, '')
                    .replace(/ - Mozilla Firefox$/i, '')
                    .replace(/ - Microsoft Edge$/i, '')
                    .replace(/ — Mozilla Firefox$/i, '')
                    .trim();

                // Check if title contains a domain pattern
                const domainPattern = /([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/;
                const domainMatch = cleanTitle.match(domainPattern);

                if (domainMatch) {
                    extractedDomain = domainMatch[0];
                    // Format as "domain.com - Page Title"
                    const pageTitle = cleanTitle.replace(domainMatch[0], '').replace(/^[\s\-|]+/, '').trim();
                    tabEntry = pageTitle ? `${extractedDomain} - ${pageTitle}` : extractedDomain;
                    this.urlHistory.add(`https://${extractedDomain}`);
                } else {
                    // No domain found, just use clean title
                    tabEntry = cleanTitle;
                }
            }
        }

        // Create or update app entry
        if (!this.appHistory.has(appName)) {
            this.appHistory.set(appName, {
                app: appName,
                title: title,
                context: context,
                time: currentTime,
                tabs: [tabEntry],
                lastSeen: Date.now(),
                isBrowser: isBrowser
            });
        } else {
            const appData = this.appHistory.get(appName);
            appData.title = title;
            appData.time = currentTime;
            appData.lastSeen = Date.now();

            // Add to tabs if not already present
            if (!appData.tabs.includes(tabEntry)) {
                appData.tabs.push(tabEntry);
                // Keep only last 30 tabs per app (increased for browsers)
                if (appData.tabs.length > 30) {
                    appData.tabs.shift();
                }
            }
        }
    }

    scan() {
        // Track VS Code documents
        const openDocs = vscode.workspace.textDocuments.map(doc => doc.fileName);
        openDocs.forEach(doc => this.visitedDocs.add(doc));

        // Add VS Code to app history
        if (openDocs.length > 0) {
            const vsCodeApp = 'Visual Studio Code';
            if (!this.appHistory.has(vsCodeApp)) {
                this.appHistory.set(vsCodeApp, {
                    app: vsCodeApp,
                    title: 'VS Code - Active',
                    context: 'Development',
                    time: new Date().toLocaleTimeString(),
                    tabs: openDocs,
                    lastSeen: Date.now(),
                    isBrowser: false
                });
            } else {
                const appData = this.appHistory.get(vsCodeApp);
                appData.tabs = openDocs;
                appData.time = new Date().toLocaleTimeString();
                appData.lastSeen = Date.now();
            }
        }

        // Convert Map to Array for response
        const appHistoryArray = Array.from(this.appHistory.values());

        // Snapshot active code (First 50 lines)
        let snapshot = null;
        let language = null;
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const doc = editor.document;
            language = doc.languageId;
            // Limit to 50 lines / 2000 chars for performance/privacy
            snapshot = doc.getText().substring(0, 2000);
            if (doc.lineCount > 50) {
                const lines = snapshot.split('\n').slice(0, 50);
                snapshot = lines.join('\n') + '\n... (truncated)';
            }
        }

        return {
            activeDocuments: openDocs,
            history: Array.from(this.visitedDocs),
            appHistory: appHistoryArray,
            urlHistory: Array.from(this.urlHistory),
            snapshot: {
                code: snapshot,
                language: language,
                timestamp: new Date().toISOString()
            }
        };
    }
}

module.exports = { Forensic_Scanner };

const vscode = require('vscode');

class Terminal_Scanner {
    constructor() {
        this.terminalHistory = [];
        this.activeTerminal = null;
        this.lastError = null;
        this.setupListeners();
    }

    setupListeners() {
        // Track Terminal Life Cycle
        vscode.window.onDidOpenTerminal(terminal => {
            this.activeTerminal = terminal;
            this.logActivity(`Terminal Opened: ${terminal.name}`);
        });

        // Capture command execution via Shell Integration (Requires VS Code 1.70+)
        // This allows us to see exactly what was typed and if it failed.
        if (vscode.window.onDidEndTerminalShellExecution) {
            vscode.window.onDidEndTerminalShellExecution(event => {
                const commandLine = event.execution.commandLine.value;
                const exitCode = event.exitCode;
                const status = exitCode === 0 ? 'SUCCESS' : 'ERROR';
                
                this.logActivity(`Command Finished: "${commandLine}" [${status}]`, exitCode);
                
                if (exitCode !== 0) {
                    this.lastError = {
                        command: commandLine,
                        exitCode: exitCode,
                        timestamp: new Date().toISOString()
                    };
                    console.log(`[TERMINAL ERROR] detected: ${commandLine}`);
                }
            });
        }
    }

    logActivity(log, exitCode = 0) {
        const entry = {
            timestamp: new Date().toLocaleTimeString(),
            activity: log,
            isError: exitCode !== 0,
            command: log.match(/"([^"]+)"/)?.[1] || ''
        };

        this.terminalHistory.push(entry);
        
        // Keep only last 20 entries
        if (this.terminalHistory.length > 20) {
            this.terminalHistory.shift();
        }
    }

    scan() {
        const terminals = vscode.window.terminals.map(t => ({
            name: t.name,
            isActive: vscode.window.activeTerminal === t,
        }));

        const result = {
            activeTerminals: terminals,
            history: this.terminalHistory,
            lastError: this.lastError
        };
        
        // Reset lastError after scan if needed, or keep it for the next pulse
        // For xScout, we keep it so the dashboard can catch it in the next 5s cycle.
        return result;
    }
}

module.exports = { Terminal_Scanner };

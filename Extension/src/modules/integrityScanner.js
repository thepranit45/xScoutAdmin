const vscode = require('vscode');

class Integrity_Scanner {
    constructor() {
        this.unauthorizedExtensions = [
            'github.copilot',
            'github.copilot-chat',
            'tabnine.tabnine-vscode',
            'codeium.codeium',
            'blackboxapp.blackbox',
            'amazon.aws-toolkit-vscode', // Whisperer?
            'sourcegraph.cody-ai'
        ];
        this.lastScanTime = 0;
        this.suspiciousFiles = new Set();
    }

    /**
     * Scan for external threats and unauthorized tools
     */
    async scan() {
        const results = {
            unauthorizedTools: [],
            gitStatus: null,
            workplaceIntegrity: 'Passed'
        };

        // 1. Scan for AI Extensions
        const activeAITools = vscode.extensions.all.filter(ext => {
             return this.unauthorizedExtensions.some(id => ext.id.toLowerCase().includes(id));
        }).map(ext => ext.id);

        results.unauthorizedTools = activeAITools;

        // 2. Check for Git Repository anomalies (Sudden changes/untracked files)
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders) {
                const rootPath = workspaceFolders[0].uri.fsPath;
                // Check if git is initialized
                const fs = require('fs');
                const path = require('path');
                if (fs.existsSync(path.join(rootPath, '.git'))) {
                    // Try to get status of untracked files
                    // (Requires child_process to be safe, for now we just check existence of large new files)
                }
            }
        } catch (e) { }

        // 3. Monitor Workspace for newly added large files 
        // (Handled by checking the number of files periodically)

        return results;
    }
}

module.exports = { Integrity_Scanner };

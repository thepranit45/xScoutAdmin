const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

class Project_Scanner {
    constructor() {
        this.lastScanTime = 0;
        this.lastStructure = null;
    }

    /**
     * Scan the current workspace structure
     * Returns a simplified tree JSON
     */
    async scan() {
        // Only scan if a workspace is open
        if (!vscode.workspace.workspaceFolders) {
            return null;
        }

        const rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const rootName = vscode.workspace.workspaceFolders[0].name;

        try {
            const structure = await this.getDirectoryStructure(rootPath, rootName, 0);
            this.lastStructure = structure;
            this.lastScanTime = Date.now();
            return structure;
        } catch (error) {
            console.error('Error scanning project structure:', error);
            return null;
        }
    }

    /**
     * Recursively list files and folders
     * Limit depth to avoid performance issues
     */
    async getDirectoryStructure(dirPath, name, depth) {
        if (depth > 5) { // Max depth limit
            return null;
        }

        const stats = await fs.promises.stat(dirPath);
        if (!stats.isDirectory()) {
            return {
                name: name,
                type: 'file'
            };
        }

        const item = {
            name: name,
            type: 'folder',
            children: []
        };

        try {
            const dirents = await fs.promises.readdir(dirPath, { withFileTypes: true });

            // Filter and sort
            // Ignore common heavy folders
            const ignoreList = ['.git', 'node_modules', '.vscode', '__pycache__', 'dist', 'build', 'out'];

            for (const dirent of dirents) {
                if (ignoreList.includes(dirent.name)) continue;

                const fullPath = path.join(dirPath, dirent.name);
                const child = await this.getDirectoryStructure(fullPath, dirent.name, depth + 1);

                if (child) {
                    item.children.push(child);
                }
            }

            // Sort: Folders first, then files
            item.children.sort((a, b) => {
                if (a.type === b.type) return a.name.localeCompare(b.name);
                return a.type === 'folder' ? -1 : 1;
            });

        } catch (e) {
            // Ignore access errors
        }

        return item;
    }
}

module.exports = { Project_Scanner };

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

class Tech_Scanner {
    constructor() {
        this.cache = null;
        this.lastScan = 0;
    }

    async scan() {
        // Cache result for 1 minute to avoid heavy IO
        if (this.cache && (Date.now() - this.lastScan < 60000)) {
            return this.cache;
        }

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) return null;

        const rootPath = workspaceFolders[0].uri.fsPath;

        const result = {
            categories: {
                frontend: [],
                backend: [],
                database: [],
                devops: []
            },
            meta: {
                author: 'Unknown',
                created: 'Unknown',
                git: false
            }
        };

        try {
            // 1. Check Metadata (package.json)
            const packageJsonPath = path.join(rootPath, 'package.json');
            if (fs.existsSync(packageJsonPath)) {
                const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                if (pkg.author) {
                    if (typeof pkg.author === 'string') result.meta.author = pkg.author;
                    else if (typeof pkg.author === 'object') result.meta.author = pkg.author.name;
                }

                // Scan Dependencies
                const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
                this.analyzeDependencies(allDeps, result);
            }

            // 2. Check Python (requirements.txt)
            const reqPath = path.join(rootPath, 'requirements.txt');
            if (fs.existsSync(reqPath)) {
                const content = fs.readFileSync(reqPath, 'utf8');
                if (content.includes('django')) result.categories.backend.push('Django');
                if (content.includes('flask')) result.categories.backend.push('Flask');
                if (content.includes('fastapi')) result.categories.backend.push('FastAPI');
                if (content.includes('sqlalchemy')) result.categories.database.push('SQLAlchemy');
                if (content.includes('psycopg2')) result.categories.database.push('PostgreSQL');
                if (content.includes('pymongo')) result.categories.database.push('MongoDB');
            }

            // 3. Check Python (Pipfile)
            const pipPath = path.join(rootPath, 'Pipfile');
            if (fs.existsSync(pipPath)) {
                const content = fs.readFileSync(pipPath, 'utf8');
                if (content.includes('django')) result.categories.backend.push('Django');
                if (content.includes('flask')) result.categories.backend.push('Flask');
            }

            // 4. File-based Detection (Config Files)
            if (fs.existsSync(path.join(rootPath, 'next.config.js'))) result.categories.frontend.push('Next.js');
            if (fs.existsSync(path.join(rootPath, 'vite.config.js'))) result.categories.frontend.push('Vite');
            if (fs.existsSync(path.join(rootPath, 'tailwind.config.js'))) result.categories.frontend.push('Tailwind CSS');
            if (fs.existsSync(path.join(rootPath, 'docker-compose.yml'))) result.categories.devops.push('Docker');
            if (fs.existsSync(path.join(rootPath, 'firebase.json'))) result.categories.backend.push('Firebase');

            // 4b. Recursive File Extension Analysis
            const extCounts = {};
            this.scanDir(rootPath, extCounts, 0);
            this.inferFromExtensions(extCounts, result);

            // Check for .git
            if (fs.existsSync(path.join(rootPath, '.git'))) {
                result.meta.git = true;
                // Try to read config for user
                try {
                    const gitConfig = fs.readFileSync(path.join(rootPath, '.git', 'config'), 'utf8');
                    const userMatch = gitConfig.match(/name = (.*)/);
                    if (userMatch && result.meta.author === 'Unknown') {
                        result.meta.author = userMatch[1].trim();
                    }
                } catch (e) { }
            }

            // 5. Creation Date (Birthtime of root folder or package.json)
            const stats = fs.statSync(rootPath);
            result.meta.created = stats.birthtime.toISOString().split('T')[0];

            // Deduplicate
            result.categories.frontend = [...new Set(result.categories.frontend)];
            result.categories.backend = [...new Set(result.categories.backend)];
            result.categories.database = [...new Set(result.categories.database)];
            result.categories.devops = [...new Set(result.categories.devops)];

            this.cache = result;
            this.lastScan = Date.now();
            return result;

        } catch (error) {
            console.error('Tech Scan Error:', error);
            return null;
        }
    }

    scanDir(currentPath, counts, depth) {
        if (depth > 4) return; // Limit depth to avoid performance issues

        try {
            const items = fs.readdirSync(currentPath);

            for (const item of items) {
                const fullPath = path.join(currentPath, item);
                const stat = fs.statSync(fullPath);

                if (stat.isDirectory()) {
                    // Exclude common heavy directories
                    if (item === 'node_modules' || item === '.git' || item === 'venv' || item === '__pycache__' || item === 'dist' || item === 'build' || item === '.next') continue;
                    this.scanDir(fullPath, counts, depth + 1);
                } else if (stat.isFile()) {
                    const ext = path.extname(item).toLowerCase();
                    if (ext) {
                        counts[ext] = (counts[ext] || 0) + 1;
                    }
                }
            }
        } catch (e) {
            // Ignore permission errors or read errors
        }
    }

    inferFromExtensions(counts, result) {
        // Frontend
        if (counts['.html']) result.categories.frontend.push('HTML');
        if (counts['.css']) result.categories.frontend.push('CSS');
        if (counts['.scss'] || counts['.sass']) result.categories.frontend.push('Sass');
        if (counts['.jsx'] || counts['.tsx']) result.categories.frontend.push('React');
        if (counts['.vue']) result.categories.frontend.push('Vue');
        if (counts['.js'] || counts['.ts']) result.categories.frontend.push('JavaScript');

        // Backend
        if (counts['.py']) result.categories.backend.push('Python');
        if (counts['.php']) result.categories.backend.push('PHP');
        if (counts['.rb']) result.categories.backend.push('Ruby');
        if (counts['.java']) result.categories.backend.push('Java');
        if (counts['.go']) result.categories.backend.push('Go');
        if (counts['.cs']) result.categories.backend.push('C#');
        if (counts['.rs']) result.categories.backend.push('Rust');

        // Database
        if (counts['.sql']) result.categories.database.push('SQL');
        if (counts['.sqlite'] || counts['.sqlite3']) result.categories.database.push('SQLite');

        // Logic check: If Python is present but no specific framework detected yet, maybe hint generic
        // But we just push languages here.
    }

    analyzeDependencies(deps, result) {
        if (!deps) return;
        const d = Object.keys(deps);

        // Frontend
        if (d.includes('react')) result.categories.frontend.push('React');
        if (d.includes('vue')) result.categories.frontend.push('Vue');
        if (d.includes('svelte')) result.categories.frontend.push('Svelte');
        if (d.includes('angular')) result.categories.frontend.push('Angular');
        if (d.includes('tailwindcss')) result.categories.frontend.push('Tailwind CSS');
        if (d.includes('bootstrap')) result.categories.frontend.push('Bootstrap');
        if (d.includes('framer-motion')) result.categories.frontend.push('Framer Motion');
        if (d.includes('three')) result.categories.frontend.push('Three.js');
        if (d.includes('sass') || d.includes('node-sass')) result.categories.frontend.push('Sass');

        // Backend
        if (d.includes('express')) result.categories.backend.push('Express.js');
        if (d.includes('nestjs')) result.categories.backend.push('NestJS');
        if (d.includes('socket.io')) result.categories.backend.push('Socket.io');
        if (d.includes('graphql')) result.categories.backend.push('GraphQL');

        // Database
        if (d.includes('mongoose') || d.includes('mongodb')) result.categories.database.push('MongoDB');
        if (d.includes('pg')) result.categories.database.push('PostgreSQL');
        if (d.includes('mysql') || d.includes('mysql2')) result.categories.database.push('MySQL');
        if (d.includes('firebase')) result.categories.database.push('Firebase');
        if (d.includes('supabase')) result.categories.database.push('Supabase');
        if (d.includes('prisma')) result.categories.database.push('Prisma');
    }
}

module.exports = { Tech_Scanner };

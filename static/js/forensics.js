
// -- SHARED FORENSIC LOGIC (Root-Optimized v971) --
let currentModalData = null;
let currentHistory = [];

function analyzeStack() {
    const data = currentModalData;
    if (!data) return;

    // Use tech scan result if available
    const tech = data.tech || {};
    const meta = tech.meta || {};

    const modal = document.getElementById('tech-stack-modal');
    if (modal) modal.style.display = 'block';

    // Populate Tech Modal Metadata
    document.getElementById('tech-author').innerText = meta.author || data.studentId || data.user || 'Unknown';
    document.getElementById('tech-created').innerText = meta.created || (data.timestamp ? new Date(data.timestamp).toLocaleDateString() : 'N/A');

    // Populate Repository Link
    const repoLink = document.getElementById('tech-repo');
    const repoEmpty = document.getElementById('tech-repo-empty');
    if (repoLink && repoEmpty) {
        if (meta.repository) {
            let cleanUrl = meta.repository.replace('git@github.com:', 'https://github.com/').replace('.git', '');
            if (!cleanUrl.startsWith('http')) cleanUrl = 'https://' + cleanUrl;
            repoLink.href = cleanUrl;
            repoLink.innerText = 'View Source ↗';
            repoLink.style.display = 'inline';
            repoEmpty.style.display = 'none';
        } else {
            repoLink.style.display = 'none';
            repoEmpty.style.display = 'inline';
        }
    }

    const gitEl = document.getElementById('tech-git');
    if (gitEl) {
        gitEl.innerText = meta.git ? 'Active Tracking (Git)' : 'No Repository';
        gitEl.style.color = meta.git ? '#00ff88' : '#ff4444';
    }

    // Helper to render badges
    const renderBadges = (elementId, items, color) => {
        const el = document.getElementById(elementId);
        if (!el) return;
        el.innerHTML = '';
        if (!items || items.length === 0) {
            el.innerHTML = '<span style="color:#666; font-size:0.8rem;">None detected</span>';
            return;
        }
        items.forEach(item => {
            el.innerHTML += `<span style="background: rgba(${color}, 0.1); border: 1px solid rgba(${color}, 0.3); padding: 4px 10px; border-radius: 4px; color: rgba(${color}, 1); font-size:0.8rem; margin: 2px;">${item}</span>`;
        });
    };

    const cats = tech.categories || {};
    renderBadges('tech-frontend', cats.frontend || [], '0, 243, 255');
    renderBadges('tech-backend', cats.backend || [], '176, 38, 255');
    renderBadges('tech-database', cats.database || [], '241, 224, 90');
    renderBadges('tech-devops', cats.devops || [], '255, 107, 107');
}

function openCinemaMode() {
    const data = currentModalData;
    if (data && (data.studentId || data.user || data.id)) {
        const id = data.studentId || data.user || data.id;
        window.location.href = `/playback/?user_id=${encodeURIComponent(id)}`;
    } else {
        alert("Select a student to watch replay.");
    }
}

function openForensicModal(data) {
    if (!data) return;
    currentModalData = data;
    const modal = document.getElementById('forensic-modal');
    if (!modal) return;
    
    const userName = data.studentId || data.user || data.id || 'Unknown Student';
    const nameEl = document.getElementById('modal-student-name');
    if (nameEl) nameEl.innerText = userName;

    modal.style.display = 'block';
    updateModalView(data);
    fetchHistory(data.studentId || data.user || data.id);
    populateForensicDetails(data);
}

async function fetchHistory(userId) {
    if (!userId) return;
    const slider = document.getElementById('time-travel-slider');
    const label = document.getElementById('timeline-current');
    if (!slider || !label) return;

    slider.disabled = true;
    try {
        const response = await fetch(`/api/history/${userId}/`);
        const json = await response.json();
        if (json.status === 'success' && json.data.length > 0) {
            currentHistory = json.data;
            slider.disabled = false;
            slider.max = currentHistory.length - 1;
            slider.value = currentHistory.length - 1;
            label.innerText = "Live / Real-time";

            // Add interactivity to the slider
            slider.oninput = (e) => {
                const index = parseInt(e.target.value);
                const entry = currentHistory[index];
                if (entry) {
                    updateModalView(entry);
                    populateForensicDetails(entry);
                    label.innerText = new Date(entry.timestamp).toLocaleTimeString();
                    console.log(`[TIME TRAVEL] Point: ${index}, Time: ${entry.timestamp}`);
                }
            };
        }
    } catch (e) {
        console.error("History fetch error", e);
    }
}

function updateModalView(data) {
    const aiVal = data.ai || 0;
    const riskEl = document.getElementById('modal-risk-score');
    if (riskEl) {
        riskEl.innerText = (aiVal * 100).toFixed(0) + '%';
        riskEl.style.color = aiVal > 0.6 ? '#ff3b3b' : '#00ff88';
    }

    const snapshot = (data.forensic && data.forensic.snapshot) ? data.forensic.snapshot : null;
    const codeEl = document.getElementById('snapshot-code');
    const fileEl = document.getElementById('snapshot-file');
    const langEl = document.getElementById('snapshot-lang');
    
    if (codeEl) {
        codeEl.innerText = (snapshot && snapshot.code) ? snapshot.code : "// No live code snapshots available.";
    }
    if (fileEl) {
        fileEl.innerText = (snapshot && snapshot.file) ? snapshot.file.split(/[\\/]/).pop() : "No active file";
    }
    if (langEl) {
        langEl.innerText = (snapshot && snapshot.language) ? snapshot.language.toUpperCase() : "Unknown";
    }
}

function populateForensicDetails(data) {
    const tbody = document.getElementById('forensic-history-body');
    if (!tbody) return;
    const history = (data.forensic && data.forensic.appHistory) ? data.forensic.appHistory : [];
    tbody.innerHTML = '';
    history.slice(0, 5).forEach(item => {
        tbody.innerHTML += `<tr>
            <td><strong>${item.app || 'OS'}</strong></td>
            <td>${item.title || 'Untitled'}</td>
            <td>${item.context || 'General'}</td>
            <td>${item.time || '--'}</td>
            <td>Logged</td>
        </tr>`;
    });
}

// --- MASTER EXPLORER ENGINE ---
function toggleExplorer() {
    const sidebar = document.getElementById('explorer-sidebar');
    if (sidebar) {
        sidebar.classList.toggle('active');
        if (sidebar.classList.contains('active')) {
            const treeContainer = document.getElementById('project-tree-view');
            if (!treeContainer.hasChildNodes()) loadRootDirectory();
        }
    }
}

async function loadRootDirectory() {
    const treeContainer = document.getElementById('project-tree-view');
    treeContainer.innerHTML = '<div style="padding:20px; color:#888;">Loading...</div>';
    try {
        const res = await fetch('/api/explorer/');
        const json = await res.json();
        if (json.status === 'success') {
            treeContainer.innerHTML = '';
            const ul = document.createElement('ul');
            ul.className = 'tree';
            json.data.forEach(item => ul.appendChild(renderTreeItem(item, '')));
            treeContainer.appendChild(ul);
        }
    } catch (e) { treeContainer.innerHTML = 'Error'; }
}

function renderTreeItem(item, parentPath = '') {
    const li = document.createElement('li');
    const cleanPath = item.path || (parentPath ? parentPath + '/' + item.name : item.name);
    const div = document.createElement('div');
    const isDirectory = item.type === 'directory' || item.type === 'folder';
    div.className = 'tree-item' + (isDirectory ? ' folder' : '');
    div.innerHTML = `<span class="tree-icon">${isDirectory ? '📂' : '📄'}</span> ${item.name}`;
    li.appendChild(div);

    if (isDirectory) {
        const ul = document.createElement('ul');
        ul.className = 'nested';
        li.appendChild(ul);

        // Pre-populate children if they exist in the payload
        if (item.children && item.children.length > 0) {
            item.children.forEach(c => ul.appendChild(renderTreeItem(c, cleanPath)));
        }

        div.onclick = async (e) => {
            e.stopPropagation();
            console.log(`[EXPLORER] Toggling directory: ${item.name} (${cleanPath})`);
            ul.classList.toggle('active');
            
            // If it was expanded but has no children, try to fetch from server as fallback
            if (ul.classList.contains('active') && ul.childElementCount === 0) {
                console.log(`[EXPLORER] Fetching remote sub-directory: ${cleanPath}`);
                try {
                    const res = await fetch(`/api/explorer/?path=${encodeURIComponent(cleanPath)}`);
                    const json = await res.json();
                    if (json.status === 'success' && json.data) {
                        json.data.forEach(c => ul.appendChild(renderTreeItem(c, cleanPath)));
                    } else {
                        ul.innerHTML = '<li style="color:#666; font-size:0.8rem; padding-left:20px;">Empty or Access Denied</li>';
                    }
                } catch (err) {
                    console.error("Failed to load directory expansion", err);
                    ul.innerHTML = '<li style="color:#ff4444; font-size:0.8rem; padding-left:20px;">Load Error</li>';
                }
            }
        };
    } else {
        div.onclick = () => viewFile(cleanPath);
    }
    return li;
}

async function viewFile(path) {
    const modal = document.getElementById('file-viewer-modal');
    if (!modal) return;
    const codeBlock = document.getElementById('file-viewer-code');
    const lineNumbers = document.getElementById('line-numbers');
    const title = document.getElementById('file-viewer-filename');
    title.innerText = path;
    codeBlock.innerHTML = "<code>Loading...</code>";
    if (lineNumbers) lineNumbers.innerHTML = "";
    modal.style.display = 'block';

    try {
        const res = await fetch(`/api/read-file/?path=${encodeURIComponent(path)}`);
        const json = await res.json();
        if (json.status === 'success') {
            const ext = path.split('.').pop().toLowerCase();
            const langMap = {
                'py': 'python', 'js': 'javascript', 'html': 'markup',
                'css': 'css', 'json': 'json', 'md': 'markdown'
            };
            const lang = langMap[ext] || 'clike';

            // Populate Line Numbers
            if (lineNumbers) {
                const totalLines = json.content.split('\n').length;
                let linesText = "";
                for (let i = 1; i <= totalLines; i++) {
                    linesText += `<div>${i}</div>`;
                }
                lineNumbers.innerHTML = linesText;
            }

            // Apply Highlighting
            codeBlock.innerHTML = `<code class="language-${lang}">${escapeHtml(json.content)}</code>`;
            if (window.Prism) Prism.highlightElement(codeBlock.querySelector('code'));
        } else {
            codeBlock.innerText = `// Error: ${json.message || 'File could not be read.'}`;
            console.warn("[FILE VIEWER] Read failed:", json.message);
        }
    } catch (err) {
        codeBlock.innerText = "// Network error: Could not connect to file API.";
        console.error("[FILE VIEWER] Fetch error:", err);
    }
}

// Helper for highlighting safety
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function viewStudentWorkspace() {
    const data = currentModalData;
    if (!data || !data.project) return alert("No workspace structure available.");
    const sidebar = document.getElementById('explorer-sidebar');
    if (sidebar) sidebar.classList.add('active');
    const treeContainer = document.getElementById('project-tree-view');
    treeContainer.innerHTML = '';
    const ul = document.createElement('ul');
    ul.className = 'tree';
    ul.appendChild(renderTreeItem(data.project));
    treeContainer.appendChild(ul);
}

function closeModal() {
    document.getElementById('forensic-modal').style.display = 'none';
}

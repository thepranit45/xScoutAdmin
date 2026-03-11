
// -- SHARED FORENSIC LOGIC --
// Used by both Dashboard (index.html) and Environment (environment.html)

let currentModalData = null;
let currentHistory = [];

function openForensicModal(data) {
    if (!data) return;
    currentModalData = data;

    const modal = document.getElementById('forensic-modal');
    if (!modal) {
        console.error("Forensic modal not found in DOM");
        return;
    }

    // Populate Header
    const userName = data.user || data.id || 'Unknown';
    const nameEl = document.getElementById('modal-student-name');
    if (nameEl) nameEl.innerText = userName;

    // Check for Paste Alert
    updateModalView(data);

    // Fetch History for Time Travel
    fetchHistory(data.user || data.id);

    // Populate Details
    populateForensicDetails(data);

    modal.style.display = 'block';
}

async function fetchHistory(userId) {
    if (!userId) return;
    const slider = document.getElementById('time-travel-slider');
    const label = document.getElementById('timeline-current');

    if (!slider || !label) return;

    // Reset Slider
    slider.disabled = true;
    label.innerText = "Loading history...";
    currentHistory = [];

    try {
        const response = await fetch(`/api/history/${userId}/`);
        const json = await response.json();

        if (json.status === 'success' && json.data.length > 0) {
            currentHistory = json.data;
            slider.disabled = false;
            slider.max = currentHistory.length - 1;
            slider.value = currentHistory.length - 1; // Default to latest
            label.innerText = "Live";

            // Slider Event Listener
            slider.oninput = (e) => {
                const index = parseInt(e.target.value);
                const historyData = currentHistory[index];
                if (historyData) {
                    updateModalView(historyData);

                    // Update Label
                    const time = new Date(historyData.timestamp).toLocaleTimeString();
                    if (index === currentHistory.length - 1) {
                        label.innerText = `Live (${time})`;
                        label.style.color = '#00ff88';
                    } else {
                        label.innerText = `Replay: ${time}`;
                        label.style.color = '#ffaa00';
                    }
                }
            };
        } else {
            label.innerText = "No history available";
        }
    } catch (e) {
        console.error("History fetch error", e);
        label.innerText = "History Error";
    }
}

function updateModalView(data) {
    // Populate Risk Score
    const riskScore = (data.ai * 100).toFixed(0) + '%';
    const riskEl = document.getElementById('modal-risk-score');
    if (riskEl) {
        riskEl.innerText = riskScore;
        riskEl.style.color = data.ai > 0.5 ? '#ff3b3b' : '#00ff88';
    }

    // Populate Code Snapshot (Shadow IDE)
    const snapshot = data.forensic && data.forensic.snapshot;
    const codeEl = document.getElementById('snapshot-code');
    const fileEl = document.getElementById('snapshot-file');
    const langEl = document.getElementById('snapshot-lang');

    if (codeEl) {
        if (snapshot && snapshot.code) {
            codeEl.innerText = snapshot.code;
            if (fileEl) fileEl.innerText = "Snapshot (" + (snapshot.timestamp || 'Unknown Time') + ")";
            if (langEl) langEl.innerText = snapshot.language || 'Unknown';
        } else {
            codeEl.innerText = "// No code snapshot available";
            if (fileEl) fileEl.innerText = "No active file";
        }
    }

    // Check for Paste Alert
    const pasteCount = data.behavior ? data.behavior.pasteCount : 0;
    const pasteAlert = document.getElementById('paste-alert');
    if (pasteAlert) {
        if (pasteCount > 0) {
            pasteAlert.style.display = 'block';
            pasteAlert.innerHTML = `⚠️ ${pasteCount} PASTES DETECTED`;
        } else {
            pasteAlert.style.display = 'none';
        }
    }
}

function populateForensicDetails(data, showAll = false) {
    // Populate Table
    const tbody = document.getElementById('forensic-history-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    // Populate Project Tree (Active Workspace in Modal) -- Optional if element exists
    const treeContainer = document.getElementById('student-project-tree');
    if (treeContainer) {
        treeContainer.innerHTML = '';

        if (data.project) {
            const treeRoot = document.createElement('ul');
            treeRoot.className = 'tree';

            // Render root
            const rootNode = renderTreeItem(data.project);
            treeRoot.appendChild(rootNode);
            treeContainer.appendChild(treeRoot);

            // Auto-expand root
            const rootDiv = rootNode.querySelector('.tree-item');
            if (rootDiv && (data.project.type === 'directory' || data.project.type === 'folder')) {
                // Use setTimeout to ensure DOM is ready and event listeners attached
                setTimeout(() => rootDiv.click(), 50);
            }
        } else {
            treeContainer.innerHTML = '<span style="color: #666; font-style: italic;">No active workspace structure data available.</span>';
        }
    }

    const history = (data.forensic && data.forensic.appHistory) ? data.forensic.appHistory : [];
    let displayHistory = history;

    // Limit to 3 items if not showing all
    if (!showAll && history.length > 3) {
        displayHistory = history.slice(0, 3);
    }

    if (history.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#555;">No recent app history available.</td></tr>';
    } else {
        displayHistory.forEach((item, index) => {
            const tabsCount = item.tabs ? item.tabs.length : 0;
            const rowId = `history-row-${index}`;
            const detailsId = `history-details-${index}`;

            const row = document.createElement('tr');
            row.id = rowId;

            let titleDisplay = item.title;
            let visitLinkButton = '';

            // Try to extract URL from title (works for any app, not just browsers)
            const urlPattern = /(https?:\/\/[^\s]+)/gi;
            const urlMatch = item.title && item.title.match ? item.title.match(urlPattern) : null;

            if (urlMatch) {
                const url = urlMatch[0];
                visitLinkButton = createVisitButton(url);
            } else {
                // Check if title contains a domain pattern
                const domainPattern = /([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/;
                const domainMatch = item.title && item.title.match ? item.title.match(domainPattern) : null;
                if (domainMatch) {
                    const domain = domainMatch[0];
                    if (!item.title.includes('\\') && !item.title.includes('/src/') && !item.title.includes('.js') && !item.title.includes('.py')) {
                        visitLinkButton = createVisitButton(`https://${domain}`);
                    }
                }
            }

            row.innerHTML = `
                    <td><strong>${item.app}</strong></td>
                    <td style="color:#aaa;">${titleDisplay}${visitLinkButton}</td>
                    <td><span style="background:#333; padding:2px 6px; border-radius:4px; font-size:0.8rem;">${item.context}</span></td>
                    <td>${item.time}</td>
                    <td>
                        <button class="btn-view-tabs" onclick="toggleTabs('${detailsId}')">
                            View Tabs (${tabsCount})
                        </button>
                    </td>
                `;
            tbody.appendChild(row);

            // Detail Row
            if (tabsCount > 0) {
                const detailRow = document.createElement('tr');
                detailRow.id = detailsId;
                detailRow.style.display = 'none';
                detailRow.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';

                // Helper to render tabs content could be here, but inlining for simplicity matching original
                const tabsList = item.tabs.map(t => formatTabItem(t, item)).join('');

                detailRow.innerHTML = `
                        <td colspan="5" style="padding: 10px 20px;">
                            <div style="font-size: 0.7rem; color: var(--text-dim); margin-bottom: 8px; letter-spacing:1px;">OPEN TABS</div>
                            ${tabsList}
                        </td>
                    `;
                tbody.appendChild(detailRow);
            }
        });

        // Add "View All" button if truncated
        if (!showAll && history.length > 3) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="5" style="text-align: center; padding: 15px;">
                    <button onclick="window.forensicHistoryExpanded = true; populateForensicDetails(currentModalData, true)" 
                            style="background: transparent; border: 1px solid var(--primary); color: var(--primary); padding: 8px 20px; border-radius: 6px; cursor: pointer; font-size: 0.9rem; transition: all 0.2s;">
                        View All Activity (${history.length})
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        }
    }
}

function createVisitButton(url) {
    return `<a href="${url}" target="_blank" 
            style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                   color: white; 
                   padding: 3px 10px; 
                   border-radius: 5px; 
                   text-decoration: none; 
                   font-size: 0.7rem; 
                   font-weight: 600;
                   margin-left: 8px;
                   transition: all 0.3s ease;
                   box-shadow: 0 2px 6px rgba(102, 126, 234, 0.3);
                   display: inline-flex;
                   align-items: center;
                   gap: 3px;"
            onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 10px rgba(102, 126, 234, 0.5)';"
            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 6px rgba(102, 126, 234, 0.3)';">
            🔗 Visit
        </a>`;
}

function formatTabItem(t, parentItem) {
    let content = t;
    let iconHtml = '<span style="margin-right:8px;">📄</span>';
    let visitButton = '';

    if (t.startsWith('http')) {
        try {
            const url = new URL(t);
            const domain = url.hostname;
            const favicon = `https://www.google.com/s2/favicons?domain=${domain}`;
            iconHtml = `<img src="${favicon}" style="width:16px; height:16px; margin-right:8px; vertical-align:middle;" onerror="this.style.display='none'">`;

            const path = url.pathname === '/' ? '' : url.pathname;
            const search = url.search || '';
            content = `<div style="flex: 1;"><strong style="color: #4da6ff;">${domain}</strong> <span style="color:#888;">${path}${search}</span></div>`;
            visitButton = createVisitButton(t).replace('padding: 3px 10px', 'padding: 4px 12px').replace('font-size: 0.7rem', 'font-size: 0.75rem');
        } catch (e) {
            content = `<span style="color: #4da6ff; flex: 1;">${t}</span>`;
        }
    } else if (t.match(/^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,} - .+/)) {
        const parts = t.split(' - ');
        const domain = parts[0];
        const pageTitle = parts.slice(1).join(' - ');
        const favicon = `https://www.google.com/s2/favicons?domain=${domain}`;
        iconHtml = `<img src="${favicon}" style="width:16px; height:16px; margin-right:8px; vertical-align:middle;" onerror="this.style.display='none'">`;
        content = `<div style="flex: 1;"><strong style="color: #4da6ff;">${domain}</strong><span style="color: #aaa;"> - ${pageTitle}</span></div>`;
        visitButton = createVisitButton(`https://${domain}`).replace('padding: 3px 10px', 'padding: 4px 12px').replace('font-size: 0.7rem', 'font-size: 0.75rem');
    } else if (parentItem.isBrowser || parentItem.context === 'Web Browsing') {
        const cleanTitle = t.replace(/ - Google Chrome| - Mozilla Firefox| - Microsoft Edge/gi, '').trim();
        const domainPattern = /([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/;
        const domainMatch = cleanTitle.match(domainPattern);
        if (domainMatch) {
            const domain = domainMatch[0];
            const favicon = `https://www.google.com/s2/favicons?domain=${domain}`;
            iconHtml = `<img src="${favicon}" style="width:16px; height:16px; margin-right:8px; vertical-align:middle;" onerror="this.style.display='none'">`;
            content = `<div style="flex: 1;"><span style="color: #aaa;">${t}</span></div>`;
            visitButton = createVisitButton(`https://${domain}`).replace('padding: 3px 10px', 'padding: 4px 12px').replace('font-size: 0.7rem', 'font-size: 0.75rem');
        } else {
            content = `<div style="flex: 1;"><span style="color: #aaa;">${t}</span></div>`;
        }
    } else {
        content = `<span style="color: #aaa; flex: 1;">${t}</span>`;
    }

    return `<div style="padding: 8px 0; border-bottom: 1px solid #333; display:flex; align-items:center; gap: 12px;">
            ${iconHtml} ${content} ${visitButton}
        </div>`;
}


function toggleTabs(id) {
    const el = document.getElementById(id);
    if (el) {
        el.style.display = el.style.display === 'none' ? 'table-row' : 'none';
    }
}

function closeModal() {
    const modal = document.getElementById('forensic-modal');
    if (modal) modal.style.display = 'none';
}

function closeStatsModal() {
    const modal = document.getElementById('tech-stack-modal');
    if (modal) modal.style.display = 'none';
}


// -- Tree Render Logic --
function renderTreeItem(item, parentPath = '') {
    const li = document.createElement('li');
    // Normalize path separation
    const cleanPath = item.path || (parentPath ? parentPath + '/' + item.name : item.name);

    const div = document.createElement('div');
    div.className = 'tree-item';
    div.dataset.path = cleanPath;

    const isFolder = item.type === 'directory' || item.type === 'folder';
    if (isFolder) div.classList.add('folder');

    let iconClass = isFolder ? 'folder-icon' : 'file-icon';
    let iconContent = '';
    let caretHtml = '';

    if (isFolder) {
        iconContent = `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" style="width: 16px; height: 16px;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;
        caretHtml = `<span class="caret"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg></span>`;
    } else {
        iconContent = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px; opacity: 0.8;"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>`;
        if (item.name.endsWith('.js') || item.name.endsWith('.ts')) { iconClass = 'js-icon'; }
        else if (item.name.endsWith('.css') || item.name.endsWith('.scss')) { iconClass = 'css-icon'; }
        else if (item.name.endsWith('.html')) { iconClass = 'html-icon'; }
        else if (item.name.endsWith('.py')) { iconClass = 'py-icon'; }
    }

    div.innerHTML = `
        ${caretHtml}
        <span class="tree-icon ${iconClass}">${iconContent}</span>
        <span class="tree-label">${item.name}</span>
    `;

    li.appendChild(div);

    // Event Handling
    if (isFolder) {
        const ul = document.createElement('ul');
        ul.className = 'nested';
        li.appendChild(ul);
        let loaded = false;

        div.addEventListener('click', async (e) => {
            e.stopPropagation();
            ul.classList.toggle('active');

            const caret = div.querySelector('.caret');
            if (caret) caret.classList.toggle('caret-down');

            if (!loaded && ul.classList.contains('active')) {
                // Static Children (Student Telemetry) - Check existence, not just length
                if (Array.isArray(item.children)) {
                    ul.innerHTML = '';
                    if (item.children.length === 0) {
                        ul.innerHTML = '<li style="color:#666; font-size:0.7em; padding:5px; padding-left: 20px;"><i>Empty Folder</i></li>';
                    } else {
                        item.children.forEach(child => {
                            ul.appendChild(renderTreeItem(child, cleanPath));
                        });
                    }
                    loaded = true;
                    return;
                }

                // Server Fetch (Only if no local children array)
                try {
                    const res = await fetch(`/api/explorer/?path=${encodeURIComponent(cleanPath)}`);
                    const json = await res.json();
                    if (json.status === 'success') {
                        ul.innerHTML = '';
                        if (json.data.length === 0) {
                            ul.innerHTML = '<li style="color:#666; font-size:0.7em; padding:5px; padding-left: 20px;"><i>Empty Folder</i></li>';
                        } else {
                            json.data.forEach(child => {
                                ul.appendChild(renderTreeItem(child, cleanPath));
                            });
                        }
                        loaded = true;
                    }
                } catch (err) {
                    console.error("Failed to load folder", err);
                    ul.innerHTML = '<li style="color:red; font-size:0.7em; padding:5px;">Folder not on server</li>';
                }
            }
        });
    } else {
        div.addEventListener('click', (e) => {
            e.stopPropagation();
            if (item.type === 'file' || item.type === 'folder') {
                if (item.path) viewFile(item.path);
                else viewFile(cleanPath);
            }
        });
    }
    return li;
}

function toggleExplorer() {
    const sidebar = document.getElementById('explorer-sidebar');
    if (sidebar) {
        sidebar.classList.toggle('active');
        if (sidebar.classList.contains('active')) {
            const treeContainer = document.getElementById('project-tree-view');
            if (!treeContainer.hasChildNodes()) {
                loadRootDirectory();
            }
        }
    }
}

async function loadRootDirectory() {
    const treeContainer = document.getElementById('project-tree-view');
    const headerTitle = document.querySelector('#explorer-sidebar h3');

    if (headerTitle) {
        headerTitle.innerHTML = 'EXPLORER <span style="font-size:0.6em; color:#666; display:block;">SERVER FILES</span>';
    }

    treeContainer.innerHTML = '<div style="padding:20px; color:#888;">Loading Server Files...</div>';

    try {
        const res = await fetch('/api/explorer/');
        const json = await res.json();

        if (json.status === 'success') {
            treeContainer.innerHTML = '';
            const ul = document.createElement('ul');
            ul.className = 'tree';

            json.data.forEach(item => {
                ul.appendChild(renderTreeItem(item, ''));
            });
            treeContainer.appendChild(ul);
        } else {
            treeContainer.innerHTML = `<div style="padding:20px; color:red;">Error: ${json.message}</div>`;
        }
    } catch (e) {
        treeContainer.innerHTML = `<div style="padding:20px; color:red;">Connection Error</div>`;
    }
}

function viewStudentWorkspace() {
    const data = currentModalData;
    if (!data || !data.project) {
        alert("No workspace structure available for this student.");
        return;
    }

    const sidebar = document.getElementById('explorer-sidebar');
    if (sidebar && !sidebar.classList.contains('active')) {
        sidebar.classList.add('active');
    }

    const headerTitle = document.querySelector('#explorer-sidebar h3');
    if (headerTitle) {
        const studentName = data.user || data.id || 'Student';
        headerTitle.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:2px;">
                <span>${studentName.toUpperCase()}</span>
                <button onclick="loadRootDirectory()" style="
                    background: transparent; 
                    border: 1px solid #444; 
                    color: #888; 
                    font-size: 0.6rem; 
                    cursor: pointer; 
                    border-radius: 4px; 
                    padding: 2px 5px; 
                    width: fit-content;">
                    ← BACK TO SERVER
                </button>
            </div>
        `;
    }

    const treeContainer = document.getElementById('project-tree-view');
    treeContainer.innerHTML = '';

    const treeRoot = document.createElement('ul');
    treeRoot.className = 'tree';

    const rootNode = renderTreeItem(data.project);
    treeRoot.appendChild(rootNode);
    treeContainer.appendChild(treeRoot);

    const rootDiv = rootNode.querySelector('.tree-item');
    if (rootDiv && (data.project.type === 'directory' || data.project.type === 'folder')) {
        rootDiv.click();
    }
}

async function viewFile(path) {
    const modal = document.getElementById('file-viewer-modal');
    const title = document.getElementById('file-viewer-filename');
    const codeBlock = document.getElementById('file-viewer-code');
    const lineNumbers = document.getElementById('line-numbers');

    if (!modal || !codeBlock) return;

    title.innerText = path;
    codeBlock.innerText = "Loading content...";
    if (lineNumbers) lineNumbers.innerText = "";
    modal.style.display = 'block';

    try {
        const res = await fetch(`/api/read-file/?path=${encodeURIComponent(path)}`, {
            credentials: 'include'
        });

        const text = await res.text();
        try {
            const json = JSON.parse(text);
            if (json.status === 'success') {
                const content = json.content;
                codeBlock.innerText = content;

                if (lineNumbers) {
                    const lines = content.split('\n').length;
                    lineNumbers.innerText = Array.from({ length: lines }, (_, i) => i + 1).join('\n');
                }
            } else {
                codeBlock.innerText = `Error: ${json.message}`;
                if (lineNumbers) lineNumbers.innerText = "!";
            }
        } catch (e) {
            console.error("Failed to parse JSON:", text);
            codeBlock.innerText = `Server returned invalid JSON.\n\n${text.substring(0, 500)}...`;
            if (lineNumbers) lineNumbers.innerText = "!";
        }
    } catch (e) {
        codeBlock.innerText = "Error fetching file.";
    }
}

// Global click handler to close modals
window.addEventListener('click', function (event) {
    const forensicModal = document.getElementById('forensic-modal');
    const techModal = document.getElementById('tech-stack-modal');
    const sidebar = document.getElementById('explorer-sidebar');

    if (event.target == forensicModal) {
        forensicModal.style.display = "none";
    }
    if (event.target == techModal) {
        techModal.style.display = "none";
    }
    // Optional: Close sidebar if clicking outside (can be annoying though)
});

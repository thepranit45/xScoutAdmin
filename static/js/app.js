// Polling Dashboard
const POLLING_INTERVAL = 3000;

function initDashboard() {
    console.log("Initializing xScout Dashboard (API Mode)...");
    fetchData();
    setInterval(fetchData, POLLING_INTERVAL);
}

async function fetchData() {
    try {
        const response = await fetch('/api/telemetry');
        const json = await response.json();

        if (json.status === 'success') {
            window.lastTelemetryData = json.data; // Store for modal access
            updateTable(json.data);

            // Update 3D Graph
            if (window.networkGraph) {
                window.networkGraph.updateData(json.data);
            }
        }
    } catch (error) {
        console.error("Error fetching telemetry:", error);
    }
}

function updateTable(dataList) {
    const tableBody = document.getElementById('student-table');
    if (!tableBody) {
        console.error("Critical: Student table body not found!");
        return;
    }

    tableBody.innerHTML = ''; // Clear current
    let total = 0;

    console.log(`Rendering table with ${dataList.length} items`);

    dataList.forEach(data => {
        total++;
        renderRow(tableBody, data);
    });

    const totalEl = document.getElementById('total-monitored');
    if (totalEl) totalEl.innerText = total;

    // Update Active Threads (based on Online status)
    const activeThreadsEl = document.getElementById('active-threads');
    if (activeThreadsEl) {
        const activeCount = dataList.filter(d => {
            const lastTime = d.timestamp ? new Date(d.timestamp).getTime() : 0;
            return (Date.now() - lastTime) < 10000;
        }).length;
        activeThreadsEl.innerText = activeCount;
    }
}

function renderRow(container, data) {
    try {
        const row = document.createElement('tr');

        // Parse timestamp (ISO String from Extension)
        const lastActiveTime = data.timestamp ? new Date(data.timestamp).getTime() : 0;
        const isOnline = (Date.now() - lastActiveTime) < 10000;
        const statusClass = isOnline ? 'status-online' : 'status-offline';
        const statusText = isOnline ? 'Online' : 'Offline';

        // Use ID as user name if user not specified
        let userName = data.user || data.id || 'Unknown';
        if (typeof userName !== 'string') userName = String(userName);

        // Flow State Logic
        const flowState = data.behavior && data.behavior.flowState ? data.behavior.flowState : 'NORMAL';
        let flowBadge = '';
        if (flowState === 'FLOW') flowBadge = '<span style="background: #00ff88; color: #000; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; font-weight: bold; margin-left: 5px;">FLOW</span>';
        else if (flowState === 'DISTRACTED') flowBadge = '<span style="background: #ffaa00; color: #000; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; font-weight: bold; margin-left: 5px;">DISTRACTED</span>';
        else if (flowState === 'IDLE') flowBadge = '<span style="background: #555; color: #ccc; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; font-weight: bold; margin-left: 5px;">IDLE</span>';

        row.innerHTML = `
            <td>
                <div style="display: flex; align-items: center;">
                    <div style="width: 30px; height: 30px; background: #333; border-radius: 4px; display: flex; align-items: center; justify-content: center; margin-right: 10px;">${userName.charAt(0).toUpperCase()}</div>
                    <div>
                        <strong>${userName}</strong>${flowBadge}<br>
                        <span style="font-size: 0.8rem; color: #888;">Student</span>
                    </div>
                </div>
            </td>
            <td>
                <span style="color: var(--text-dim); font-size: 0.9em;">
                    ${data.behavior && data.behavior.wpm ? `WPM: ${data.behavior.wpm}` : 'Active'}
                </span>
            </td>
            <td>
                <span style="color: ${data.ai > 0.5 ? 'red' : 'green'}; font-weight: bold;">
                    ${(data.ai * 100).toFixed(0)}%
                </span>
            </td>
            <td>${lastActiveTime ? new Date(lastActiveTime).toLocaleTimeString() : '--'}</td>
            <td><span class="status-dot ${statusClass}"></span> ${statusText}</td>
            <td><button onclick="openModal(${window.lastTelemetryData.indexOf(data)})" style="background: transparent; border: 1px solid var(--primary); color: white; padding: 5px 15px; border-radius: 20px; cursor: pointer;">Analyze</button></td>
        `;

        container.appendChild(row);
    } catch (e) {
        console.error("Error rendering row:", e, data);
        const errorRow = document.createElement('tr');
        errorRow.innerHTML = `<td colspan="6" style="background: rgba(255,0,0,0.1); border-left: 3px solid red; padding: 15px; color: #ff6b6b;">
            <strong>Render Error:</strong> ${e.message}
        </td>`;
        container.appendChild(errorRow);
    }
}

// Start
initDashboard();

// -- MODAL LOGIC --
let currentModalData = null;

function openModal(dataIndex) {
    const data = window.lastTelemetryData[dataIndex];
    if (!data) return;
    currentModalData = data;

    const modal = document.getElementById('forensic-modal');

    // Populate Header
    const userName = data.user || data.id || 'Unknown';
    document.getElementById('modal-student-name').innerText = userName;

    // Check for Paste Alert
    updateModalView(data);

    // Fetch History for Time Travel
    fetchHistory(data.user || data.id);

    // Populate Details
    populateForensicDetails(data);

    modal.style.display = 'block';
}

let currentHistory = [];

async function fetchHistory(userId) {
    if (!userId) return;
    const slider = document.getElementById('time-travel-slider');
    const label = document.getElementById('timeline-current');

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
    if (snapshot && snapshot.code) {
        document.getElementById('snapshot-code').innerText = snapshot.code;
        document.getElementById('snapshot-file').innerText = "Snapshot (" + (snapshot.timestamp || 'Unknown Time') + ")";
        document.getElementById('snapshot-lang').innerText = snapshot.language || 'Unknown';
    } else {
        document.getElementById('snapshot-code').innerText = "// No code snapshot available";
        document.getElementById('snapshot-file').innerText = "No active file";
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
    tbody.innerHTML = '';

    // Populate Project Tree (Active Workspace in Modal)
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

    const history = data.forensic.appHistory || [];
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

            // Check if this is a browser and extract URL from title
            let titleDisplay = item.title;
            let visitLinkButton = '';

            console.log('Processing item:', item.app, '|', item.title, '| isBrowser:', item.isBrowser);

            // Try to extract URL from title (works for any app, not just browsers)
            const urlPattern = /(https?:\/\/[^\s]+)/gi;
            const urlMatch = item.title.match(urlPattern);

            if (urlMatch) {
                // Found a full URL in the title
                const url = urlMatch[0];
                visitLinkButton = `<a href="${url}" target="_blank" 
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
            } else {
                // Check if title contains a domain pattern
                const domainPattern = /([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/;
                const domainMatch = item.title.match(domainPattern);
                if (domainMatch) {
                    const domain = domainMatch[0];
                    // Only add button if it looks like a real domain (not a file path)
                    if (!item.title.includes('\\') && !item.title.includes('/src/') && !item.title.includes('.js') && !item.title.includes('.py')) {
                        visitLinkButton = `<a href="https://${domain}" target="_blank" 
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

            // Detail Row (Hidden by default)
            if (tabsCount > 0) {
                const detailRow = document.createElement('tr');
                detailRow.id = detailsId;
                detailRow.style.display = 'none';
                detailRow.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';

                const tabsList = item.tabs.map(t => {
                    let content = t;
                    let iconHtml = '<span style="margin-right:8px;">📄</span>';
                    let visitButton = '';

                    // Check if it's a URL (starts with http or https)
                    if (t.startsWith('http')) {
                        try {
                            const url = new URL(t);
                            const domain = url.hostname;
                            const favicon = `https://www.google.com/s2/favicons?domain=${domain}`;
                            iconHtml = `<img src="${favicon}" style="width:16px; height:16px; margin-right:8px; vertical-align:middle;" onerror="this.style.display='none'">`;

                            // Format the URL nicely
                            const path = url.pathname === '/' ? '' : url.pathname;
                            const search = url.search || '';
                            content = `<div style="flex: 1;">
                                    <strong style="color: #4da6ff;">${domain}</strong> 
                                    <span style="color:#888;">${path}${search}</span>
                                </div>`;

                            // Add Visit Link button
                            visitButton = `<a href="${t}" target="_blank" 
                                    style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                           color: white; 
                                           padding: 4px 12px; 
                                           border-radius: 6px; 
                                           text-decoration: none; 
                                           font-size: 0.75rem; 
                                           font-weight: 600;
                                           transition: all 0.3s ease;
                                           box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
                                           display: inline-flex;
                                           align-items: center;
                                           gap: 4px;"
                                    onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(102, 126, 234, 0.5)';"
                                    onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(102, 126, 234, 0.3)';">
                                    <span>🔗</span> Visit Link
                                </a>`;
                        } catch (e) {
                            // If URL parsing fails, just show as text
                            content = `<span style="color: #4da6ff; flex: 1;">${t}</span>`;
                        }
                    } else if (t.match(/^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,} - .+/)) {
                        // Format: "domain.com - Page Title"
                        const parts = t.split(' - ');
                        const domain = parts[0];
                        const pageTitle = parts.slice(1).join(' - ');

                        const favicon = `https://www.google.com/s2/favicons?domain=${domain}`;
                        iconHtml = `<img src="${favicon}" style="width:16px; height:16px; margin-right:8px; vertical-align:middle;" onerror="this.style.display='none'">`;

                        content = `<div style="flex: 1;">
                                <strong style="color: #4da6ff;">${domain}</strong>
                                <span style="color: #aaa;"> - ${pageTitle}</span>
                            </div>`;

                        visitButton = `<a href="https://${domain}" target="_blank" 
                                style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                       color: white; 
                                       padding: 4px 12px; 
                                       border-radius: 6px; 
                                       text-decoration: none; 
                                       font-size: 0.75rem; 
                                       font-weight: 600;
                                       transition: all 0.3s ease;
                                       box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
                                       display: inline-flex;
                                       align-items: center;
                                       gap: 4px;"
                                onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(102, 126, 234, 0.5)';"
                                onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(102, 126, 234, 0.3)';">
                                <span>🔗</span> Visit Link
                            </a>`;
                    } else if (item.isBrowser || item.context === 'Web Browsing') {
                        // This is a browser tab - try to make it a clickable link
                        // Extract potential domain or use Google search
                        const cleanTitle = t.replace(/ - Google Chrome| - Mozilla Firefox| - Microsoft Edge/gi, '').trim();

                        // Check if it looks like a domain
                        const domainPattern = /([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/;
                        const domainMatch = cleanTitle.match(domainPattern);

                        if (domainMatch) {
                            const domain = domainMatch[0];
                            const favicon = `https://www.google.com/s2/favicons?domain=${domain}`;
                            iconHtml = `<img src="${favicon}" style="width:16px; height:16px; margin-right:8px; vertical-align:middle;" onerror="this.style.display='none'">`;

                            content = `<div style="flex: 1;">
                                    <span style="color: #aaa;">${t}</span>
                                </div>`;

                            visitButton = `<a href="https://${domain}" target="_blank" 
                                    style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                           color: white; 
                                           padding: 4px 12px; 
                                           border-radius: 6px; 
                                           text-decoration: none; 
                                           font-size: 0.75rem; 
                                           font-weight: 600;
                                           transition: all 0.3s ease;
                                           box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
                                           display: inline-flex;
                                           align-items: center;
                                           gap: 4px;"
                                    onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(102, 126, 234, 0.5)';"
                                    onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(102, 126, 234, 0.3)';">
                                    <span>🔗</span> Visit Link
                                </a>`;
                        } else {
                            // No domain found - just show the title without a button
                            content = `<div style="flex: 1;">
                                    <span style="color: #aaa;">${t}</span>
                                </div>`;
                        }
                    } else {
                        // Regular file or title
                        content = `<span style="color: #aaa; flex: 1;">${t}</span>`;
                    }

                    return `<div style="padding: 8px 0; border-bottom: 1px solid #333; display:flex; align-items:center; gap: 12px;">
                            ${iconHtml} ${content} ${visitButton}
                        </div>`;
                }).join('');

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
                    <button onclick="populateForensicDetails(currentModalData, true)" 
                            style="background: transparent; border: 1px solid var(--primary); color: var(--primary); padding: 8px 20px; border-radius: 6px; cursor: pointer; font-size: 0.9rem; transition: all 0.2s;">
                        View All Activity (${history.length})
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        }
    }
}

function toggleTabs(id) {
    const el = document.getElementById(id);
    if (el) {
        el.style.display = el.style.display === 'none' ? 'table-row' : 'none';
    }
}

function closeModal() {
    document.getElementById('forensic-modal').style.display = 'none';
}

// Close when clicking outside
window.onclick = function (event) {
    const forensicModal = document.getElementById('forensic-modal');
    const techModal = document.getElementById('tech-stack-modal');

    if (event.target == forensicModal) {
        forensicModal.style.display = "none";
    }
    if (event.target == techModal) {
        techModal.style.display = "none";
    }
}

// -- Tree Render Logic --
function renderTreeItem(item, parentPath = '') {
    const li = document.createElement('li');
    // Normalize path separation
    const cleanPath = item.path || (parentPath ? parentPath + '/' + item.name : item.name);

    const div = document.createElement('div');
    div.className = 'tree-item';

    // Set data-path for easy access
    div.dataset.path = cleanPath;

    // Icon Logic
    // Support both 'directory' (Server) and 'folder' (Extension)
    const isFolder = item.type === 'directory' || item.type === 'folder';
    if (isFolder) div.classList.add('folder');

    let iconClass = isFolder ? 'folder-icon' : 'file-icon';

    // Use SVGs for full color control (Neon Blue)
    let iconContent = '';
    let caretHtml = '';

    if (isFolder) {
        // Filled Folder SVG (Solid Block)
        iconContent = `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" style="width: 16px; height: 16px;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;

        // Add Caret for folders
        caretHtml = `<span class="caret"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg></span>`;
    } else {
        // Default File SVG
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
        // Container for children
        const ul = document.createElement('ul');
        ul.className = 'nested';
        li.appendChild(ul);

        let loaded = false;

        div.addEventListener('click', async (e) => {
            e.stopPropagation();
            ul.classList.toggle('active');

            const caret = div.querySelector('.caret');
            if (caret) caret.classList.toggle('caret-down');

            // Lazy Load or Static Load
            if (!loaded && ul.classList.contains('active')) {
                // CASE A: Static Children (Student Telemetry)
                if (item.children && item.children.length > 0) {
                    ul.innerHTML = '';
                    item.children.forEach(child => {
                        ul.appendChild(renderTreeItem(child, cleanPath));
                    });
                    loaded = true;
                    return;
                }

                // CASE B: Server Fetch (Admin Explorer)
                // Only fetch if we don't have children AND it's not a student node (avoid 404s)
                // We can check if we are in "Student Mode" or just let it fail gracefully, 
                // but better to rely on `item.children` being absent.

                try {
                    const res = await fetch(`/api/explorer/?path=${encodeURIComponent(cleanPath)}`);
                    const json = await res.json();

                    if (json.status === 'success') {
                        ul.innerHTML = ''; // Clear potentially empty state
                        json.data.forEach(child => {
                            ul.appendChild(renderTreeItem(child, cleanPath));
                        });
                        loaded = true;
                    }
                } catch (err) {
                    console.error("Failed to load folder", err);
                    ul.innerHTML = '<li style="color:red; font-size:0.7em; padding:5px;">Folder not on server</li>';
                }
            }
        });
    } else {
        // File Click
        div.addEventListener('click', (e) => {
            e.stopPropagation();
            // Now we can view files because we have the absolute path from the extension
            // and the backend allows reading absolute paths in Forensic Mode.

            // Check if it's a student file (based on 'folder' type availability in siblings or just context)
            if (item.type === 'file' || item.type === 'folder') {
                // If it has a path property, use it directly (Absolute from extension)
                if (item.path) {
                    viewFile(item.path);
                } else {
                    // Fallback to relative path construction if path missing (Legacy)
                    viewFile(cleanPath);
                }
            }
        });
    }

    return li;
}

// -- Explorer Sidebar Logic --
function toggleExplorer() {
    const sidebar = document.getElementById('explorer-sidebar');
    if (sidebar) {
        sidebar.classList.toggle('active');

        // Load root if empty and opening
        if (sidebar.classList.contains('active')) {
            const treeContainer = document.getElementById('project-tree-view');

            // If empty, load server root by default
            if (!treeContainer.hasChildNodes()) {
                loadRootDirectory();
            }
        }
    }
}

// Function to load the Server's file system (Admin View)
async function loadRootDirectory() {
    const treeContainer = document.getElementById('project-tree-view');
    const headerTitle = document.querySelector('#explorer-sidebar h3');

    // Update Header
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
                ul.appendChild(renderTreeItem(item, '')); // Render server items
            });
            treeContainer.appendChild(ul);
        } else {
            treeContainer.innerHTML = `<div style="padding:20px; color:red;">Error: ${json.message}</div>`;
        }
    } catch (e) {
        treeContainer.innerHTML = `<div style="padding:20px; color:red;">Connection Error</div>`;
    }
}

// Function to load the Student's file system (Telemetry View) - Triggered by Modal Button
function viewStudentWorkspace() {
    const data = currentModalData;
    if (!data || !data.project) {
        // Fallback or Alert
        alert("No workspace structure available for this student.");
        return;
    }

    // 1. Close Modal if open (optional, but good for focus) - User might want to keep it open
    // document.getElementById('forensic-modal').style.display = 'none';

    // 2. Open Sidebar
    const sidebar = document.getElementById('explorer-sidebar');
    if (sidebar && !sidebar.classList.contains('active')) {
        sidebar.classList.add('active');
    }

    // 3. Update Header with Back Button
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

    // 4. Render Student Tree
    const treeContainer = document.getElementById('project-tree-view');
    treeContainer.innerHTML = ''; // Clear server files

    const treeRoot = document.createElement('ul');
    treeRoot.className = 'tree';

    // Student data is already a tree object
    const rootNode = renderTreeItem(data.project);
    treeRoot.appendChild(rootNode);
    treeContainer.appendChild(treeRoot);

    // Auto-expand the root folder by clicking it
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

    // Show Loading
    title.innerText = path;
    codeBlock.innerText = "Loading content...";
    if (lineNumbers) lineNumbers.innerText = "";
    modal.style.display = 'block';

    try {
        const res = await fetch(`/api/read-file/?path=${encodeURIComponent(path)}`, {
            credentials: 'include' // Ensure cookies are sent
        });

        const text = await res.text();
        try {
            const json = JSON.parse(text);
            if (json.status === 'success') {
                const content = json.content;
                codeBlock.innerText = content;

                // Generate Line Numbers
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
            codeBlock.innerText = `Server returned invalid JSON. Check console for details.\n\nPreview:\n${text.substring(0, 200)}...`;
            if (lineNumbers) lineNumbers.innerText = "!";
        }
    } catch (e) {
        codeBlock.innerText = `Error reading file: ${e}`;
        if (lineNumbers) lineNumbers.innerText = "!";
    }
}

// -- Tech Stack Analysis Logic --
function analyzeStack() {
    const data = currentModalData;
    if (!data || !data.tech) {
        alert("No technology data available for this session.");
        return;
    }

    const tech = data.tech;

    // Populate Metadata
    document.getElementById('tech-author').innerText = tech.meta.author || 'Unknown';
    document.getElementById('tech-created').innerText = tech.meta.created || 'Unknown';
    document.getElementById('tech-git').innerHTML = tech.meta.git ? '<span style="color:#00ff00">Active</span>' : '<span style="color:#555">None</span>';

    // Populate Tags
    renderTags('tech-frontend', tech.categories.frontend, '#00f3ff');
    renderTags('tech-backend', tech.categories.backend, '#B026FF');
    renderTags('tech-database', tech.categories.database, '#f1e05a');
    renderTags('tech-devops', tech.categories.devops, '#ff6b6b');

    // Show Modal
    const modal = document.getElementById('tech-stack-modal');
    modal.style.display = 'block';
}

function renderTags(containerId, tags, color) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    if (!tags || tags.length === 0) {
        container.innerHTML = '<span style="color: #555; font-size: 0.8rem; font-style: italic;">None Detected</span>';
        return;
    }

    tags.forEach(tag => {
        const span = document.createElement('span');
        span.innerText = tag;
        span.style.cssText = `
            background: rgba(0,0,0,0.3);
            border: 1px solid ${color};
            color: white;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 0.8rem;
            box-shadow: 0 0 5px ${color}40;
        `;
        container.appendChild(span);
    });
}

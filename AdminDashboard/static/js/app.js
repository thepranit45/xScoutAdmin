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
function openModal(dataIndex) {
    const data = window.lastTelemetryData[dataIndex];
    // Use the shared function from forensics.js
    if (typeof openForensicModal === 'function') {
        openForensicModal(data);
    } else {
        console.error("Forensic library not loaded");
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
    const meta = tech.meta || {}; // Safe access
    document.getElementById('tech-author').innerText = meta.author || 'Unknown';
    document.getElementById('tech-created').innerText = meta.created || 'Unknown';
    document.getElementById('tech-git').innerHTML = meta.git ? '<span style="color:#00ff00">Active</span>' : '<span style="color:#555">None</span>';

    // Populate Tags
    const cats = tech.categories || {}; // Safe access
    renderTags('tech-frontend', cats.frontend, '#00f3ff');
    renderTags('tech-backend', cats.backend, '#B026FF');
    renderTags('tech-database', cats.database, '#f1e05a');
    renderTags('tech-devops', cats.devops, '#ff6b6b');

    // Show Modal
    const modal = document.getElementById('tech-stack-modal');
    if (modal) modal.style.display = 'block';
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
            background: rgba(0, 0, 0, 0.3);
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

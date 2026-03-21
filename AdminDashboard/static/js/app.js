// Polling Dashboard
const POLLING_INTERVAL = 3000;

function initDashboard() {
    console.log("Initializing xScout Dashboard (True Master Mode)...");
    fetchData();
    setInterval(fetchData, POLLING_INTERVAL);
}

async function fetchData() {
    try {
        const response = await fetch('/api/telemetry');
        const json = await response.json();

        if (json.status === 'success') {
            window.lastTelemetryData = json.data;
            updateTable(json.data);

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
    if (!tableBody) return;

    tableBody.innerHTML = '';
    dataList.forEach(data => renderRow(tableBody, data));
}

function renderRow(container, data) {
    try {
        const lastActiveTime = data.timestamp;
        const statusClass = (Date.now() - new Date(lastActiveTime).getTime() < 15000) ? 'online' : 'offline';
        const statusText = (statusClass === 'online') ? 'Live' : 'Last Seen';
        
        let userName = data.studentId || data.user || data.id || 'Unknown';
        const flowBadge = data.ai > 0.6 ? '<span style="background: rgba(255, 68, 68, 0.2); color: #ff6b6b; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; margin-left: 5px;">HIGH RISK</span>' : '';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 30px; height: 30px; background: #333; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: bold;">
                        ${String(userName).substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <strong>${userName}</strong>${flowBadge}<br>
                        <span style="font-size: 0.8rem; color: #888;">Student</span>
                    </div>
                </div>
            </td>
            <td>${data.stack || 'Web Content'}</td>
            <td style="font-family: monospace; color: ${data.ai > 60 ? '#ff6b6b' : '#00ff88'}">${(data.ai || 0).toFixed(1)}%</td>
            <td>
                ${data.behavior && data.behavior.wpm > 0 ? `<span style="color: #00f3ff;">WPM: ${data.behavior.wpm}</span>` : '<span style="color: #666;">Idle</span>'}
            </td>
            <td>${lastActiveTime ? new Date(lastActiveTime).toLocaleTimeString() : '--'}</td>
            <td><span class="status-dot ${statusClass}"></span> ${statusText}</td>
            <td><button onclick="openModal('${userName}')" style="background: var(--primary); border: none; color: white; padding: 5px 15px; border-radius: 20px; cursor: pointer; transition: 0.3s; font-weight: bold;">Analyze</button></td>
        `;

        container.appendChild(row);
    } catch (e) {
        console.error("Row Render Error:", e);
    }
}

let currentModalData = null;

function openModal(userId) {
    console.log(`[DEBUG] Analyzing student: ${userId}`);
    
    // Find correctly in our live data
    const data = window.lastTelemetryData.find(d => 
        (d.studentId === userId || d.user === userId || d.id === userId)
    );

    if (!data) {
        console.error(`[ERROR] Data not found for ${userId}. Data might have refreshed.`);
        return;
    }
    
    currentModalData = data;
    
    // Switch to Forensics page/tab
    if (typeof switchTab === 'function') {
        switchTab('forensics');
    } else {
        // Fallback: If switchTab is missing, we populate the modal anyway
        const modal = document.getElementById('forensic-modal');
        if (modal) modal.style.display = 'block';
    }

    // Populate common fields
    const nameEl = document.getElementById('modal-student-name');
    if (nameEl) nameEl.innerText = userId;

    // Trigger History Fetch
    if (typeof fetchHistory === 'function') {
        fetchHistory(userId);
    }
}

function switchTab(tabId) {
    document.querySelectorAll('.dashboard-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');

    const targetTab = document.querySelector(`[onclick="switchTab('${tabId}')"]`);
    if (targetTab) targetTab.classList.add('active');

    const targetContent = document.getElementById(tabId);
    if (targetContent) targetContent.style.display = 'block';
}

initDashboard();

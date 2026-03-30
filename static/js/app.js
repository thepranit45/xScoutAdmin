// -- MASTER DASHBOARD CONTROLLER (v1036) --
console.log("🚀 xScout Master Dashboard: BOOTING... 🚀");

const POLLING_INTERVAL = 3000;
let lastTelemetryData = [];

function initDashboard() {
    console.log("🛸 xScout Master Dashboard: I AM ALIVE! (True Master Mode)");
    fetchData();
    setInterval(fetchData, POLLING_INTERVAL);
}

async function fetchData() {
    try {
        const response = await fetch('/api/telemetry/');
        const json = await response.json();

        if (json.status === 'success') {
            lastTelemetryData = json.data;
            
            // Update Stats
            const monitoredEl = document.getElementById('total-monitored');
            const activeThreadsEl = document.getElementById('active-threads');
            const threatsEl = document.getElementById('active-threats-count');
            
            if (monitoredEl) monitoredEl.innerText = json.data.length;

            const liveStudents = json.data.filter(d => (Date.now() - new Date(d.timestamp).getTime() < 30000));
            if (activeThreadsEl) activeThreadsEl.innerText = liveStudents.length;

            const highRiskCount = json.data.filter(d => (d.ai > 0.6)).length;
            if (threatsEl) threatsEl.innerText = highRiskCount;
            
            // Update Table
            updateTable(json.data);
        }
    } catch (error) {
        console.error("[POLLING] Network Error:", error);
    }
}

function updateTable(dataList) {
    const tableBody = document.getElementById('student-table');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    
    if (dataList.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:50px;">Waiting for telemetry signal... No active sessions found.</td></tr>';
        return;
    }

    dataList.forEach(data => {
        try {
            const row = document.createElement('tr');
            
            const userId = data.studentId || data.id || data.user || 'Unknown';
            const studentName = data.studentName || userId;
            
            let risk = data.ai || 0;
            if (risk < 1 && risk > 0) risk = risk * 100;
            
            const riskColor = risk > 60 ? 'var(--error)' : (risk > 30 ? '#ffaa00' : 'var(--success)');

            const activity = data.stack || (data.forensic && data.forensic.activeApp) || 'Web Browser';
            
            const lastSeen = data.timestamp ? new Date(data.timestamp).getTime() : 0;
            const isLive = (Date.now() - lastSeen < 20000);
            const statusClass = isLive ? 'status-online' : 'status-offline';
            const statusText = isLive ? 'Live' : 'Recent';

            const flowBadge = risk > 60 ? '<span style="background: rgba(223, 27, 65, 0.1); color: var(--error); padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; margin-left: 5px; font-weight:800;">HIGH RISK</span>' : '';

            row.innerHTML = `
                <td>
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div style="width:36px; height:36px; background:var(--sidebar-bg); border-radius:50%; display:flex; align-items:center; justify-content:center; border:1px solid var(--border); font-weight:800; font-size:0.8rem; color:var(--primary);">
                            ${String(userId).substring(0,2).toUpperCase()}
                        </div>
                        <div>
                            <strong style="color:var(--text-main);">${studentName}</strong>${flowBadge}<br>
                            <span style="font-size:0.75rem; color:var(--text-light);">ID: ${userId}</span>
                        </div>
                    </div>
                </td>
                <td>${activity}</td>
                <td><span style="color:${riskColor}; font-family:monospace; font-weight:800;">${risk.toFixed(0)}%</span></td>
                <td>${data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : '--:--'}</td>
                <td><span class="status-dot ${statusClass}"></span> ${statusText}</td>
                <td><button onclick="openModalWrapper('${userId}')" class="analyze-btn">Analyze</button></td>
            `;
            tableBody.appendChild(row);
        } catch (err) {
            console.error("[RENDER] Error:", err);
        }
    });
}

function openModalWrapper(userId) {
    const data = lastTelemetryData.find(d => (d.studentId || d.id || d.user) === userId);
    if (data && typeof openForensicModal === 'function') {
        openForensicModal(data);
    }
}

// Global accessor
window.lastTelemetryData = lastTelemetryData;

document.addEventListener('DOMContentLoaded', initDashboard);

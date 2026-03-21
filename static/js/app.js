
// -- MASTER DASHBOARD CONTROLLER (v1000) --
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
        console.log("[POLLING] Fetching latest telemetry...");
        const response = await fetch('/api/telemetry/');
        const json = await response.json();

        if (json.status === 'success') {
            lastTelemetryData = json.data;
            console.log(`[POLLING] Received ${json.data.length} students.`, json.data);
            
            // Update Stats (Hub Header)
            const monitoredEl = document.getElementById('total-monitored');
            const activeThreadsEl = document.getElementById('active-threads');
            const threatsEl = document.querySelector('.stat-value.error'); // Unique selector
            
            if (monitoredEl) monitoredEl.innerText = json.data.length;

            const liveStudents = json.data.filter(d => (Date.now() - new Date(d.timestamp).getTime() < 60000));
            if (activeThreadsEl) activeThreadsEl.innerText = liveStudents.length;

            const highRiskCount = json.data.filter(d => (d.ai > 0.6)).length;
            if (threatsEl) {
                threatsEl.innerText = highRiskCount;
                threatsEl.style.color = highRiskCount > 0 ? '#ff4d4d' : '#888';
            }
            
            // Update Table
            updateTable(json.data);
        } else {
            console.error("[POLLING] Server returned failure:", json.message);
        }
    } catch (error) {
        console.error("[POLLING] Network Error:", error);
    }
}

function updateTable(dataList) {
    const tableBody = document.getElementById('student-table');
    if (!tableBody) {
        console.error("[RENDER] Element 'student-table' not found in DOM!");
        return;
    }

    tableBody.innerHTML = '';
    
    if (dataList.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:50px; color:#666;">Waiting for telemetry signal... No active sessions found.</td></tr>';
        return;
    }

    dataList.forEach(data => {
        try {
            const row = document.createElement('tr');
            
            // Normalize ID
            const userId = data.studentId || data.id || data.user || 'Unknown';
            const studentName = data.studentName || userId;
            
            // AI Risk Formatting
            let risk = data.ai || 0;
            if (risk < 1 && risk > 0) risk = risk * 100; // Handle 0.0-1.0 if it slips through
            
            const riskColor = risk > 60 ? '#ff4d4d' : (risk > 30 ? '#ffaa00' : '#00ff88');

            // Activity Text
            const activity = data.stack || (data.forensic && data.forensic.activeApp) || 'Web Browser';
            
            // Status Logic
            const lastSeen = data.timestamp ? new Date(data.timestamp).getTime() : 0;
            const isLive = (Date.now() - lastSeen < 20000); // 20-second active window
            const statusClass = isLive ? 'online' : 'offline';
            const statusText = isLive ? 'Live' : 'Recent';

            row.innerHTML = `
                <td>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="width:34px; height:34px; background:#333; border-radius:50%; display:flex; align-items:center; justify-content:center; border:1px solid rgba(255,255,255,0.1);">
                            ${String(userId).substring(0,2).toUpperCase()}
                        </div>
                        <div>
                            <strong>${studentName}</strong><br>
                            <span style="font-size:0.75rem; color:#666;">ID: ${userId}</span>
                        </div>
                    </div>
                </td>
                <td style="color:#aaa;">${activity}</td>
                <td><span style="color:${riskColor}; font-family:monospace; font-weight:bold;">${risk.toFixed(0)}%</span></td>
                <td>${data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : '--:--'}</td>
                <td><span class="status-dot ${statusClass}" style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${isLive ? '#00ff88' : '#666'}; margin-right:5px;"></span> ${statusText}</td>
                <td><button onclick="openForensicModal(lastTelemetryData.find(d => (d.studentId || d.id || d.user) === '${userId}'))" 
                        class="analyze-btn" style="background:#B026FF; color:white; border:none; padding:6px 16px; border-radius:20px; cursor:pointer; font-weight:600; transition:0.3s;"
                        onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 0 10px rgba(176,38,255,0.4)'"
                        onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'">
                    Analyze
                </button></td>
            `;
            tableBody.appendChild(row);
        } catch (err) {
            console.error("[RENDER] Error rendering row for student:", data, err);
        }
    });
}

// Global accessor for modals
window.lastTelemetryData = lastTelemetryData;

// Boot synchronization
document.addEventListener('DOMContentLoaded', initDashboard);

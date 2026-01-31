// Neural Network Animation
class NeuralNetwork {
    constructor() {
        this.canvas = document.getElementById('neuralNetwork');
        this.ctx = this.canvas.getContext('2d');
        this.nodes = [];
        this.nodeCount = 80;
        this.maxDistance = 150;
        this.mouse = { x: null, y: null, radius: 150 };

        this.resize();
        this.init();
        this.animate();

        window.addEventListener('resize', () => this.resize());
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.x;
            this.mouse.y = e.y;
        });
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    init() {
        this.nodes = [];
        for (let i = 0; i < this.nodeCount; i++) {
            this.nodes.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                radius: Math.random() * 2 + 1
            });
        }
    }

    drawNode(node) {
        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = '#00f5ff';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#00f5ff';
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
    }

    drawLine(node1, node2, opacity) {
        this.ctx.beginPath();
        this.ctx.moveTo(node1.x, node1.y);
        this.ctx.lineTo(node2.x, node2.y);
        this.ctx.strokeStyle = `rgba(0, 245, 255, ${opacity})`;
        this.ctx.lineWidth = 0.5;
        this.ctx.shadowBlur = 5;
        this.ctx.shadowColor = '#00f5ff';
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;
    }

    update() {
        this.nodes.forEach(node => {
            // Move nodes
            node.x += node.vx;
            node.y += node.vy;

            // Bounce off edges
            if (node.x < 0 || node.x > this.canvas.width) node.vx *= -1;
            if (node.y < 0 || node.y > this.canvas.height) node.vy *= -1;

            // Mouse interaction
            if (this.mouse.x && this.mouse.y) {
                const dx = this.mouse.x - node.x;
                const dy = this.mouse.y - node.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < this.mouse.radius) {
                    const force = (this.mouse.radius - distance) / this.mouse.radius;
                    node.vx += (dx / distance) * force * 0.02;
                    node.vy += (dy / distance) * force * 0.02;
                }
            }

            // Limit velocity
            const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
            if (speed > 2) {
                node.vx = (node.vx / speed) * 2;
                node.vy = (node.vy / speed) * 2;
            }
        });
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw connections
        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = i + 1; j < this.nodes.length; j++) {
                const dx = this.nodes[i].x - this.nodes[j].x;
                const dy = this.nodes[i].y - this.nodes[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < this.maxDistance) {
                    const opacity = (1 - distance / this.maxDistance) * 0.5;
                    this.drawLine(this.nodes[i], this.nodes[j], opacity);
                }
            }
        }

        // Draw nodes
        this.nodes.forEach(node => this.drawNode(node));
    }

    animate() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

// Initialize neural network when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new NeuralNetwork();
});

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
        }
    } catch (error) {
        console.error("Error fetching telemetry:", error);
    }
}

function updateTable(dataList) {
    const tableBody = document.getElementById('student-table');
    tableBody.innerHTML = ''; // Clear current
    let total = 0;

    dataList.forEach(data => {
        total++;
        renderRow(tableBody, data);
    });

    const totalEl = document.getElementById('total-monitored');
    if (totalEl) totalEl.innerText = total;
}

function renderRow(container, data) {
    const row = document.createElement('tr');

    // Parse timestamp (ISO String from Extension)
    const lastActiveTime = data.timestamp ? new Date(data.timestamp).getTime() : 0;
    const isOnline = (Date.now() - lastActiveTime) < 10000;
    const statusClass = isOnline ? 'status-online' : 'status-offline';
    const statusText = isOnline ? 'Online' : 'Offline';

    // Use ID as user name if user not specified
    const userName = data.user || data.id || 'Unknown';

    row.innerHTML = `
        <td>
            <div style="display: flex; align-items: center;">
                <div style="width: 30px; height: 30px; background: #333; border-radius: 4px; display: flex; align-items: center; justify-content: center; margin-right: 10px;">${userName.charAt(0).toUpperCase()}</div>
                <div>
                    <strong>${userName}</strong><br>
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

    const riskScore = (data.ai * 100).toFixed(0) + '%';
    const riskEl = document.getElementById('modal-risk-score');
    riskEl.innerText = riskScore;
    riskEl.style.color = data.ai > 0.5 ? '#ff3b3b' : '#00ff88';

    // Populate Table
    const tbody = document.getElementById('forensic-history-body');
    tbody.innerHTML = '';

    const history = data.forensic.appHistory || [];

    if (history.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#555;">No recent app history available.</td></tr>';
    } else {
        history.forEach((item, index) => {
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
                console.log('Found URL:', url);
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
                    console.log('Found domain:', domain);
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

            console.log('Visit button HTML:', visitLinkButton);

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
    }

    modal.style.display = 'block';
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
    const modal = document.getElementById('forensic-modal');
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

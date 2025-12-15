// StatusSync Dashboard - Frontend Logic
let currentGuildId = null;

// Load available guilds on page load
async function loadGuilds() {
    try {
        const response = await fetch('/dashboard/api/guilds');
        const guilds = await response.json();
        
        const select = document.getElementById('guild-select');
        select.innerHTML = '<option value="">Select a server...</option>';
        
        guilds.forEach(guild => {
            const option = document.createElement('option');
            option.value = guild.id;
            option.textContent = `${guild.name} (${guild.memberCount} members)`;
            select.appendChild(option);
        });
        
        // Auto-select last used guild
        const lastGuildId = localStorage.getItem('lastGuildId');
        if (lastGuildId) {
            select.value = lastGuildId;
            selectGuild();
        }
    } catch (err) {
        console.error('Failed to load guilds:', err);
        document.getElementById('guild-select').innerHTML = '<option value="">Failed to load servers</option>';
    }
}

// Select guild from dropdown
function selectGuild() {
    const guildId = document.getElementById('guild-select').value;
    if (guildId) {
        document.getElementById('guild-id').value = guildId;
        loadDashboard();
    }
}

// Tab Management
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active from all nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(`tab-${tabName}`).classList.add('active');
    
    // Add active to clicked button
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
}

// Load Dashboard
async function loadDashboard() {
    const guildId = document.getElementById('guild-id').value.trim();
    
    if (!guildId) {
        showError('Please select or enter a Server ID');
        return;
    }
    
    currentGuildId = guildId;
    localStorage.setItem('lastGuildId', guildId);
    
    showLoading();
    hideError();
    
    try {
        await Promise.all([
            fetchStats(),
            fetchSettings(),
            fetchCases(),
            fetchModLogs(),
            fetchLeaderboards(),
            fetchCommands()
        ]);
        hideLoading();
    } catch (err) {
        hideLoading();
        showError(err.message);
    }
}

// API Helpers
async function apiRequest(endpoint) {
    const url = `/dashboard/api/${endpoint}${endpoint.includes('?') ? '&' : '?'}guild_id=${currentGuildId}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${endpoint}`);
    }
    return await response.json();
}

// Statistics
async function fetchStats() {
    try {
        const stats = await apiRequest('stats');
        
        document.getElementById('stat-users').textContent = stats.userCount || 0;
        document.getElementById('stat-cases').textContent = stats.caseCount || 0;
        document.getElementById('stat-commands').textContent = stats.commandCount || 0;
        
        // Top users by rep
        if (stats.topRep && stats.topRep.length) {
            document.getElementById('top-rep').innerHTML = stats.topRep.map((user, i) => 
                `<div class="list-item">
                    <span class="rank">#${i + 1}</span>
                    <span class="user-id">User: ${user.user_id}</span>
                    <span class="value">${user.rep} rep</span>
                </div>`
            ).join('');
        } else {
            document.getElementById('top-rep').innerHTML = '<p class="empty">No data available</p>';
        }
        
        // Top users by XP
        if (stats.topXP && stats.topXP.length) {
            document.getElementById('top-xp').innerHTML = stats.topXP.map((user, i) => 
                `<div class="list-item">
                    <span class="rank">#${i + 1}</span>
                    <span class="user-id">User: ${user.user_id}</span>
                    <span class="value">${user.xp} XP</span>
                </div>`
            ).join('');
        } else {
            document.getElementById('top-xp').innerHTML = '<p class="empty">No data available</p>';
        }
        
        // Cases by type chart
        if (stats.casesByType && stats.casesByType.length) {
            const chartHtml = stats.casesByType.map(item => {
                const percentage = (item.count / stats.caseCount * 100).toFixed(1);
                return `
                    <div class="chart-bar">
                        <div class="chart-label">${item.action}</div>
                        <div class="chart-progress">
                            <div class="chart-fill" style="width: ${percentage}%"></div>
                        </div>
                        <div class="chart-value">${item.count} (${percentage}%)</div>
                    </div>
                `;
            }).join('');
            document.getElementById('cases-chart').innerHTML = chartHtml;
        } else {
            document.getElementById('cases-chart').innerHTML = '<p class="empty">No moderation data available</p>';
        }
    } catch (err) {
        console.error('Error fetching stats:', err);
    }
}

// Settings
async function fetchSettings() {
    try {
        const settings = await apiRequest('settings');
        
        document.getElementById('setting-welcome').textContent = 
            settings.welcome?.channel_id ? `Channel ID: ${settings.welcome.channel_id}` : 'Not configured';
        
        document.getElementById('setting-modlog').textContent = 
            settings.modlog?.channel_id ? `Channel ID: ${settings.modlog.channel_id}` : 'Not configured';
        
        document.getElementById('setting-logging').textContent = 
            settings.logging?.channel_id ? `Channel ID: ${settings.logging.channel_id}` : 'Not configured';
        
        if (settings.starboard) {
            document.getElementById('setting-starboard').innerHTML = `
                <p>Channel: ${settings.starboard.channel_id || 'Not set'}</p>
                <p>Emoji: ${settings.starboard.emoji || '⭐'}</p>
                <p>Threshold: ${settings.starboard.threshold || 3} reactions</p>
            `;
        } else {
            document.getElementById('setting-starboard').textContent = 'Not configured';
        }
    } catch (err) {
        console.error('Error fetching settings:', err);
    }
}

// Mod Cases
async function fetchCases() {
    try {
        const cases = await apiRequest('cases?limit=50');
        
        if (cases.length === 0) {
            document.getElementById('cases-tbody').innerHTML = 
                '<tr><td colspan="7" class="empty">No cases found</td></tr>';
            return;
        }
        
        document.getElementById('cases-tbody').innerHTML = cases.map(c => `
            <tr>
                <td><strong>#${c.case_id}</strong></td>
                <td>${c.user_id}</td>
                <td><span class="badge badge-${c.action}">${c.action}</span></td>
                <td>${c.reason || 'No reason provided'}</td>
                <td>${c.moderator_id}</td>
                <td>${new Date(c.created_at).toLocaleString()}</td>
                <td><span class="status-${c.status}">${c.status}</span></td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Error fetching cases:', err);
    }
}

// Mod Logs
async function fetchModLogs() {
    try {
        const logs = await apiRequest('modlogs?limit=50');
        
        if (logs.length === 0) {
            document.getElementById('logs-tbody').innerHTML = 
                '<tr><td colspan="7" class="empty">No logs found</td></tr>';
            return;
        }
        
        document.getElementById('logs-tbody').innerHTML = logs.map(log => `
            <tr>
                <td>${log.log_id}</td>
                <td>${log.case_id || 'N/A'}</td>
                <td>${log.user_id}</td>
                <td>${log.moderator_id}</td>
                <td><span class="badge badge-${log.action}">${log.action}</span></td>
                <td>${log.reason || 'No reason provided'}</td>
                <td>${new Date(log.created_at).toLocaleString()}</td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Error fetching logs:', err);
    }
}

// User History
async function fetchUserHistory() {
    const userId = document.getElementById('user-id-input').value.trim();
    
    if (!userId) {
        alert('Please enter a User ID');
        return;
    }
    
    try {
        const response = await fetch(`/dashboard/api/userhistory?user_id=${userId}&guild_id=${currentGuildId}`);
        const cases = await response.json();
        
        if (cases.length === 0) {
            document.getElementById('userhistory-list').innerHTML = 
                '<p class="empty">No cases found for this user</p>';
            return;
        }
        
        document.getElementById('userhistory-list').innerHTML = cases.map(c => `
            <div class="list-item">
                <div>
                    <strong>Case #${c.case_id}</strong> - 
                    <span class="badge badge-${c.action}">${c.action}</span>
                </div>
                <div class="meta">
                    ${c.reason || 'No reason provided'} - 
                    ${new Date(c.created_at).toLocaleString()}
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Error fetching user history:', err);
        alert('Error fetching user history');
    }
}

// Leaderboards
async function fetchLeaderboards() {
    try {
        // Rep Leaderboard
        const repResponse = await fetch('/dashboard/api/leaderboard/rep?limit=10');
        const repData = await repResponse.json();
        
        if (repData.length) {
            document.getElementById('rep-leaderboard').innerHTML = repData.map((user, i) => `
                <div class="leaderboard-item">
                    <span class="rank">#${i + 1}</span>
                    <span class="user-id">${user.user_id}</span>
                    <span class="value">${user.rep} rep</span>
                </div>
            `).join('');
        } else {
            document.getElementById('rep-leaderboard').innerHTML = '<p class="empty">No data</p>';
        }
        
        // XP Leaderboard
        const xpResponse = await fetch('/dashboard/api/leaderboard/xp?limit=10');
        const xpData = await xpResponse.json();
        
        if (xpData.length) {
            document.getElementById('xp-leaderboard').innerHTML = xpData.map((user, i) => `
                <div class="leaderboard-item">
                    <span class="rank">#${i + 1}</span>
                    <span class="user-id">${user.user_id}</span>
                    <span class="value">${user.xp} XP</span>
                </div>
            `).join('');
        } else {
            document.getElementById('xp-leaderboard').innerHTML = '<p class="empty">No data</p>';
        }
        
        // Weekly Leaderboard
        const weeklyResponse = await fetch('/dashboard/api/leaderboard/weekly?limit=10');
        const weeklyData = await weeklyResponse.json();
        
        if (weeklyData.length) {
            document.getElementById('weekly-leaderboard').innerHTML = weeklyData.map((user, i) => `
                <div class="leaderboard-item">
                    <span class="rank">#${i + 1}</span>
                    <span class="user-id">${user.user_id}</span>
                    <span class="value">${user.xp} XP</span>
                </div>
            `).join('');
        } else {
            document.getElementById('weekly-leaderboard').innerHTML = '<p class="empty">No data</p>';
        }
    } catch (err) {
        console.error('Error fetching leaderboards:', err);
    }
}

// Commands
async function fetchCommands() {
    try {
        const response = await fetch('/dashboard/api/commands');
        const commands = await response.json();
        
        if (commands.length === 0) {
            document.getElementById('commands-list').innerHTML = 
                '<p class="empty">No custom commands configured</p>';
            return;
        }
        
        document.getElementById('commands-list').innerHTML = commands.map(cmd => `
            <div class="list-item">
                <strong>!${cmd.name}</strong>
                <div class="meta">${cmd.response}</div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Error fetching commands:', err);
    }
}

// UI Helpers
function showLoading() {
    document.getElementById('loading').style.display = 'block';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

function showError(message) {
    document.getElementById('error').style.display = 'block';
    document.getElementById('error-message').textContent = message;
}

function hideError() {
    document.getElementById('error').style.display = 'none';
}

// Initialize
window.onload = () => {
    // Load available servers
    loadGuilds();
    hideLoading();
};

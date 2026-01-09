// StatusSync Dashboard - Frontend Logic
let currentGuildId = null;
let currentUser = null;

// Check authentication status
async function checkAuth() {
    try {
        const response = await fetch('/dashboard/auth/user');
        const data = await response.json();
        
        if (data.authenticated) {
            currentUser = data.user;
            document.getElementById('login-container').style.display = 'none';
            document.getElementById('guild-selector').style.display = 'block';
            loadGuilds(data.guilds);
            return true;
        } else {
            document.getElementById('login-container').style.display = 'block';
            document.getElementById('guild-selector').style.display = 'none';
            hideLoading();
            return false;
        }
    } catch (err) {
        console.error('Auth check failed:', err);
        return false;
    }
}

// Login with Discord
function login() {
    window.location.href = '/dashboard/auth/login';
}

// Logout
function logout() {
    window.location.href = '/dashboard/auth/logout';
}

// Load available guilds
async function loadGuilds(userGuilds) {
    try {
        const select = document.getElementById('guild-select');
        select.innerHTML = '<option value="">Select a server...</option>';
        
        if (userGuilds && userGuilds.length > 0) {
            userGuilds.forEach(guild => {
                const option = document.createElement('option');
                option.value = guild.id;
                option.textContent = `${guild.name} (${guild.memberCount || 'N/A'} members)`;
                select.appendChild(option);
            });
        } else {
            // Fetch from API if not provided
            const response = await fetch('/dashboard/api/guilds');
            const guilds = await response.json();
            
            guilds.forEach(guild => {
                const option = document.createElement('option');
                option.value = guild.id;
                option.textContent = `${guild.name} (${guild.memberCount} members)`;
                select.appendChild(option);
            });
        }
        
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
        loadDashboard(guildId);
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
    
    // Load tab-specific data
    if (tabName === 'premium') {
        loadPremium();
    }
}

// Load Dashboard
async function loadDashboard(guildId) {
    if (!guildId) {
        guildId = document.getElementById('guild-select').value.trim();
    }
    
    if (!guildId) {
        showError('Please select a server');
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
    const response = await fetch(url, { credentials: 'include' });
    if (response.status === 401) {
        showError('Session expired. Please login again.');
        setTimeout(() => window.location.reload(), 2000);
        throw new Error('Unauthorized');
    }
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
        const guildId = document.getElementById('guild-select').value;
        if (!guildId) return;
        
        // Load channels for dropdowns
        await loadChannels();
        
        const settings = await apiRequest('settings');
        
        // Set selected channels
        if (settings.welcome?.channel_id) {
            document.getElementById('welcome-channel').value = settings.welcome.channel_id;
        }
        if (settings.modlog?.channel_id) {
            document.getElementById('modlog-channel').value = settings.modlog.channel_id;
        }
        if (settings.logging?.channel_id) {
            document.getElementById('logging-channel').value = settings.logging.channel_id;
        }
        if (settings.starboard?.channel_id) {
            document.getElementById('starboard-channel').value = settings.starboard.channel_id;
            document.getElementById('starboard-emoji').value = settings.starboard.emoji || '⭐';
            document.getElementById('starboard-threshold').value = settings.starboard.threshold || 3;
        }
    } catch (err) {
        console.error('Error fetching settings:', err);
    }
}

async function loadChannels() {
    try {
        const guildId = document.getElementById('guild-select').value;
        const channels = await apiRequest(`channels`);
        
        const selects = ['welcome-channel', 'modlog-channel', 'logging-channel', 'starboard-channel'];
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            const currentValue = select.value;
            select.innerHTML = '<option value="">Not configured</option>';
            
            channels.forEach(channel => {
                if (channel.type === 0) { // Text channels only
                    const option = document.createElement('option');
                    option.value = channel.id;
                    option.textContent = `# ${channel.name}`;
                    select.appendChild(option);
                }
            });
            
            if (currentValue) select.value = currentValue;
        });
    } catch (err) {
        console.error('Error loading channels:', err);
    }
}

async function saveChannelSetting(type) {
    try {
        const guildId = document.getElementById('guild-select').value;
        if (!guildId) {
            alert('Please select a server first');
            return;
        }
        
        const channelId = document.getElementById(`${type}-channel`).value;
        
        const response = await fetch(`/dashboard/api/settings/${type}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ guild_id: guildId, channel_id: channelId })
        });
        
        if (!response.ok) throw new Error('Failed to save setting');
        
        alert(`✅ ${type.charAt(0).toUpperCase() + type.slice(1)} channel ${channelId ? 'updated' : 'cleared'}!`);
    } catch (err) {
        console.error('Error saving setting:', err);
        alert('❌ Failed to save setting: ' + err.message);
    }
}

async function saveStarboardSettings() {
    try {
        const guildId = document.getElementById('guild-select').value;
        if (!guildId) {
            alert('Please select a server first');
            return;
        }
        
        const channelId = document.getElementById('starboard-channel').value;
        const emoji = document.getElementById('starboard-emoji').value;
        const threshold = parseInt(document.getElementById('starboard-threshold').value);
        
        const response = await fetch('/dashboard/api/settings/starboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ guild_id: guildId, channel_id: channelId, emoji, threshold })
        });
        
        if (!response.ok) throw new Error('Failed to save starboard settings');
        
        alert('✅ Starboard settings saved!');
    } catch (err) {
        console.error('Error saving starboard:', err);
        alert('❌ Failed to save settings: ' + err.message);
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

// Premium Functions
async function loadPremium() {
    try {
        const guildId = document.getElementById('guild-select').value;
        if (!guildId) {
            document.getElementById('premium-tier').innerHTML = `
                <div style="background: #2c2f33; padding: 1rem; border-radius: 8px;">
                    <p style="margin: 0; color: #faa61a;">⚠️ Please select a server first</p>
                </div>
            `;
            return;
        }
        
        // Load current status (use direct fetch, not apiRequest)
        const statusResponse = await fetch(`/dashboard/premium/status?guild_id=${guildId}`, { credentials: 'include' });
        if (!statusResponse.ok) throw new Error(`Failed to fetch premium status`);
        const status = await statusResponse.json();
        const statusDiv = document.getElementById('premium-tier');
        
        if (status.premium) {
            statusDiv.innerHTML = `
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 1rem; border-radius: 8px; color: white;">
                    <h3 style="margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                        <span>✅</span> ${status.tier.charAt(0).toUpperCase() + status.tier.slice(1)} Premium Active
                    </h3>
                    ${status.expires_at ? `<p style="margin: 0.5rem 0 0 0; opacity: 0.9;">Renews: ${new Date(status.expires_at).toLocaleDateString()}</p>` : ''}
                </div>
            `;
        } else {
            statusDiv.innerHTML = `
                <div style="background: #2c2f33; padding: 1rem; border-radius: 8px;">
                    <p style="margin: 0;">No active premium subscription. Upgrade below to unlock premium features!</p>
                </div>
            `;
        }
        
        // Show/hide premium controls
        const controlsDiv = document.getElementById('premium-controls');
        const tiersDiv = document.getElementById('premium-tiers');
        
        if (status.premium) {
            controlsDiv.style.display = 'block';
            tiersDiv.style.display = 'none';
            
            // Load current premium features (use direct fetch)
            const featuresResponse = await fetch(`/dashboard/premium/features?guild_id=${guildId}`, { credentials: 'include' });
            if (!featuresResponse.ok) throw new Error('Failed to fetch features');
            const features = await featuresResponse.json();
            document.getElementById('custom-status').value = features.custom_status || '';
            document.getElementById('xp-multiplier').value = features.xp_multiplier || 1.0;
            document.getElementById('embed-color').value = features.embed_color || '#5865F2';
            document.getElementById('auto-mod-enabled').checked = features.auto_mod_enabled || false;
            document.getElementById('custom-welcome-enabled').checked = features.custom_welcome_enabled || false;
            
            // Load auto-mod rules
            loadAutoModRules();
            
            // Load anti-nuke and joingate settings
            loadAntiNuke();
            loadJoinGate();
            
            // Load backups
            loadBackups();
        } else {
            controlsDiv.style.display = 'none';
            tiersDiv.style.display = 'grid';
            
            // Load available tiers (use direct fetch)
            const tiersResponse = await fetch('/dashboard/premium/tiers', { credentials: 'include' });
            if (!tiersResponse.ok) throw new Error('Failed to fetch tiers');
            const tiers = await tiersResponse.json();
            
            tiersDiv.innerHTML = tiers.map(tier => `
                <div class="card" style="text-align: center;">
                    <h3>${tier.name}</h3>
                    <div style="font-size: 2rem; font-weight: bold; color: #667eea; margin: 1rem 0;">
                        $${tier.price.toFixed(2)}<span style="font-size: 1rem; color: #99aab5;">/month</span>
                    </div>
                    <ul style="text-align: left; list-style: none; padding: 0; margin: 1rem 0;">
                        ${tier.features.map(f => `<li style="padding: 0.5rem 0;">✅ ${f}</li>`).join('')}
                    </ul>
                    ${tier.stripeEnabled 
                        ? `<button onclick="upgradePremium('${tier.id}')" class="btn">Upgrade to ${tier.name}</button>`
                        : '<button disabled style="opacity: 0.5; cursor: not-allowed;">Coming Soon</button>'
                    }
                </div>
            `).join('');
        }
    } catch (err) {
        console.error('Error loading premium:', err);
        document.getElementById('premium-tier').innerHTML = `
            <div style="background: #ed4245; padding: 1rem; border-radius: 8px; color: white;">
                <p style="margin: 0;">❌ Error loading premium status: ${err.message}</p>
                <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem;">Make sure you have selected a server and are logged in.</p>
            </div>
        `;
    }
}

async function savePremiumSettings() {
    try {
        const guildId = document.getElementById('guild-select').value;
        if (!guildId) {
            alert('Please select a server first');
            return;
        }
        
        const settings = {
            guild_id: guildId,
            custom_status: document.getElementById('custom-status').value,
            xp_multiplier: parseFloat(document.getElementById('xp-multiplier').value),
            embed_color: document.getElementById('embed-color').value,
            auto_mod_enabled: document.getElementById('auto-mod-enabled').checked,
            custom_welcome_enabled: document.getElementById('custom-welcome-enabled').checked
        };
        
        const response = await fetch('/dashboard/premium/features', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(settings)
        });
        
        if (!response.ok) {
            throw new Error('Failed to save settings');
        }
        
        alert('✅ Premium settings saved successfully!');
    } catch (err) {
        console.error('Error saving premium settings:', err);
        alert('❌ Failed to save settings: ' + err.message);
    }
}

async function loadBackups() {
    try {
        const guildId = document.getElementById('guild-select').value;
        const backups = await fetch(`/dashboard/api/backup/list?guild_id=${guildId}`, { credentials: 'include' })
            .then(r => r.json());
        
        const backupList = document.getElementById('backup-list');
        
        if (backups.length === 0) {
            backupList.innerHTML = '<p style="color: #99aab5; margin-top: 1rem;">No backups yet</p>';
            return;
        }
        
        backupList.innerHTML = `
            <table style="width: 100%; margin-top: 1rem;">
                <thead>
                    <tr>
                        <th style="text-align: left;">Created</th>
                        <th style="text-align: left;">Server</th>
                        <th style="text-align: right;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${backups.map(b => `
                        <tr>
                            <td>${new Date(b.created_at).toLocaleString()}</td>
                            <td>${b.guild_name}</td>
                            <td style="text-align: right;">
                                <button onclick="restoreBackup(${b.id})" class="btn" style="font-size: 0.8rem; padding: 0.25rem 0.5rem; background: #667eea;">
                                    ↻ Restore
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        console.error('Error loading backups:', err);
    }
}

async function createBackup() {
    try {
        const guildId = document.getElementById('guild-select').value;
        if (!guildId) {
            alert('Please select a server first');
            return;
        }
        
        const response = await fetch('/dashboard/api/backup/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ guild_id: guildId })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('✅ Backup created successfully!');
            loadBackups();
        } else {
            alert('❌ Failed to create backup: ' + result.error);
        }
    } catch (err) {
        console.error('Error creating backup:', err);
        alert('❌ Failed to create backup: ' + err.message);
    }
}

async function restoreBackup(backupId) {
    if (!confirm('Are you sure you want to restore this backup? This will overwrite current settings.')) {
        return;
    }
    
    try {
        const guildId = document.getElementById('guild-select').value;
        
        const response = await fetch('/dashboard/api/backup/restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ guild_id: guildId, backup_id: backupId })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('✅ Backup restored successfully!');
            location.reload();
        } else {
            alert('❌ Failed to restore backup: ' + result.error);
        }
    } catch (err) {
        console.error('Error restoring backup:', err);
        alert('❌ Failed to restore backup: ' + err.message);
    }
}

async function loadAutoModRules() {
    try {
        const guildId = document.getElementById('guild-select').value;
        const rules = await fetch(`/dashboard/api/automod/rules?guild_id=${guildId}`, { credentials: 'include' })
            .then(r => r.json());
        
        // Create a map for easy access
        const rulesMap = {};
        rules.forEach(rule => {
            rulesMap[rule.rule_type] = rule;
        });
        
        // Load spam rule
        if (rulesMap['spam']) {
            document.getElementById('rule-spam-enabled').checked = rulesMap['spam'].enabled;
            document.getElementById('rule-spam-threshold').value = rulesMap['spam'].threshold || 5;
            document.getElementById('rule-spam-action').value = rulesMap['spam'].action || 'warn';
        }
        
        // Load bad words rule
        if (rulesMap['bad_words']) {
            document.getElementById('rule-badwords-enabled').checked = rulesMap['bad_words'].enabled;
            document.getElementById('rule-badwords-action').value = rulesMap['bad_words'].action || 'warn';
            const words = rulesMap['bad_words'].config?.words || [];
            document.getElementById('rule-badwords-config').value = words.join(', ');
        }
        
        // Load links rule
        if (rulesMap['links']) {
            document.getElementById('rule-links-enabled').checked = rulesMap['links'].enabled;
            document.getElementById('rule-links-action').value = rulesMap['links'].action || 'warn';
            document.getElementById('rule-links-discord').checked = rulesMap['links'].config?.discord || false;
            document.getElementById('rule-links-all').checked = rulesMap['links'].config?.all || false;
        }
        
        // Load caps rule
        if (rulesMap['caps']) {
            document.getElementById('rule-caps-enabled').checked = rulesMap['caps'].enabled;
            document.getElementById('rule-caps-threshold').value = rulesMap['caps'].threshold || 70;
            document.getElementById('rule-caps-action').value = rulesMap['caps'].action || 'warn';
        }
        
        // Load recent violations
        loadAutoModViolations();
    } catch (err) {
        console.error('Error loading auto-mod rules:', err);
    }
}

async function saveAutoModRules() {
    try {
        const guildId = document.getElementById('guild-select').value;
        if (!guildId) {
            alert('Please select a server first');
            return;
        }
        
        const rules = [
            {
                rule_type: 'spam',
                enabled: document.getElementById('rule-spam-enabled').checked,
                threshold: parseInt(document.getElementById('rule-spam-threshold').value),
                action: document.getElementById('rule-spam-action').value,
                config: {}
            },
            {
                rule_type: 'bad_words',
                enabled: document.getElementById('rule-badwords-enabled').checked,
                action: document.getElementById('rule-badwords-action').value,
                threshold: 0,
                config: {
                    words: document.getElementById('rule-badwords-config').value
                        .split(',')
                        .map(w => w.trim())
                        .filter(w => w.length > 0)
                }
            },
            {
                rule_type: 'links',
                enabled: document.getElementById('rule-links-enabled').checked,
                action: document.getElementById('rule-links-action').value,
                threshold: 0,
                config: {
                    discord: document.getElementById('rule-links-discord').checked,
                    all: document.getElementById('rule-links-all').checked
                }
            },
            {
                rule_type: 'caps',
                enabled: document.getElementById('rule-caps-enabled').checked,
                threshold: parseInt(document.getElementById('rule-caps-threshold').value),
                action: document.getElementById('rule-caps-action').value,
                config: {}
            }
        ];
        
        for (const rule of rules) {
            const response = await fetch('/dashboard/api/automod/rules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ guild_id: guildId, ...rule })
            });
            
            if (!response.ok) throw new Error(`Failed to save ${rule.rule_type} rule`);
        }
        
        alert('✅ Auto-mod rules saved successfully!');
        loadAutoModViolations();
    } catch (err) {
        console.error('Error saving auto-mod rules:', err);
        alert('❌ Failed to save rules: ' + err.message);
    }
}

async function loadAutoModViolations() {
    try {
        const guildId = document.getElementById('guild-select').value;
        const violations = await fetch(`/dashboard/api/automod/violations?guild_id=${guildId}&limit=10`, { credentials: 'include' })
            .then(r => r.json());
        
        const violationsDiv = document.getElementById('automod-violations');
        
        if (violations.length === 0) {
            violationsDiv.innerHTML = '<p style="color: #99aab5;">No violations recorded yet</p>';
            return;
        }
        
        violationsDiv.innerHTML = violations.map(v => `
            <div style="background: #2c2f33; padding: 0.75rem; border-radius: 4px; margin-bottom: 0.5rem; border-left: 3px solid #f04747;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.25rem;">
                    <strong style="color: #f04747;">${v.rule_type.toUpperCase()}</strong>
                    <span style="color: #99aab5; font-size: 0.85rem;">${new Date(v.timestamp).toLocaleString()}</span>
                </div>
                <div style="color: #99aab5; font-size: 0.9rem;">
                    <div>User: <code>${v.user_id}</code></div>
                    <div>Action: <span style="color: #faa61a;">${v.action_taken}</span></div>
                    ${v.content ? `<div style="margin-top: 0.25rem; font-style: italic; opacity: 0.8;">"${v.content.substring(0, 100)}${v.content.length > 100 ? '...' : ''}"</div>` : ''}
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Error loading violations:', err);
    }
}

async function upgradePremium(tier) {
    try {
        const guildId = document.getElementById('guild-select').value;
        if (!guildId) {
            alert('Please select a server first');
            return;
        }
        
        // Create Stripe checkout session
        const response = await fetch('/dashboard/premium/checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ guild_id: guildId, tier })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create checkout session');
        }
        
        const data = await response.json();
        
        // Redirect to Stripe checkout
        window.location.href = data.url;
    } catch (err) {
        console.error('Error upgrading premium:', err);
        alert('Failed to start checkout: ' + err.message);
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

// === ANTI-NUKE FUNCTIONS ===
async function loadAntiNuke() {
    try {
        const guildId = document.getElementById('guild-select').value;
        const data = await fetch(`/dashboard/api/antinuke?guild_id=${guildId}`, { credentials: 'include' })
            .then(r => r.json());
        
        document.getElementById('antinuke-enabled').checked = data.enabled || false;
        document.getElementById('antinuke-whitelist').value = (data.whitelist || []).join('\n');
    } catch (err) {
        console.error('Error loading anti-nuke settings:', err);
    }
}

async function saveAntiNuke() {
    try {
        const guildId = document.getElementById('guild-select').value;
        const enabled = document.getElementById('antinuke-enabled').checked;
        const whitelistText = document.getElementById('antinuke-whitelist').value;
        const whitelist = whitelistText.split('\n').map(id => id.trim()).filter(id => id.length > 0);
        
        const response = await fetch('/dashboard/api/antinuke', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ guild_id: guildId, enabled, whitelist })
        });
        
        if (!response.ok) throw new Error('Failed to save anti-nuke settings');
        
        alert('✅ Anti-nuke settings saved successfully!');
    } catch (err) {
        console.error('Error saving anti-nuke settings:', err);
        alert('❌ Failed to save settings: ' + err.message);
    }
}

// === JOIN GATE FUNCTIONS ===
async function loadJoinGate() {
    try {
        const guildId = document.getElementById('guild-select').value;
        const data = await fetch(`/dashboard/api/joingate?guild_id=${guildId}`, { credentials: 'include' })
            .then(r => r.json());
        
        document.getElementById('joingate-enabled').checked = data.enabled || false;
        document.getElementById('joingate-role').value = data.verified_role_id || '';
    } catch (err) {
        console.error('Error loading join gate settings:', err);
    }
}

async function saveJoinGate() {
    try {
        const guildId = document.getElementById('guild-select').value;
        const enabled = document.getElementById('joingate-enabled').checked;
        const verified_role_id = document.getElementById('joingate-role').value.trim();
        
        if (enabled && !verified_role_id) {
            alert('⚠️ Please specify a verified role ID');
            return;
        }
        
        const response = await fetch('/dashboard/api/joingate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ guild_id: guildId, enabled, verified_role_id })
        });
        
        if (!response.ok) throw new Error('Failed to save join gate settings');
        
        alert('✅ Join gate settings saved successfully!');
    } catch (err) {
        console.error('Error saving join gate settings:', err);
        alert('❌ Failed to save settings: ' + err.message);
    }
}

// Initialize
window.onload = async () => {
    showLoading();
    const authenticated = await checkAuth();
    if (!authenticated) {
        hideLoading();
    }
};

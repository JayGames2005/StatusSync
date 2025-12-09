// Frontend logic for dashboard
async function fetchModLogs() {
    const res = await fetch('/dashboard/api/modlogs?guild_id=YOUR_GUILD_ID');
    const logs = await res.json();
    document.getElementById('modlogs-list').innerHTML = logs.map(log => `<div>Case #${log.case_id}: ${log.action} - ${log.reason}</div>`).join('');
}
async function fetchCases() {
    const res = await fetch('/dashboard/api/cases?guild_id=YOUR_GUILD_ID');
    const cases = await res.json();
    document.getElementById('cases-list').innerHTML = cases.map(c => `<div>Case #${c.case_id}: ${c.action} - ${c.reason} [${c.status}]</div>`).join('');
}
async function fetchUserHistory() {
    const userId = document.getElementById('user-id-input').value;
    const res = await fetch(`/dashboard/api/userhistory?user_id=${userId}&guild_id=YOUR_GUILD_ID`);
    const cases = await res.json();
    document.getElementById('userhistory-list').innerHTML = cases.map(c => `<div>Case #${c.case_id}: ${c.action} - ${c.reason} [${c.status}]</div>`).join('');
}
async function fetchSettings() {
    const res = await fetch('/dashboard/api/settings?guild_id=YOUR_GUILD_ID');
    const settings = await res.json();
    document.getElementById('settings-info').innerHTML = `<div>Welcome Channel: ${settings.welcome?.channel_id || 'Not set'}<br>Mod Log Channel: ${settings.modlog?.channel_id || 'Not set'}</div>`;
}
async function fetchStats() {
    const res = await fetch('/dashboard/api/stats?guild_id=YOUR_GUILD_ID');
    const stats = await res.json();
    document.getElementById('stats-info').innerHTML = `<div>Users: ${stats.userCount}<br>Cases: ${stats.caseCount}</div>`;
}
async function fetchWidgets() {
    const res = await fetch('/dashboard/api/widgets');
    const widgets = await res.json();
    document.getElementById('widgets-list').innerHTML = widgets.widgets.map(w => `<div>${w}</div>`).join('');
}
window.onload = () => {
    fetchModLogs();
    fetchCases();
    fetchSettings();
    fetchStats();
    fetchWidgets();
};

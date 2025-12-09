// Dashboard backend API endpoints for mod logs, cases, user history, server settings, statistics, widgets
const express = require('express');
const router = express.Router();
const db = require('../db');

// Fetch mod logs
router.get('/modlogs', async (req, res) => {
    const { guild_id } = req.query;
    const logs = await db.query('SELECT * FROM mod_logs WHERE guild_id = $1 ORDER BY created_at DESC LIMIT 100', [guild_id]);
    res.json(logs.rows);
});

// Fetch cases
router.get('/cases', async (req, res) => {
    const { guild_id } = req.query;
    const cases = await db.query('SELECT * FROM mod_cases WHERE guild_id = $1 ORDER BY created_at DESC LIMIT 100', [guild_id]);
    res.json(cases.rows);
});

// Fetch user history
router.get('/userhistory', async (req, res) => {
    const { user_id, guild_id } = req.query;
    const cases = await db.query('SELECT * FROM mod_cases WHERE user_id = $1 AND guild_id = $2 ORDER BY created_at DESC', [user_id, guild_id]);
    res.json(cases.rows);
});

// Fetch server settings
router.get('/settings', async (req, res) => {
    const { guild_id } = req.query;
    const welcome = await db.query('SELECT * FROM welcome_channels WHERE guild_id = $1', [guild_id]);
    const modlog = await db.query('SELECT * FROM mod_log_channels WHERE guild_id = $1', [guild_id]);
    res.json({ welcome: welcome.rows[0], modlog: modlog.rows[0] });
});

// Fetch statistics
router.get('/stats', async (req, res) => {
    const { guild_id } = req.query;
    const userCount = await db.query('SELECT COUNT(*) FROM user_rep');
    const caseCount = await db.query('SELECT COUNT(*) FROM mod_cases WHERE guild_id = $1', [guild_id]);
    res.json({ userCount: userCount.rows[0].count, caseCount: caseCount.rows[0].count });
});

// Fetch widgets (placeholder)
router.get('/widgets', async (req, res) => {
    res.json({ widgets: [] });
});

module.exports = router;

// Enhanced Dashboard API endpoints
const express = require('express');
const router = express.Router();
const db = require('../db');

// Middleware to check guild_id
const requireGuildId = (req, res, next) => {
    const { guild_id } = req.query;
    if (!guild_id) {
        return res.status(400).json({ error: 'guild_id is required' });
    }
    next();
};

// === MODERATION ===
// Fetch mod logs
router.get('/modlogs', requireGuildId, async (req, res) => {
    try {
        const { guild_id, limit = 50 } = req.query;
        const logs = await db.query(
            'SELECT * FROM mod_logs WHERE guild_id = $1 ORDER BY created_at DESC LIMIT $2',
            [guild_id, Math.min(parseInt(limit), 100)]
        );
        res.json(logs.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Fetch mod cases
router.get('/cases', requireGuildId, async (req, res) => {
    try {
        const { guild_id, limit = 50 } = req.query;
        const cases = await db.query(
            'SELECT * FROM mod_cases WHERE guild_id = $1 ORDER BY created_at DESC LIMIT $2',
            [guild_id, Math.min(parseInt(limit), 100)]
        );
        res.json(cases.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Fetch user moderation history
router.get('/userhistory', async (req, res) => {
    try {
        const { user_id, guild_id } = req.query;
        if (!user_id || !guild_id) {
            return res.status(400).json({ error: 'user_id and guild_id are required' });
        }
        const cases = await db.query(
            'SELECT * FROM mod_cases WHERE user_id = $1 AND guild_id = $2 ORDER BY created_at DESC',
            [user_id, guild_id]
        );
        res.json(cases.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === SETTINGS ===
router.get('/settings', requireGuildId, async (req, res) => {
    try {
        const { guild_id } = req.query;
        const welcome = await db.query('SELECT * FROM welcome_channels WHERE guild_id = $1', [guild_id]);
        const modlog = await db.query('SELECT * FROM mod_log_channels WHERE guild_id = $1', [guild_id]);
        const logging = await db.query('SELECT * FROM logging_channels WHERE guild_id = $1', [guild_id]);
        const starboard = await db.query('SELECT * FROM starboard_settings WHERE guild_id = $1', [guild_id]);
        
        res.json({
            welcome: welcome.rows[0] || null,
            modlog: modlog.rows[0] || null,
            logging: logging.rows[0] || null,
            starboard: starboard.rows[0] || null
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === STATISTICS ===
router.get('/stats', requireGuildId, async (req, res) => {
    try {
        const { guild_id } = req.query;
        
        // Total users with rep
        const userCount = await db.query('SELECT COUNT(*) FROM user_rep');
        
        // Total mod cases
        const caseCount = await db.query('SELECT COUNT(*) FROM mod_cases WHERE guild_id = $1', [guild_id]);
        
        // Cases by type
        const casesByType = await db.query(
            `SELECT action, COUNT(*) as count FROM mod_cases WHERE guild_id = $1 GROUP BY action`,
            [guild_id]
        );
        
        // Top users by rep
        const topRep = await db.query('SELECT user_id, rep FROM user_rep ORDER BY rep DESC LIMIT 5');
        
        // Top users by XP
        const topXP = await db.query('SELECT user_id, xp FROM user_xp ORDER BY xp DESC LIMIT 5');
        
        // Custom commands count
        const commandCount = await db.query('SELECT COUNT(*) FROM custom_commands');
        
        res.json({
            userCount: parseInt(userCount.rows[0].count),
            caseCount: parseInt(caseCount.rows[0].count),
            casesByType: casesByType.rows,
            topRep: topRep.rows,
            topXP: topXP.rows,
            commandCount: parseInt(commandCount.rows[0].count)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === LEADERBOARDS ===
router.get('/leaderboard/rep', async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const rep = await db.query(
            'SELECT user_id, rep FROM user_rep ORDER BY rep DESC LIMIT $1',
            [Math.min(parseInt(limit), 50)]
        );
        res.json(rep.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/leaderboard/xp', async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const xp = await db.query(
            'SELECT user_id, xp FROM user_xp ORDER BY xp DESC LIMIT $1',
            [Math.min(parseInt(limit), 50)]
        );
        res.json(xp.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/leaderboard/weekly', async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const weekly = await db.query(
            'SELECT user_id, xp, week_start FROM user_xp_weekly ORDER BY xp DESC LIMIT $1',
            [Math.min(parseInt(limit), 50)]
        );
        res.json(weekly.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === CUSTOM COMMANDS ===
router.get('/commands', async (req, res) => {
    try {
        const commands = await db.query('SELECT name, response FROM custom_commands ORDER BY name');
        res.json(commands.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === STARBOARD ===
router.get('/starboard', requireGuildId, async (req, res) => {
    try {
        const { guild_id, limit = 20 } = req.query;
        const posts = await db.query(
            'SELECT * FROM starboard_posts ORDER BY stars DESC LIMIT $1',
            [Math.min(parseInt(limit), 50)]
        );
        res.json(posts.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === ACTIVITY ===
router.get('/activity', requireGuildId, async (req, res) => {
    try {
        const { guild_id } = req.query;
        
        // Recent mod actions (last 24 hours)
        const recentActions = await db.query(
            `SELECT action, COUNT(*) as count FROM mod_cases 
             WHERE guild_id = $1 AND created_at > NOW() - INTERVAL '24 hours' 
             GROUP BY action`,
            [guild_id]
        );
        
        res.json({
            recentActions: recentActions.rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

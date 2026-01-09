// Enhanced Dashboard API endpoints
const express = require('express');
const router = express.Router();
const db = require('../db');

// Get bot's client instance (set by main bot)
let client = null;
let requireAuth = null;

router.setClient = (discordClient) => {
    client = discordClient;
};

router.setAuth = (authMiddleware) => {
    requireAuth = authMiddleware;
};

// Get list of guilds bot is in (with auth)
router.get('/guilds', (req, res, next) => {
    if (requireAuth) return requireAuth(req, res, next);
    next();
}, (req, res) => {
    if (!client || !client.isReady()) {
        return res.status(503).json({ error: 'Bot is not ready' });
    }
    
    // If authenticated, only return guilds user has admin in
    if (req.isAuthenticated && req.isAuthenticated()) {
        const userGuilds = req.user.guilds || [];
        const botGuilds = client.guilds.cache;
        
        const mutualGuilds = userGuilds
            .filter(ug => botGuilds.has(ug.id))
            .filter(ug => (parseInt(ug.permissions) & 0x8) === 0x8)
            .map(ug => {
                const guild = botGuilds.get(ug.id);
                return {
                    id: guild.id,
                    name: guild.name,
                    memberCount: guild.memberCount,
                    icon: guild.iconURL()
                };
            });
        
        return res.json(mutualGuilds);
    }
    
    // Fallback: return all guilds (if no auth required)
    const guilds = client.guilds.cache.map(guild => ({
        id: guild.id,
        name: guild.name,
        memberCount: guild.memberCount,
        icon: guild.iconURL()
    }));
    
    res.json(guilds);
});

// Middleware to check guild_id
const requireGuildId = (req, res, next) => {
    const { guild_id } = req.query;
    if (!guild_id) {
        return res.status(400).json({ error: 'guild_id is required' });
    }
    next();
};

// Auth middleware wrapper - applies auth if configured
const authMiddleware = (req, res, next) => {
    if (requireAuth) {
        return requireAuth(req, res, next);
    }
    next();
};

// === MODERATION ===
// Fetch mod logs
router.get('/modlogs', authMiddleware, requireGuildId, async (req, res) => {
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
router.get('/cases', authMiddleware, requireGuildId, async (req, res) => {
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
router.get('/userhistory', authMiddleware,  async (req, res) => {
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
router.get('/settings', authMiddleware,  requireGuildId, async (req, res) => {
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

// Get channels for a guild
router.get('/channels', authMiddleware, requireGuildId, async (req, res) => {
    try {
        const { guild_id } = req.query;
        
        if (!client || !client.isReady()) {
            return res.status(503).json({ error: 'Bot is not ready' });
        }
        
        const guild = client.guilds.cache.get(guild_id);
        if (!guild) {
            return res.status(404).json({ error: 'Guild not found' });
        }
        
        const channels = guild.channels.cache
            .filter(ch => ch.type === 0) // Text channels
            .map(ch => ({
                id: ch.id,
                name: ch.name,
                type: ch.type
            }));
        
        res.json(channels);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update welcome channel
router.post('/settings/welcome', authMiddleware, async (req, res) => {
    try {
        const { guild_id, channel_id } = req.body;
        if (!guild_id) return res.status(400).json({ error: 'guild_id required' });
        
        await db.query(`CREATE TABLE IF NOT EXISTS welcome_channels (guild_id VARCHAR(32) PRIMARY KEY, channel_id VARCHAR(32))`);
        
        if (channel_id) {
            await db.query(
                `INSERT INTO welcome_channels (guild_id, channel_id) VALUES ($1, $2) 
                 ON CONFLICT (guild_id) DO UPDATE SET channel_id = $2`,
                [guild_id, channel_id]
            );
        } else {
            await db.query('DELETE FROM welcome_channels WHERE guild_id = $1', [guild_id]);
        }
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update modlog channel
router.post('/settings/modlog', authMiddleware, async (req, res) => {
    try {
        const { guild_id, channel_id } = req.body;
        if (!guild_id) return res.status(400).json({ error: 'guild_id required' });
        
        await db.query(`CREATE TABLE IF NOT EXISTS mod_log_channels (guild_id VARCHAR(32) PRIMARY KEY, channel_id VARCHAR(32))`);
        
        if (channel_id) {
            await db.query(
                `INSERT INTO mod_log_channels (guild_id, channel_id) VALUES ($1, $2) 
                 ON CONFLICT (guild_id) DO UPDATE SET channel_id = $2`,
                [guild_id, channel_id]
            );
        } else {
            await db.query('DELETE FROM mod_log_channels WHERE guild_id = $1', [guild_id]);
        }
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update logging channel
router.post('/settings/logging', authMiddleware, async (req, res) => {
    try {
        const { guild_id, channel_id } = req.body;
        if (!guild_id) return res.status(400).json({ error: 'guild_id required' });
        
        await db.query(`CREATE TABLE IF NOT EXISTS logging_channels (guild_id VARCHAR(32) PRIMARY KEY, channel_id VARCHAR(32))`);
        
        if (channel_id) {
            await db.query(
                `INSERT INTO logging_channels (guild_id, channel_id) VALUES ($1, $2) 
                 ON CONFLICT (guild_id) DO UPDATE SET channel_id = $2`,
                [guild_id, channel_id]
            );
        } else {
            await db.query('DELETE FROM logging_channels WHERE guild_id = $1', [guild_id]);
        }
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update starboard settings
router.post('/settings/starboard', authMiddleware, async (req, res) => {
    try {
        const { guild_id, channel_id, emoji, threshold } = req.body;
        if (!guild_id) return res.status(400).json({ error: 'guild_id required' });
        
        await db.query(`
            CREATE TABLE IF NOT EXISTS starboard_settings (
                guild_id VARCHAR(32) PRIMARY KEY, 
                channel_id VARCHAR(32),
                emoji VARCHAR(32) DEFAULT '⭐',
                threshold INT DEFAULT 3
            )
        `);
        
        if (channel_id) {
            await db.query(
                `INSERT INTO starboard_settings (guild_id, channel_id, emoji, threshold) 
                 VALUES ($1, $2, $3, $4) 
                 ON CONFLICT (guild_id) DO UPDATE SET channel_id = $2, emoji = $3, threshold = $4`,
                [guild_id, channel_id, emoji || '⭐', threshold || 3]
            );
        } else {
            await db.query('DELETE FROM starboard_settings WHERE guild_id = $1', [guild_id]);
        }
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === STATISTICS ===
router.get('/stats', authMiddleware,  requireGuildId, async (req, res) => {
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
router.get('/leaderboard/rep', authMiddleware,  async (req, res) => {
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

router.get('/leaderboard/xp', authMiddleware,  async (req, res) => {
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

router.get('/leaderboard/weekly', authMiddleware,  async (req, res) => {
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
router.get('/commands', authMiddleware,  async (req, res) => {
    try {
        const commands = await db.query('SELECT name, response FROM custom_commands ORDER BY name');
        res.json(commands.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === STARBOARD ===
router.get('/starboard', authMiddleware,  requireGuildId, async (req, res) => {
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
router.get('/activity', authMiddleware,  requireGuildId, async (req, res) => {
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

// === ANALYTICS (Premium Feature) ===
router.get('/analytics/messages', authMiddleware, requireGuildId, async (req, res) => {
    try {
        const { guild_id, days = 7 } = req.query;
        
        // Message activity over time (from logging)
        const result = await db.query(
            `SELECT DATE(timestamp) as date, COUNT(*) as count 
             FROM mod_logs 
             WHERE guild_id = $1 AND action = 'message_create' 
             AND timestamp > NOW() - INTERVAL '${parseInt(days)} days'
             GROUP BY DATE(timestamp) 
             ORDER BY date`,
            [guild_id]
        );
        
        res.json({ data: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/analytics/users', authMiddleware, requireGuildId, async (req, res) => {
    try {
        const { guild_id } = req.query;
        
        // Top active users by XP
        const xpResult = await db.query(
            `SELECT user_id, xp FROM user_xp ORDER BY xp DESC LIMIT 10`
        );
        
        // Top users by reputation
        const repResult = await db.query(
            `SELECT user_id, rep FROM user_rep ORDER BY rep DESC LIMIT 10`
        );
        
        res.json({
            topXP: xpResult.rows,
            topRep: repResult.rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/analytics/moderation', authMiddleware, requireGuildId, async (req, res) => {
    try {
        const { guild_id, days = 30 } = req.query;
        
        // Mod actions over time
        const actionsResult = await db.query(
            `SELECT DATE(created_at) as date, action, COUNT(*) as count 
             FROM mod_cases 
             WHERE guild_id = $1 AND created_at > NOW() - INTERVAL '${parseInt(days)} days'
             GROUP BY DATE(created_at), action 
             ORDER BY date`,
            [guild_id]
        );
        
        // Auto-mod violations (if premium)
        const violationsResult = await db.query(
            `SELECT DATE(timestamp) as date, rule_type, COUNT(*) as count 
             FROM automod_violations 
             WHERE guild_id = $1 AND timestamp > NOW() - INTERVAL '${parseInt(days)} days'
             GROUP BY DATE(timestamp), rule_type 
             ORDER BY date`,
            [guild_id]
        );
        
        res.json({
            actions: actionsResult.rows,
            violations: violationsResult.rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/analytics/growth', authMiddleware, requireGuildId, async (req, res) => {
    try {
        const { guild_id } = req.query;
        const guild = client.guilds.cache.get(guild_id);
        
        if (!guild) {
            return res.status(404).json({ error: 'Guild not found' });
        }
        
        res.json({
            memberCount: guild.memberCount,
            roleCount: guild.roles.cache.size,
            channelCount: guild.channels.cache.size,
            boostLevel: guild.premiumTier,
            boostCount: guild.premiumSubscriptionCount || 0
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === AUTO-MOD API ===
router.get('/automod/rules', authMiddleware, requireGuildId, async (req, res) => {
    try {
        const { guild_id } = req.query;
        const automod = require('../automod');
        const rules = await automod.getRules(guild_id);
        res.json(rules);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/automod/rules', authMiddleware, async (req, res) => {
    try {
        const { guild_id, rule_type, enabled, action, threshold, config } = req.body;
        if (!guild_id) {
            return res.status(400).json({ error: 'guild_id is required' });
        }
        const automod = require('../automod');
        await automod.setRule(guild_id, rule_type, enabled, action, threshold, config || {});
        res.json({ success: true });
    } catch (err) {
        console.error('Error saving automod rule:', err);
        res.status(500).json({ error: err.message });
    }
});

router.get('/automod/violations', authMiddleware, requireGuildId, async (req, res) => {
    try {
        const { guild_id, limit = 50 } = req.query;
        const automod = require('../automod');
        const violations = await automod.getViolations(guild_id, parseInt(limit));
        res.json(violations);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === BACKUP & RESTORE API (Premium Feature) ===
router.post('/backup/create', authMiddleware, requireGuildId, async (req, res) => {
    try {
        const { guild_id } = req.body;
        const guild = client.guilds.cache.get(guild_id);
        
        if (!guild) {
            return res.status(404).json({ error: 'Guild not found' });
        }
        
        const backup = require('../backup');
        const result = await backup.createBackup(guild_id, guild.name);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/backup/list', authMiddleware, requireGuildId, async (req, res) => {
    try {
        const { guild_id } = req.query;
        const backup = require('../backup');
        const backups = await backup.listBackups(guild_id);
        res.json(backups);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/backup/restore', authMiddleware, requireGuildId, async (req, res) => {
    try {
        const { guild_id, backup_id } = req.body;
        const backup = require('../backup');
        const result = await backup.restoreBackup(guild_id, backup_id);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/backup/:id', authMiddleware, requireGuildId, async (req, res) => {
    try {
        const { guild_id } = req.query;
        const backup = require('../backup');
        const result = await backup.deleteBackup(guild_id, req.params.id);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === ANTI-NUKE ENDPOINTS ===
router.get('/antinuke', authMiddleware, requireGuildId, async (req, res) => {
    try {
        const { guild_id } = req.query;
        const result = await db.query(
            'SELECT enabled, whitelist FROM antinuke_config WHERE guild_id = $1',
            [guild_id]
        );
        
        if (result.rows.length === 0) {
            return res.json({ enabled: false, whitelist: [] });
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/antinuke', authMiddleware, requireGuildId, async (req, res) => {
    try {
        const { guild_id } = req.query;
        const { enabled, whitelist } = req.body;
        
        await db.query(
            `INSERT INTO antinuke_config (guild_id, enabled, whitelist) 
             VALUES ($1, $2, $3) 
             ON CONFLICT (guild_id) 
             DO UPDATE SET enabled = $2, whitelist = $3`,
            [guild_id, enabled, whitelist || []]
        );
        
        res.json({ success: true, message: 'Anti-nuke settings updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === JOIN GATE ENDPOINTS ===
router.get('/joingate', authMiddleware, requireGuildId, async (req, res) => {
    try {
        const { guild_id } = req.query;
        const result = await db.query(
            'SELECT enabled, verified_role_id FROM joingate_config WHERE guild_id = $1',
            [guild_id]
        );
        
        if (result.rows.length === 0) {
            return res.json({ enabled: false, verified_role_id: null });
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/joingate', authMiddleware, requireGuildId, async (req, res) => {
    try {
        const { guild_id } = req.query;
        const { enabled, verified_role_id } = req.body;
        
        await db.query(
            `INSERT INTO joingate_config (guild_id, enabled, verified_role_id) 
             VALUES ($1, $2, $3) 
             ON CONFLICT (guild_id) 
             DO UPDATE SET enabled = $2, verified_role_id = $3`,
            [guild_id, enabled, verified_role_id]
        );
        
        res.json({ success: true, message: 'Join gate settings updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

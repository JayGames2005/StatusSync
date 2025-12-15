// Backup & Restore System (Premium Feature)
const db = require('./db');

// Create backup of guild settings
async function createBackup(guildId, guildName) {
    try {
        const backup = {
            guild_id: guildId,
            guild_name: guildName,
            timestamp: new Date().toISOString(),
            data: {}
        };
        
        // Backup welcome channel
        const welcomeResult = await db.query(
            'SELECT channel_id FROM welcome_channels WHERE guild_id = $1',
            [guildId]
        );
        if (welcomeResult.rows.length > 0) {
            backup.data.welcome_channel = welcomeResult.rows[0].channel_id;
        }
        
        // Backup logging channel
        const loggingResult = await db.query(
            'SELECT channel_id FROM logging_channels WHERE guild_id = $1',
            [guildId]
        );
        if (loggingResult.rows.length > 0) {
            backup.data.logging_channel = loggingResult.rows[0].channel_id;
        }
        
        // Backup mod log channel
        const modlogResult = await db.query(
            'SELECT channel_id FROM mod_log_channels WHERE guild_id = $1',
            [guildId]
        );
        if (modlogResult.rows.length > 0) {
            backup.data.modlog_channel = modlogResult.rows[0].channel_id;
        }
        
        // Backup starboard settings
        const starboardResult = await db.query(
            'SELECT channel_id, emoji, threshold FROM starboard_settings WHERE guild_id = $1',
            [guildId]
        );
        if (starboardResult.rows.length > 0) {
            backup.data.starboard = starboardResult.rows[0];
        }
        
        // Backup custom commands
        const commandsResult = await db.query(
            'SELECT name, response FROM custom_commands WHERE guild_id = $1',
            [guildId]
        );
        backup.data.custom_commands = commandsResult.rows;
        
        // Backup auto-mod rules (if premium)
        const automodResult = await db.query(
            'SELECT rule_type, enabled, action, threshold, config FROM automod_rules WHERE guild_id = $1',
            [guildId]
        );
        backup.data.automod_rules = automodResult.rows;
        
        // Backup premium features
        const premiumResult = await db.query(
            'SELECT * FROM premium_features WHERE guild_id = $1',
            [guildId]
        );
        if (premiumResult.rows.length > 0) {
            backup.data.premium_features = premiumResult.rows[0];
        }
        
        // Store backup in database
        await db.query(`
            CREATE TABLE IF NOT EXISTS backups (
                id SERIAL PRIMARY KEY,
                guild_id VARCHAR(32) NOT NULL,
                guild_name VARCHAR(255),
                backup_data JSONB NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        const result = await db.query(
            `INSERT INTO backups (guild_id, guild_name, backup_data) VALUES ($1, $2, $3) RETURNING id`,
            [guildId, guildName, JSON.stringify(backup)]
        );
        
        return { success: true, backup_id: result.rows[0].id, backup };
    } catch (err) {
        console.error('Backup creation error:', err);
        return { success: false, error: err.message };
    }
}

// Restore guild settings from backup
async function restoreBackup(guildId, backupId) {
    try {
        // Fetch backup
        const result = await db.query(
            'SELECT backup_data FROM backups WHERE id = $1 AND guild_id = $2',
            [backupId, guildId]
        );
        
        if (result.rows.length === 0) {
            return { success: false, error: 'Backup not found' };
        }
        
        const backup = result.rows[0].backup_data;
        const data = backup.data;
        
        // Restore welcome channel
        if (data.welcome_channel) {
            await db.query(
                `INSERT INTO welcome_channels (guild_id, channel_id) VALUES ($1, $2)
                 ON CONFLICT (guild_id) DO UPDATE SET channel_id = $2`,
                [guildId, data.welcome_channel]
            );
        }
        
        // Restore logging channel
        if (data.logging_channel) {
            await db.query(
                `INSERT INTO logging_channels (guild_id, channel_id) VALUES ($1, $2)
                 ON CONFLICT (guild_id) DO UPDATE SET channel_id = $2`,
                [guildId, data.logging_channel]
            );
        }
        
        // Restore mod log channel
        if (data.modlog_channel) {
            await db.query(
                `INSERT INTO mod_log_channels (guild_id, channel_id) VALUES ($1, $2)
                 ON CONFLICT (guild_id) DO UPDATE SET channel_id = $2`,
                [guildId, data.modlog_channel]
            );
        }
        
        // Restore starboard settings
        if (data.starboard) {
            await db.query(
                `INSERT INTO starboard_settings (guild_id, channel_id, emoji, threshold) 
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (guild_id) DO UPDATE SET channel_id = $2, emoji = $3, threshold = $4`,
                [guildId, data.starboard.channel_id, data.starboard.emoji, data.starboard.threshold]
            );
        }
        
        // Restore custom commands (delete existing first)
        await db.query('DELETE FROM custom_commands WHERE guild_id = $1', [guildId]);
        for (const cmd of data.custom_commands || []) {
            await db.query(
                'INSERT INTO custom_commands (guild_id, name, response) VALUES ($1, $2, $3)',
                [guildId, cmd.name, cmd.response]
            );
        }
        
        // Restore auto-mod rules (delete existing first)
        await db.query('DELETE FROM automod_rules WHERE guild_id = $1', [guildId]);
        for (const rule of data.automod_rules || []) {
            await db.query(
                `INSERT INTO automod_rules (guild_id, rule_type, enabled, action, threshold, config)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [guildId, rule.rule_type, rule.enabled, rule.action, rule.threshold, rule.config]
            );
        }
        
        // Restore premium features
        if (data.premium_features) {
            const pf = data.premium_features;
            await db.query(
                `INSERT INTO premium_features 
                 (guild_id, custom_status, xp_multiplier, embed_color, auto_mod_enabled, custom_welcome_enabled)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (guild_id) DO UPDATE SET 
                 custom_status = $2, xp_multiplier = $3, embed_color = $4, 
                 auto_mod_enabled = $5, custom_welcome_enabled = $6`,
                [guildId, pf.custom_status, pf.xp_multiplier, pf.embed_color, 
                 pf.auto_mod_enabled, pf.custom_welcome_enabled]
            );
        }
        
        return { success: true, restored: backup };
    } catch (err) {
        console.error('Restore error:', err);
        return { success: false, error: err.message };
    }
}

// List backups for a guild
async function listBackups(guildId) {
    try {
        const result = await db.query(
            `SELECT id, guild_name, created_at FROM backups 
             WHERE guild_id = $1 
             ORDER BY created_at DESC 
             LIMIT 10`,
            [guildId]
        );
        return result.rows;
    } catch (err) {
        console.error('List backups error:', err);
        return [];
    }
}

// Delete a backup
async function deleteBackup(guildId, backupId) {
    try {
        await db.query(
            'DELETE FROM backups WHERE id = $1 AND guild_id = $2',
            [backupId, guildId]
        );
        return { success: true };
    } catch (err) {
        console.error('Delete backup error:', err);
        return { success: false, error: err.message };
    }
}

module.exports = {
    createBackup,
    restoreBackup,
    listBackups,
    deleteBackup
};

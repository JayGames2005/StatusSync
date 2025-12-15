// Advanced Auto-Moderation System (Premium Feature)
const db = require('./db');

// Initialize auto-mod tables
async function ensureAutoModTables() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS automod_rules (
            id SERIAL PRIMARY KEY,
            guild_id VARCHAR(32) NOT NULL,
            rule_type VARCHAR(32) NOT NULL,
            enabled BOOLEAN DEFAULT true,
            action VARCHAR(16) DEFAULT 'warn',
            threshold INTEGER DEFAULT 3,
            config JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    await db.query(`
        CREATE TABLE IF NOT EXISTS automod_violations (
            id SERIAL PRIMARY KEY,
            guild_id VARCHAR(32) NOT NULL,
            user_id VARCHAR(32) NOT NULL,
            rule_type VARCHAR(32) NOT NULL,
            content TEXT,
            action_taken VARCHAR(16),
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    await db.query(`
        CREATE TABLE IF NOT EXISTS automod_spam_tracker (
            guild_id VARCHAR(32) NOT NULL,
            user_id VARCHAR(32) NOT NULL,
            message_count INTEGER DEFAULT 1,
            last_message TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (guild_id, user_id)
        )
    `);
}

ensureAutoModTables();

// Spam detection
async function checkSpam(message) {
    try {
        const result = await db.query(
            'SELECT message_count, last_message FROM automod_spam_tracker WHERE guild_id = $1 AND user_id = $2',
            [message.guild.id, message.author.id]
        );
        
        const now = new Date();
        let messageCount = 1;
        
        if (result.rows.length > 0) {
            const lastMessage = new Date(result.rows[0].last_message);
            const timeDiff = (now - lastMessage) / 1000; // seconds
            
            // Reset if more than 10 seconds since last message
            if (timeDiff > 10) {
                messageCount = 1;
            } else {
                messageCount = result.rows[0].message_count + 1;
            }
        }
        
        await db.query(`
            INSERT INTO automod_spam_tracker (guild_id, user_id, message_count, last_message)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (guild_id, user_id) 
            DO UPDATE SET message_count = $3, last_message = $4
        `, [message.guild.id, message.author.id, messageCount, now]);
        
        // Check if spam threshold exceeded
        const ruleResult = await db.query(
            `SELECT threshold, action FROM automod_rules 
             WHERE guild_id = $1 AND rule_type = 'spam' AND enabled = true`,
            [message.guild.id]
        );
        
        if (ruleResult.rows.length > 0) {
            const threshold = ruleResult.rows[0].threshold || 5;
            if (messageCount >= threshold) {
                return { violation: true, action: ruleResult.rows[0].action || 'warn', type: 'spam' };
            }
        }
        
        return { violation: false };
    } catch (err) {
        console.error('Spam check error:', err);
        return { violation: false };
    }
}

// Profanity/word filter
async function checkBadWords(message) {
    try {
        const ruleResult = await db.query(
            `SELECT config, action FROM automod_rules 
             WHERE guild_id = $1 AND rule_type = 'bad_words' AND enabled = true`,
            [message.guild.id]
        );
        
        if (ruleResult.rows.length === 0) return { violation: false };
        
        const config = ruleResult.rows[0].config || {};
        const badWords = config.words || [];
        
        if (badWords.length === 0) return { violation: false };
        
        const content = message.content.toLowerCase();
        const foundWords = badWords.filter(word => {
            const regex = new RegExp(`\\b${word.toLowerCase()}\\b`, 'i');
            return regex.test(content);
        });
        
        if (foundWords.length > 0) {
            return { 
                violation: true, 
                action: ruleResult.rows[0].action || 'delete', 
                type: 'bad_words',
                words: foundWords
            };
        }
        
        return { violation: false };
    } catch (err) {
        console.error('Bad words check error:', err);
        return { violation: false };
    }
}

// Link/invite filter
async function checkLinks(message) {
    try {
        const ruleResult = await db.query(
            `SELECT action FROM automod_rules 
             WHERE guild_id = $1 AND rule_type = 'links' AND enabled = true`,
            [message.guild.id]
        );
        
        if (ruleResult.rows.length === 0) return { violation: false };
        
        // Check for discord invites
        const inviteRegex = /(discord\.gg|discord\.com\/invite|discordapp\.com\/invite)\/[a-zA-Z0-9]+/gi;
        const urlRegex = /(https?:\/\/[^\s]+)/gi;
        
        if (inviteRegex.test(message.content) || urlRegex.test(message.content)) {
            return { 
                violation: true, 
                action: ruleResult.rows[0].action || 'delete', 
                type: 'links'
            };
        }
        
        return { violation: false };
    } catch (err) {
        console.error('Links check error:', err);
        return { violation: false };
    }
}

// Caps lock filter
async function checkCaps(message) {
    try {
        const ruleResult = await db.query(
            `SELECT threshold, action FROM automod_rules 
             WHERE guild_id = $1 AND rule_type = 'caps' AND enabled = true`,
            [message.guild.id]
        );
        
        if (ruleResult.rows.length === 0) return { violation: false };
        
        const content = message.content;
        if (content.length < 10) return { violation: false }; // Skip short messages
        
        const capsCount = (content.match(/[A-Z]/g) || []).length;
        const totalLetters = (content.match(/[a-zA-Z]/g) || []).length;
        
        if (totalLetters === 0) return { violation: false };
        
        const capsPercentage = (capsCount / totalLetters) * 100;
        const threshold = ruleResult.rows[0].threshold || 70;
        
        if (capsPercentage >= threshold) {
            return { 
                violation: true, 
                action: ruleResult.rows[0].action || 'warn', 
                type: 'caps'
            };
        }
        
        return { violation: false };
    } catch (err) {
        console.error('Caps check error:', err);
        return { violation: false };
    }
}

// Log violation
async function logViolation(guildId, userId, ruleType, content, action) {
    try {
        await db.query(
            `INSERT INTO automod_violations (guild_id, user_id, rule_type, content, action_taken)
             VALUES ($1, $2, $3, $4, $5)`,
            [guildId, userId, ruleType, content, action]
        );
    } catch (err) {
        console.error('Error logging violation:', err);
    }
}

// Take action
async function takeAction(message, violation) {
    try {
        const actions = {
            delete: async () => {
                await message.delete();
                await message.channel.send({
                    content: `<@${message.author.id}> Your message was deleted by auto-moderation (${violation.type}).`,
                    flags: 64
                });
            },
            warn: async () => {
                await message.channel.send({
                    content: `⚠️ <@${message.author.id}> Warning: Your message violates server rules (${violation.type}).`
                });
            },
            timeout: async () => {
                const member = await message.guild.members.fetch(message.author.id);
                await member.timeout(5 * 60 * 1000, `Auto-mod: ${violation.type}`); // 5 minute timeout
                await message.delete();
                await message.channel.send({
                    content: `<@${message.author.id}> has been timed out for 5 minutes (auto-mod: ${violation.type}).`
                });
            },
            kick: async () => {
                const member = await message.guild.members.fetch(message.author.id);
                await member.kick(`Auto-mod: ${violation.type}`);
                await message.channel.send({
                    content: `<@${message.author.id}> has been kicked (auto-mod: ${violation.type}).`
                });
            }
        };
        
        const actionFn = actions[violation.action] || actions.warn;
        await actionFn();
        
        await logViolation(
            message.guild.id,
            message.author.id,
            violation.type,
            message.content,
            violation.action
        );
    } catch (err) {
        console.error('Error taking auto-mod action:', err);
    }
}

// Main auto-mod check
async function checkMessage(message, isPremium) {
    if (!isPremium) return; // Premium feature only
    if (message.author.bot) return;
    if (!message.guild) return;
    if (message.member?.permissions.has('Administrator')) return; // Skip admins
    
    try {
        // Run all checks
        const checks = [
            checkSpam(message),
            checkBadWords(message),
            checkLinks(message),
            checkCaps(message)
        ];
        
        const results = await Promise.all(checks);
        
        // Take action on first violation found
        for (const result of results) {
            if (result.violation) {
                await takeAction(message, result);
                break; // Only take one action
            }
        }
    } catch (err) {
        console.error('Auto-mod check error:', err);
    }
}

// API: Get rules for a guild
async function getRules(guildId) {
    const result = await db.query(
        'SELECT * FROM automod_rules WHERE guild_id = $1 ORDER BY id',
        [guildId]
    );
    return result.rows;
}

// API: Add/update rule
async function setRule(guildId, ruleType, enabled, action, threshold, config) {
    await db.query(`
        INSERT INTO automod_rules (guild_id, rule_type, enabled, action, threshold, config)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT ON CONSTRAINT automod_rules_pkey
        DO UPDATE SET enabled = $3, action = $4, threshold = $5, config = $6
    `, [guildId, ruleType, enabled, action, threshold, JSON.stringify(config)]);
}

// API: Get violations
async function getViolations(guildId, limit = 50) {
    const result = await db.query(
        `SELECT * FROM automod_violations 
         WHERE guild_id = $1 
         ORDER BY timestamp DESC 
         LIMIT $2`,
        [guildId, limit]
    );
    return result.rows;
}

module.exports = {
    checkMessage,
    getRules,
    setRule,
    getViolations
};

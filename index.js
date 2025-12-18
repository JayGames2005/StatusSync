// Removed invalid top-level imgsay handler. See below for correct placement.
// --- BUMP REMINDERS TABLE ---
async function ensureBumpRemindersTable() {
    await db.query(`CREATE TABLE IF NOT EXISTS bump_reminders (
        guild_id VARCHAR(32) PRIMARY KEY,
        channel_id VARCHAR(32),
        role_id VARCHAR(32),
        last_bump BIGINT,
        next_reminder BIGINT
    )`);
}

// --- STARBOARD TRACKING TABLE ---
async function ensureStarboardTable() {
    await db.query(`CREATE TABLE IF NOT EXISTS starboard_posts (
        message_id VARCHAR(32) PRIMARY KEY,
        author_id VARCHAR(32),
        stars INTEGER DEFAULT 0,
        url TEXT,
        content TEXT,
        created_at TIMESTAMP
    )`);
}

// XP SYSTEM: Add XP on each message, weekly and all-time leaderboards, no level-up messages
// Create tables if not exist
async function ensureXpTables() {
    await db.query(`CREATE TABLE IF NOT EXISTS user_xp (
        user_id VARCHAR(32) PRIMARY KEY,
        xp INTEGER DEFAULT 0
    )`);
    await db.query(`CREATE TABLE IF NOT EXISTS user_xp_weekly (
        user_id VARCHAR(32) PRIMARY KEY,
        xp INTEGER DEFAULT 0,
        week_start DATE
    )`);
}

// Helper to get start of current week (Monday 11am EST)
function getCurrentWeekStart() {
    const now = new Date();
    // Convert to EST (UTC-5 or UTC-4 DST, but we use UTC-5 for simplicity)
    const utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
    let est = new Date(utc.getTime() - (5 * 60 * 60 * 1000));
    // Set to Monday 11am
    est.setUTCHours(16, 0, 0, 0); // 11am EST = 16:00 UTC
    est.setUTCDate(est.getUTCDate() - ((est.getUTCDay() + 6) % 7));
    return est.toISOString().slice(0, 10); // YYYY-MM-DD
}

require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection, REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
// Register slash commands
const commands = [
    new SlashCommandBuilder()
        .setName('ask')
        .setDescription('Ask the AI a question')
        .addStringOption(option => option.setName('question').setDescription('Your question').setRequired(true)),
    new SlashCommandBuilder()
        .setName('resetweeklyxp')
        .setDescription('Admin: Reset weekly XP for all users')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName('starboardleaderboard')
        .setDescription('Show the top users and messages on the starboard')
        .setName('setstarboard')
        .setDescription('Configure the starboard channel, emoji, and threshold')
        .addChannelOption(option => option.setName('channel').setDescription('Starboard channel').setRequired(true))
        .addStringOption(option => option.setName('emoji').setDescription('Emoji to use (default: ⭐)').setRequired(false))
        .addIntegerOption(option => option.setName('threshold').setDescription('Reactions needed (default: 3)').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Delete multiple messages at once')
        .addIntegerOption(option => option.setName('count').setDescription('Number of messages to delete (1-100)').setRequired(true))
        .addUserOption(option => option.setName('user').setDescription('Only delete messages from this user').setRequired(false))
        .addStringOption(option => option.setName('contains').setDescription('Only delete messages containing this text').setRequired(false))
        .addBooleanOption(option => option.setName('bots').setDescription('Only delete bot messages').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Lock the channel (prevent @everyone from sending messages)')
        .addChannelOption(option => option.setName('channel').setDescription('Channel to lock (current if not specified)').setRequired(false))
        .addStringOption(option => option.setName('reason').setDescription('Reason for locking').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Unlock the channel (restore @everyone permissions)')
        .addChannelOption(option => option.setName('channel').setDescription('Channel to unlock (current if not specified)').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('Set channel slowmode delay')
        .addIntegerOption(option => option.setName('seconds').setDescription('Slowmode delay in seconds (0 to disable)').setRequired(true))
        .addChannelOption(option => option.setName('channel').setDescription('Channel to apply slowmode (current if not specified)').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    new SlashCommandBuilder()
        .setName('teststarboard')
        .setDescription('Admin: Test the starboard by reposting a message to #starboard')
        .addStringOption(option => option.setName('message').setDescription('Message link or ID').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName('xpleaderboard')
        .setDescription('Show the all-time XP leaderboard'),
    new SlashCommandBuilder()
        .setName('xpweekly')
        .setDescription('Show the weekly XP leaderboard (resets every Monday 11am EST)'),
    new SlashCommandBuilder()
        .setName('repleaderboard')
        .setDescription('Show the top users with the highest reputation'),
    new SlashCommandBuilder()
        .setName('setwelcome')
        .setDescription('Set the welcome channel for this server')
        .addChannelOption(option => option.setName('channel').setDescription('Welcome channel').setRequired(true)),
    new SlashCommandBuilder()
        .setName('setupdb')
        .setDescription('Create all necessary database tables for StatusSync')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName('rep')
        .setDescription('Show your or another user\'s reputation')
        .addUserOption(option => option.setName('user').setDescription('User to check').setRequired(false)),
    new SlashCommandBuilder()
        .setName('addrep')
        .setDescription('Give reputation to a user')
        .addUserOption(option => option.setName('user').setDescription('User to give rep to').setRequired(true))
        .addIntegerOption(option => option.setName('amount').setDescription('Amount (+1, -1, +2, -2)').setRequired(false)),
    new SlashCommandBuilder()
        .setName('negrep')
        .setDescription('Give negative reputation to a user')
        .addUserOption(option => option.setName('user').setDescription('User to give neg rep to').setRequired(true))
        .addIntegerOption(option => option.setName('amount').setDescription('Amount (-1, -2)').setRequired(false)),
    new SlashCommandBuilder()
        .setName('addcmd')
        .setDescription('Add a custom command')
        .addStringOption(option => option.setName('name').setDescription('Command name').setRequired(true))
        .addStringOption(option => option.setName('response').setDescription('Command response').setRequired(true)),
    new SlashCommandBuilder()
        .setName('removecmd')
        .setDescription('Remove a custom command')
        .addStringOption(option => option.setName('name').setDescription('Command name').setRequired(true)),
    new SlashCommandBuilder()
        .setName('listcmds')
        .setDescription('List all custom commands'),
    new SlashCommandBuilder()
        .setName('setrepbg')
        .setDescription('Set your rep card background color (choose a color)')
        .addStringOption(option =>
            option.setName('color')
                .setDescription('Background color')
                .setRequired(true)
                .addChoices(
                    { name: 'Blue', value: 'blue' },
                    { name: 'Red', value: 'red' },
                    { name: 'Black', value: 'black' },
                    { name: 'White', value: 'white' },
                    { name: 'Green', value: 'green' },
                    { name: 'Purple', value: 'purple' },
                    { name: 'Orange', value: 'orange' }
                )
        ),
    // Moderation commands
    new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warn a user')
        .addUserOption(option => option.setName('user').setDescription('User to warn').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Reason for warning').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Timeout a user')
        .addUserOption(option => option.setName('user').setDescription('User to timeout').setRequired(true))
        .addIntegerOption(option => option.setName('duration').setDescription('Duration in minutes').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Reason for timeout').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a user from the server')
        .addUserOption(option => option.setName('user').setDescription('User to kick').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Reason for kick').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a user from the server')
        .addUserOption(option => option.setName('user').setDescription('User to ban').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Reason for ban').setRequired(false))
        .addIntegerOption(option => option.setName('delete_messages').setDescription('Delete messages from last X days (0-7)').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Unban a user from the server')
        .addStringOption(option => option.setName('user_id').setDescription('User ID to unban').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Reason for unban').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    new SlashCommandBuilder()
        .setName('case')
        .setDescription('View a moderation case')
        .addIntegerOption(option => option.setName('case_id').setDescription('Case ID to view').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    new SlashCommandBuilder()
        .setName('closecase')
        .setDescription('Close/resolve a moderation case')
        .addIntegerOption(option => option.setName('case_id').setDescription('Case ID to close').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Reason for closing').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    new SlashCommandBuilder()
        .setName('cases')
        .setDescription('View all moderation cases for a user')
        .addUserOption(option => option.setName('user').setDescription('User to view cases for').setRequired(true))
        .addStringOption(option => 
            option.setName('status')
                .setDescription('Filter by case status')
                .setRequired(false)
                .addChoices(
                    { name: 'All Cases', value: 'all' },
                    { name: 'Open Cases', value: 'open' },
                    { name: 'Closed Cases', value: 'closed' }
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    new SlashCommandBuilder()
        .setName('setmodlog')
        .setDescription('Set the moderation log channel')
        .addChannelOption(option => option.setName('channel').setDescription('Moderation log channel').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName('setlogging')
        .setDescription('Set the logging channel for member joins/leaves')
        .addChannelOption(option => option.setName('channel').setDescription('Logging channel').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName('dashboard')
        .setDescription('Get the link to the StatusSync dashboard'),
    new SlashCommandBuilder()
        .setName('premium')
        .setDescription('Check your server\'s premium status'),
    new SlashCommandBuilder()
        .setName('grantpremium')
        .setDescription('Grant premium to this server (bot owner only)')
        .addStringOption(option => 
            option.setName('tier')
                .setDescription('Premium tier')
                .setRequired(true)
                .addChoices(
                    { name: 'Basic', value: 'basic' },
                    { name: 'Pro', value: 'pro' },
                    { name: 'Enterprise', value: 'enterprise' }
                )
        ),
    new SlashCommandBuilder()
        .setName('bumpreminder')
        .setDescription('Setup automatic bump reminders for Disboard')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Enable bump reminders')
                .addChannelOption(option => option.setName('channel').setDescription('Channel to send reminders').setRequired(true))
                .addRoleOption(option => option.setName('role').setDescription('Role to ping (optional)').setRequired(false))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Disable bump reminders')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check bump reminder status')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    new SlashCommandBuilder()
        .setName('history')
        .setDescription('View detailed information about a user')
        .addUserOption(option => option.setName('user').setDescription('User to view').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    new SlashCommandBuilder()
        .setName('modstats')
        .setDescription('View moderator activity statistics')
        .addUserOption(option => option.setName('moderator').setDescription('Specific moderator (optional)').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    new SlashCommandBuilder()
        .setName('massban')
        .setDescription('Ban multiple users at once')
        .addStringOption(option => option.setName('user_ids').setDescription('User IDs separated by spaces or commas').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Reason for bans').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    new SlashCommandBuilder()
        .setName('massrole')
        .setDescription('Add or remove a role from multiple users')
        .addRoleOption(option => option.setName('role').setDescription('Role to manage').setRequired(true))
        .addStringOption(option => 
            option.setName('action')
                .setDescription('Add or remove role')
                .setRequired(true)
                .addChoices(
                    { name: 'Add', value: 'add' },
                    { name: 'Remove', value: 'remove' }
                ))
        .addStringOption(option => option.setName('user_ids').setDescription('User IDs separated by spaces or commas').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    new SlashCommandBuilder()
        .setName('appeal')
        .setDescription('Submit a ban appeal')
        .addStringOption(option => option.setName('server_id').setDescription('Server ID you were banned from').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Why should you be unbanned?').setRequired(true)),
    new SlashCommandBuilder()
        .setName('appeals')
        .setDescription('View and manage ban appeals')
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Action to take')
                .setRequired(false)
                .addChoices(
                    { name: 'View All', value: 'view' },
                    { name: 'Approve', value: 'approve' },
                    { name: 'Deny', value: 'deny' }
                ))
        .addIntegerOption(option => option.setName('appeal_id').setDescription('Appeal ID (for approve/deny)').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
];

async function registerSlashCommands() {
    if (!process.env.CLIENT_ID) {
        console.warn('CLIENT_ID is not set. Slash commands will not be registered.');
        return;
    }
    const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
    try {
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands.map(cmd => cmd.toJSON()) }
        );
        console.log('Slash commands registered.');
    } catch (err) {
        console.error('Error registering slash commands:', err);
    }
}

if (process.env.BOT_TOKEN) {
    registerSlashCommands();
}


const db = require('./db');
const { askAI } = require('./ai');
const rep = require('./rep');
const { generateRepCard } = require('./repCard');

// Require customCommands for custom command handling
const customCommands = require('./custom_commands');

// Premium tracking cache
let premiumCache = new Map(); // guild_id -> { premium: boolean, tier: string, expires: timestamp }

// Helper: Check if guild has active premium
async function checkPremium(guildId) {
    // Check cache first (expires after 5 minutes)
    const cached = premiumCache.get(guildId);
    if (cached && Date.now() < cached.expires) {
        return cached;
    }
    
    try {
        const result = await db.query(
            'SELECT tier, status, expires_at FROM premium_subscriptions WHERE guild_id = $1',
            [guildId]
        );
        
        let premiumData = { premium: false, tier: null };
        
        if (result.rows.length > 0) {
            const sub = result.rows[0];
            const isActive = sub.status === 'active' && 
                           (!sub.expires_at || new Date(sub.expires_at) > new Date());
            
            if (isActive) {
                premiumData = { premium: true, tier: sub.tier };
            }
        }
        
        // Cache for 5 minutes
        premiumCache.set(guildId, { ...premiumData, expires: Date.now() + 300000 });
        return premiumData;
    } catch (err) {
        console.error('Premium check error:', err);
        return { premium: false, tier: null };
    }
}

// Helper: Get premium feature value
async function getPremiumFeature(guildId, feature, defaultValue = null) {
    try {
        const result = await db.query(
            `SELECT ${feature} FROM premium_features WHERE guild_id = $1`,
            [guildId]
        );
        
        if (result.rows.length > 0 && result.rows[0][feature] !== null) {
            return result.rows[0][feature];
        }
    } catch (err) {
        console.error(`Error fetching premium feature ${feature}:`, err);
    }
    
    return defaultValue;
}

// Helper: Get premium embed color
async function getPremiumEmbedColor(guildId, defaultColor = 0x5865F2) {
    const customColor = await getPremiumFeature(guildId, 'embed_color');
    if (customColor) {
        return parseInt(customColor.replace('#', ''), 16);
    }
    return defaultColor;
}

// Helper: get user's rep card background color
async function getUserBgColor(userId) {
    await db.query(`CREATE TABLE IF NOT EXISTS user_rep_settings (user_id VARCHAR(32) PRIMARY KEY, background_color VARCHAR(16))`);
    const res = await db.query('SELECT background_color FROM user_rep_settings WHERE user_id = $1', [userId]);
    const colorMap = {
        blue: '#3498db',
        red: '#e74c3c',
        black: '#23272A',
        white: '#ecf0f1',
        green: '#2ecc71',
        purple: '#9b59b6',
        orange: '#e67e22'
    };
    if (res.rows.length && res.rows[0].background_color && colorMap[res.rows[0].background_color]) {
        return colorMap[res.rows[0].background_color];
    }
    return '#23272A'; // default black
}
    // Set rep card background color

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.AutoModerationExecution
    ],
    partials: [Partials.Channel, Partials.Message]
});

// Integrated HTTP server (health check + optional dashboard)
const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        uptime: process.uptime(),
        botReady: client.isReady(),
        timestamp: new Date().toISOString()
    });
});

app.get('/', (req, res) => {
    res.json({ 
        status: 'ok', 
        uptime: process.uptime(),
        botReady: client.isReady(),
        timestamp: new Date().toISOString(),
        message: 'StatusSync Bot is running'
    });
});

// Optional dashboard (if ENABLE_DASHBOARD=true)
if (process.env.ENABLE_DASHBOARD === 'true') {
    app.use(session({
        secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
        resave: false,
        saveUninitialized: false,
        cookie: { 
            secure: false,
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        }
    }));
    
    // Setup Discord OAuth2
    const setupAuth = require('./dashboard/auth');
    const { requireAuth } = setupAuth(app, client);
    
    app.use('/dashboard', express.static(path.join(__dirname, 'dashboard')));
    
    const apiRouter = require('./dashboard/api');
    apiRouter.setClient(client);
    apiRouter.setAuth(requireAuth); // Pass auth middleware to API
    app.use('/dashboard/api', apiRouter);
    
    // Setup premium/payment routes
    const premiumRouter = require('./dashboard/premium');
    premiumRouter.init(requireAuth);
    app.use('/dashboard/premium', premiumRouter);
    
    app.get('/dash', (req, res) => res.redirect('/dashboard/frontend.html'));
    
    console.log('✅ Dashboard enabled with Discord OAuth2');
    if (process.env.STRIPE_SECRET_KEY) {
        console.log('💳 Stripe payments enabled');
    }
}

app.listen(PORT, () => {
    console.log(`✅ HTTP server listening on port ${PORT}`);
    if (process.env.ENABLE_DASHBOARD === 'true') {
        console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard/frontend.html`);
    }
});

    // === BUMP REMINDER CHECKER (runs every minute) ===
    setInterval(async () => {
        try {
            await ensureBumpRemindersTable();
            const now = Date.now();
            
            // Find all servers with reminders due
            const result = await db.query(
                'SELECT * FROM bump_reminders WHERE next_reminder > 0 AND next_reminder <= $1',
                [now.toString()]
            );
            
            for (const config of result.rows) {
                try {
                    const guild = client.guilds.cache.get(config.guild_id);
                    if (!guild) continue;
                    
                    const channel = guild.channels.cache.get(config.channel_id);
                    if (!channel || !channel.isTextBased()) continue;
                    
                    const rolePing = config.role_id ? `<@&${config.role_id}> ` : '';
                    
                    await channel.send({
                        content: rolePing,
                        embeds: [{
                            color: 0x3498db,
                            title: '⏰ Bump Reminder',
                            description: `It's time to bump the server!\n\nUse \`/bump\` to bump this server on Disboard.`,
                            timestamp: new Date()
                        }]
                    });
                    
                    // Reset reminder time
                    await db.query(
                        'UPDATE bump_reminders SET next_reminder = 0 WHERE guild_id = $1',
                        [config.guild_id]
                    );
                } catch (err) {
                    console.error(`Error sending bump reminder for guild ${config.guild_id}:`, err);
                }
            }
        } catch (err) {
            console.error('Error checking bump reminders:', err);
        }
    }, 60000); // Check every minute

    // Handle slash commands
    client.on('interactionCreate', async (interaction) => {
                        // /resetweeklyxp command (admin only)
                        if (interaction.commandName === 'resetweeklyxp') {
                            if (!interaction.member.permissions.has('Administrator')) {
                                await interaction.reply({ content: 'You need Administrator permission to use this command.', flags: 64 });
                                return;
                            }
                            try {
                                await db.query('UPDATE user_xp_weekly SET xp = 0');
                                await interaction.reply({ content: 'Weekly XP has been reset for all users.', flags: 64 });
                            } catch (err) {
                                console.error(err);
                                await interaction.reply({ content: 'Error resetting weekly XP: ' + err.message, flags: 64 });
                            }
                            return;
                        }
                // /imgsay command
                if (interaction.commandName === 'imgsay') {
                    const handleImgSay = require('./imgsay-handler');
                    await handleImgSay(interaction);
                    return;
                }
        // /negrep command (negative rep)
        if (interaction.commandName === 'negrep') {
            if (!interaction.member.permissions.has('Administrator')) {
                await interaction.reply({ content: 'You need Administrator permission to use this command.', flags: 64 });
                return;
            }
            const user = interaction.options.getUser('user');
            const amount = interaction.options.getInteger('amount') ?? -1;
            const validAmounts = [-1, -2];
            if (!user) {
                await interaction.reply({ content: 'You must specify a user to give neg rep to!', flags: 64 });
                return;
            }
            if (!validAmounts.includes(amount)) {
                await interaction.reply({ content: 'Amount must be -1 or -2', flags: 64 });
                return;
            }
            if (user.id === interaction.user.id) {
                await interaction.reply({ content: 'You cannot neg rep yourself!', flags: 64 });
                return;
            }
            // Limit: 2 rep actions per 12 hours
            const now = new Date();
            const since = new Date(now.getTime() - 12 * 60 * 60 * 1000);
            await db.query(`CREATE TABLE IF NOT EXISTS rep_give_log (giver_id VARCHAR(32), time TIMESTAMP)`);
            const logRes = await db.query('SELECT COUNT(*) FROM rep_give_log WHERE giver_id = $1 AND time > $2', [interaction.user.id, since]);
            const repsLeft = Math.max(0, 2 - parseInt(logRes.rows[0].count));
            if (repsLeft <= 0) {
                await interaction.reply({ content: 'You can only give rep 2 times every 12 hours.', flags: 64 });
                return;
            }
            if (Math.abs(amount) > repsLeft) {
                await interaction.reply({ content: `You only have ${repsLeft} rep action${repsLeft === 1 ? '' : 's'} left.`, flags: 64 });
                return;
            }
            let displayName = user.username;
            if (interaction.guild) {
                const member = await interaction.guild.members.fetch(user.id).catch(() => null);
                if (member && member.displayName) displayName = member.displayName;
            }
            try {
                await db.query(`INSERT INTO user_rep (user_id, rep) VALUES ($1, $2)
                    ON CONFLICT (user_id) DO UPDATE SET rep = user_rep.rep + $2`, [user.id, amount]);
                for (let i = 0; i < Math.abs(amount); i++) {
                    await db.query('INSERT INTO rep_give_log (giver_id, time) VALUES ($1, $2)', [interaction.user.id, now]);
                }
                const result = await db.query('SELECT rep FROM user_rep WHERE user_id = $1', [user.id]);
                const newRep = result.rows.length ? result.rows[0].rep : amount;
                const embed = {
                    color: 0xff0000,
                    title: `${displayName} now has ${newRep} rep!`,
                    description: `Rep change: ${amount}`,
                    thumbnail: { url: user.displayAvatarURL ? user.displayAvatarURL() : user.avatarURL },
                };
                await interaction.reply({ embeds: [embed] });
            } catch (err) {
                console.error(err);
                await interaction.reply({ content: 'Error updating rep: ' + err.message, flags: 64 });
            }
            return;
        }
    // /ask command (AI Q&A)
    if (interaction.commandName === 'ask') {
        const question = interaction.options.getString('question');
        await interaction.deferReply();
        try {
            const answer = await askAI(question);
            await interaction.editReply({ content: answer });
        } catch (err) {
            console.error(err);
            await interaction.editReply({ content: 'AI error: ' + err.message });
        }
        return;
    }
    // /starboardleaderboard command
    if (interaction.commandName === 'starboardleaderboard') {
        await ensureStarboardTable();
        try {
            // Top users
            const userRes = await db.query('SELECT author_id, COUNT(*) as count FROM starboard_posts GROUP BY author_id ORDER BY count DESC LIMIT 10');
            // Top messages
            const msgRes = await db.query('SELECT message_id, author_id, stars, url, content FROM starboard_posts ORDER BY stars DESC LIMIT 5');
            let userLines = [];
            if (userRes.rows.length) {
                const members = await interaction.guild.members.fetch();
                userLines = userRes.rows.map((row, i) => {
                    let member = members.get(row.author_id);
                    let name = member ? member.displayName : `<@${row.author_id}>`;
                    return `#${i+1} - ${name}: **${row.count}** starboarded messages`;
                });
            } else {
                userLines = ['No starboarded users yet.'];
            }
            let msgLines = [];
            if (msgRes.rows.length) {
                msgLines = msgRes.rows.map((row, i) => {
                    let preview = row.content ? row.content.slice(0, 40).replace(/\n/g, ' ') : '[No text]';
                    return `#${i+1} - [Jump](${row.url}) by <@${row.author_id}> (**${row.stars}** stars): ${preview}`;
                });
            } else {
                msgLines = ['No starboarded messages yet.'];
            }
            const embed = {
                color: 0xffd700,
                title: 'Starboard Leaderboard',
                fields: [
                    { name: 'Top Users', value: userLines.join('\n') },
                    { name: 'Top Messages', value: msgLines.join('\n') }
                ]
            };
            await interaction.reply({ embeds: [embed] });
        } catch (err) {
            console.error(err);
            await interaction.reply({ content: 'Error fetching starboard leaderboard: ' + err.message, flags: 64 });
        }
        return;
    }
    const { commandName } = interaction;
    // /setstarboard command (admin only)
    if (commandName === 'setstarboard') {
            if (!interaction.member.permissions.has('Administrator')) {
                await interaction.reply({ content: 'You need Administrator permission to use this command.', flags: 64 });
                return;
            }
            const channel = interaction.options.getChannel('channel');
            const emoji = interaction.options.getString('emoji') || '⭐';
            const threshold = interaction.options.getInteger('threshold') || 3;
            if (!channel.isTextBased || !channel.isTextBased()) {
                await interaction.reply({ content: 'Please select a text channel.', flags: 64 });
                return;
            }
            await db.query(`CREATE TABLE IF NOT EXISTS starboard_settings (guild_id VARCHAR(32) PRIMARY KEY, channel_id VARCHAR(32), emoji TEXT, threshold INTEGER)`);
            await db.query('INSERT INTO starboard_settings (guild_id, channel_id, emoji, threshold) VALUES ($1, $2, $3, $4) ON CONFLICT (guild_id) DO UPDATE SET channel_id = $2, emoji = $3, threshold = $4', [interaction.guild.id, channel.id, emoji, threshold]);
            await interaction.reply({ content: `Starboard configured! Channel: <#${channel.id}>, Emoji: ${emoji}, Threshold: ${threshold}`, flags: 64 });
            return;
        }
    // /teststarboard command (admin only)
    if (commandName === 'teststarboard') {
            if (!interaction.member.permissions.has('Administrator')) {
                await interaction.reply({ content: 'You need Administrator permission to use this command.', flags: 64 });
                return;
            }
            const input = interaction.options.getString('message');
            // Parse message link or ID
            let channelId, messageId;
            const linkMatch = input.match(/https:\/\/discord.com\/channels\/\d+\/(\d+)\/(\d+)/);
            if (linkMatch) {
                channelId = linkMatch[1];
                messageId = linkMatch[2];
            } else if (/^\d{17,}$/.test(input)) {
                // If just an ID, require channel context
                await interaction.reply({ content: 'Please provide a full message link (right-click > Copy Message Link).', flags: 64 });
                return;
            } else {
                await interaction.reply({ content: 'Invalid message link or ID.', flags: 64 });
                return;
            }
            try {
                const channel = await interaction.guild.channels.fetch(channelId);
                if (!channel || !channel.isTextBased || !channel.isTextBased()) throw new Error('Channel not found or not text-based');
                const msg = await channel.messages.fetch(messageId);
                if (!msg) throw new Error('Message not found');
                // Get starboard settings from DB
                await db.query(`CREATE TABLE IF NOT EXISTS starboard_settings (guild_id VARCHAR(32) PRIMARY KEY, channel_id VARCHAR(32), emoji TEXT, threshold INTEGER)`);
                const settingsRes = await db.query('SELECT * FROM starboard_settings WHERE guild_id = $1', [interaction.guild.id]);
                if (!settingsRes.rows.length) throw new Error('No starboard settings found');
                const { channel_id, emoji, threshold } = settingsRes.rows[0];
                // Find the configured starboard channel
                let starboard = interaction.guild.channels.cache.get(channel_id);
                // Debug: log channel info
                console.log('[Starboard/Test] Looking for channel_id:', channel_id);
                if (!starboard) {
                    console.log('[Starboard/Test] Channel not found in cache. Available text channels:');
                    interaction.guild.channels.cache.filter(c => c.isTextBased && c.isTextBased()).forEach(c => {
                        console.log(`- ${c.name} (${c.id})`);
                    });
                } else {
                    console.log('[Starboard/Test] Found channel:', starboard.name, starboard.id);
                }
                if (!starboard || !starboard.isTextBased || !starboard.isTextBased()) throw new Error('No #starboard channel found');
                // Prevent duplicate posts
                const fetched = await starboard.messages.fetch({ limit: 100 });
                if (fetched.some(m => m.embeds[0]?.footer?.text?.includes(msg.id))) {
                    await interaction.reply({ content: 'This message is already on the starboard.', flags: 64 });
                    return;
                }
                // Build embed (same as starboard)
                const embed = {
                    color: 0xffd700,
                    author: {
                        name: msg.author.tag,
                        icon_url: msg.author.displayAvatarURL()
                    },
                    description: msg.content || '[No text]',
                    fields: [
                        { name: 'Jump to Message', value: `[Go to message](${msg.url})` }
                    ],
                    footer: { text: `${emoji} TEST | ${msg.id}` },
                    timestamp: new Date(msg.createdTimestamp)
                };
                if (msg.attachments.size > 0) {
                    const img = msg.attachments.find(a => a.contentType && a.contentType.startsWith('image/'));
                    if (img) embed.image = { url: img.url };
                }
                await starboard.send({ embeds: [embed] });
                await interaction.reply({ content: 'Message posted to starboard for testing!', flags: 64 });
            } catch (err) {
                console.error('Test starboard error:', err);
                await interaction.reply({ content: 'Error: ' + err.message, flags: 64 });
            }
            return;
        }
        if (commandName === 'xpleaderboard') {
            try {
                const members = await interaction.guild.members.fetch();
                const res = await db.query('SELECT user_id, xp FROM user_xp ORDER BY xp DESC LIMIT 10');
                if (!res.rows.length) {
                    await interaction.reply('No XP data found.');
                    return;
                }
                const leaderboard = await Promise.all(res.rows.map(async (row, i) => {
                    let member = members.get(row.user_id);
                    let name = member ? member.displayName : `<@${row.user_id}>`;
                    return `#${i+1} - ${name}: **${row.xp} XP**`;
                }));
                const embed = {
                    color: 0x3498db,
                    title: 'All-Time XP Leaderboard',
                    description: leaderboard.join('\n'),
                };
                await interaction.reply({ embeds: [embed] });
            } catch (err) {
                console.error(err);
                await interaction.reply({ content: 'Error fetching XP leaderboard: ' + err.message, flags: 64 });
            }
            return;
        }
        if (commandName === 'xpweekly') {
            try {
                const members = await interaction.guild.members.fetch();
                const weekStart = getCurrentWeekStart();
                const res = await db.query('SELECT user_id, xp FROM user_xp_weekly WHERE week_start = $1 ORDER BY xp DESC LIMIT 10', [weekStart]);
                if (!res.rows.length) {
                    await interaction.reply('No weekly XP data found.');
                    return;
                }
                const leaderboard = await Promise.all(res.rows.map(async (row, i) => {
                    let member = members.get(row.user_id);
                    let name = member ? member.displayName : `<@${row.user_id}>`;
                    return `#${i+1} - ${name}: **${row.xp} XP**`;
                }));
                const embed = {
                    color: 0x2ecc71,
                    title: 'Weekly XP Leaderboard',
                    description: leaderboard.join('\n'),
                    footer: { text: 'Resets every Monday 11am EST' }
                };
                await interaction.reply({ embeds: [embed] });
            } catch (err) {
                console.error(err);
                await interaction.reply({ content: 'Error fetching weekly XP leaderboard: ' + err.message, flags: 64 });
            }
            return;
        }
        if (commandName === 'repleaderboard') {
            // Show top 10 users by rep in this server
            try {
                // Get all members in the guild
                const members = await interaction.guild.members.fetch();
                // Get top 10 rep users from DB
                const res = await db.query('SELECT user_id, rep FROM user_rep ORDER BY rep DESC LIMIT 10');
                if (!res.rows.length) {
                    await interaction.reply('No reputation data found.');
                    return;
                }
                // Map user IDs to display names (or mention if not found)
                const leaderboard = await Promise.all(res.rows.map(async (row, i) => {
                    let member = members.get(row.user_id);
                    let name = member ? member.displayName : `<@${row.user_id}>`;
                    return `#${i+1} - ${name}: **${row.rep}**`;
                }));
                const embed = {
                    color: 0xf1c40f,
                    title: 'Rep Leaderboard',
                    description: leaderboard.join('\n'),
                };
                await interaction.reply({ embeds: [embed] });
            } catch (err) {
                console.error(err);
                await interaction.reply({ content: 'Error fetching leaderboard: ' + err.message, flags: 64 });
            }
            return;
        }
        if (!interaction.isCommand()) return;
        // Set welcome channel
        if (commandName === 'setwelcome') {
            if (!interaction.member.permissions.has('Administrator')) {
                await interaction.reply({ content: 'You need Administrator permission to set the welcome channel.', flags: 64 });
                return;
            }
            const channel = interaction.options.getChannel('channel');
            if (!channel || channel.type !== 0) { // 0 = GUILD_TEXT
                await interaction.reply({ content: 'Please select a text channel.', flags: 64 });
                return;
            }
            await db.query(`CREATE TABLE IF NOT EXISTS welcome_channels (guild_id VARCHAR(32) PRIMARY KEY, channel_id VARCHAR(32))`);
            await db.query('INSERT INTO welcome_channels (guild_id, channel_id) VALUES ($1, $2) ON CONFLICT (guild_id) DO UPDATE SET channel_id = $2', [interaction.guild.id, channel.id]);
            await interaction.reply(`Welcome channel set to <#${channel.id}>!`);
            return;
        }

        // List custom commands
        if (commandName === 'listcmds') {
            try {
                const names = await customCommands.listCommands();
                if (!names.length) {
                    await interaction.reply('No custom commands found.');
                } else {
                    await interaction.reply('Custom commands: ' + names.map(n => '`' + n + '`').join(', '));
                }
            } catch (err) {
                console.error(err);
                await interaction.reply({ content: 'Error fetching custom commands: ' + err.message, flags: 64 });
            }
            return;
        }

        // Add custom command
        if (commandName === 'addcmd') {
            if (!interaction.member.permissions.has('Administrator')) {
                await interaction.reply({ content: 'You need Administrator permission to add custom commands.', flags: 64 });
                return;
            }
            const name = interaction.options.getString('name').toLowerCase();
            const response = interaction.options.getString('response');
            try {
                await customCommands.addCommand(name, response);
                await interaction.reply(`Custom command /${name} added!`);
            } catch (err) {
                console.error(err);
                await interaction.reply({ content: 'Error adding custom command: ' + err.message, flags: 64 });
            }
            return;
        }
        // Remove custom command
        if (commandName === 'removecmd') {
            if (!interaction.member.permissions.has('Administrator')) {
                await interaction.reply({ content: 'You need Administrator permission to remove custom commands.', flags: 64 });
                return;
            }
            const name = interaction.options.getString('name').toLowerCase();
            try {
                // Check if command exists
                const exists = await customCommands.getCommand(name);
                if (!exists) {
                    await interaction.reply({ content: `Custom command /${name} does not exist.`, flags: 64 });
                    return;
                }
                await customCommands.removeCommand(name);
                await interaction.reply(`Custom command /${name} removed!`);
            } catch (err) {
                console.error(err);
                await interaction.reply({ content: 'Error removing custom command: ' + err.message, flags: 64 });
            }
            return;
        }

        if (commandName === 'setrepbg') {
            const color = interaction.options.getString('color');
            const allowed = ['blue', 'red', 'black', 'white', 'green', 'purple', 'orange'];
            if (!allowed.includes(color)) {
                await interaction.reply({ content: 'Invalid color. Please choose from the provided options.', flags: 64 });
                return;
            }
            await db.query(`CREATE TABLE IF NOT EXISTS user_rep_settings (user_id VARCHAR(32) PRIMARY KEY, background_color VARCHAR(16))`);
            await db.query('INSERT INTO user_rep_settings (user_id, background_color) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET background_color = $2', [interaction.user.id, color]);
            await interaction.reply({ content: `Your rep card background color has been set to ${color}!`, flags: 64 });
            return;
        }

        // === MODERATION COMMANDS ===
        
        // Helper function to log moderation actions to database and channel
        async function logModAction(guildId, userId, moderatorId, action, reason, expiresAt = null) {
            // Insert into mod_cases
            const caseRes = await db.query(
                `INSERT INTO mod_cases (user_id, moderator_id, action, reason, created_at, expires_at, guild_id)
                 VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6) RETURNING case_id`,
                [userId, moderatorId, action, reason || 'No reason provided', expiresAt, guildId]
            );
            const caseId = caseRes.rows[0].case_id;
            
            // Insert into mod_logs
            await db.query(
                `INSERT INTO mod_logs (case_id, user_id, moderator_id, action, reason, guild_id)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [caseId, userId, moderatorId, action, reason || 'No reason provided', guildId]
            );
            
            return caseId;
        }

        async function sendModLog(guild, caseId, user, moderator, action, reason, duration = null) {
            try {
                await db.query(`CREATE TABLE IF NOT EXISTS mod_log_channels (guild_id VARCHAR(32) PRIMARY KEY, channel_id VARCHAR(32))`);
                const res = await db.query('SELECT channel_id FROM mod_log_channels WHERE guild_id = $1', [guild.id]);
                if (!res.rows.length) return;
                
                const channel = guild.channels.cache.get(res.rows[0].channel_id);
                if (!channel || !channel.isTextBased()) return;
                
                const logoUrl = process.env.DASHBOARD_URL || process.env.CALLBACK_URL?.replace('/dashboard/auth/callback', '') || 'https://statussync-production.up.railway.app';
                
                const embed = {
                    color: action === 'warn' ? 0xffa500 : action === 'timeout' ? 0xff6b6b : action === 'kick' ? 0xff4757 : action === 'ban' ? 0xff0000 : 0x00ff00,
                    title: `Case #${caseId} | ${action.toUpperCase()}`,
                    thumbnail: { url: `${logoUrl}/logo.svg` },
                    fields: [
                        { name: 'User', value: `<@${user.id}> (${user.tag})`, inline: true },
                        { name: 'Moderator', value: `<@${moderator.id}>`, inline: true },
                        { name: 'Reason', value: reason || 'No reason provided', inline: false }
                    ],
                    timestamp: new Date(),
                    footer: { text: `User ID: ${user.id}` }
                };
                
                if (duration) {
                    embed.fields.push({ name: 'Duration', value: duration, inline: true });
                }
                
                await channel.send({ embeds: [embed] });
            } catch (err) {
                console.error('Error sending mod log:', err);
            }
        }

        if (commandName === 'warn') {
            const user = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason') || 'No reason provided';
            
            if (!user) {
                await interaction.reply({ content: 'User not found.', flags: 64 });
                return;
            }
            
            if (user.id === interaction.user.id) {
                await interaction.reply({ content: 'You cannot warn yourself!', flags: 64 });
                return;
            }
            
            if (user.bot) {
                await interaction.reply({ content: 'You cannot warn bots!', flags: 64 });
                return;
            }
            
            try {
                const caseId = await logModAction(interaction.guild.id, user.id, interaction.user.id, 'warn', reason);
                await sendModLog(interaction.guild, caseId, user, interaction.user, 'warn', reason);
                
                // Try to DM the user
                try {
                    await user.send(`You have been warned in **${interaction.guild.name}** for: ${reason}`);
                } catch (err) {
                    console.log('Could not DM user:', err.message);
                }
                
                await interaction.reply({ content: `⚠️ **${user.tag}** has been warned. (Case #${caseId})`, flags: 64 });
            } catch (err) {
                console.error(err);
                await interaction.reply({ content: 'Error warning user: ' + err.message, flags: 64 });
            }
            return;
        }

        if (commandName === 'timeout') {
            const user = interaction.options.getUser('user');
            const duration = interaction.options.getInteger('duration');
            const reason = interaction.options.getString('reason') || 'No reason provided';
            
            if (!user) {
                await interaction.reply({ content: 'User not found.', flags: 64 });
                return;
            }
            
            if (duration < 1 || duration > 40320) { // Max 28 days (40320 minutes)
                await interaction.reply({ content: 'Duration must be between 1 minute and 40320 minutes (28 days).', flags: 64 });
                return;
            }
            
            if (user.id === interaction.user.id) {
                await interaction.reply({ content: 'You cannot timeout yourself!', flags: 64 });
                return;
            }
            
            if (user.bot) {
                await interaction.reply({ content: 'You cannot timeout bots!', flags: 64 });
                return;
            }
            
            try {
                const member = await interaction.guild.members.fetch(user.id);
                if (!member) {
                    await interaction.reply({ content: 'Member not found in this server.', flags: 64 });
                    return;
                }
                
                // Check role hierarchy
                if (member.roles.highest.position >= interaction.member.roles.highest.position) {
                    await interaction.reply({ content: 'You cannot timeout this user due to role hierarchy.', flags: 64 });
                    return;
                }
                
                const expiresAt = new Date(Date.now() + duration * 60 * 1000);
                await member.timeout(duration * 60 * 1000, reason);
                
                const caseId = await logModAction(interaction.guild.id, user.id, interaction.user.id, 'timeout', reason, expiresAt);
                await sendModLog(interaction.guild, caseId, user, interaction.user, 'timeout', reason, `${duration} minutes`);
                
                // Try to DM the user
                try {
                    await user.send(`You have been timed out in **${interaction.guild.name}** for ${duration} minutes. Reason: ${reason}`);
                } catch (err) {
                    console.log('Could not DM user:', err.message);
                }
                
                await interaction.reply({ content: `🔇 **${user.tag}** has been timed out for ${duration} minutes. (Case #${caseId})`, flags: 64 });
            } catch (err) {
                console.error(err);
                await interaction.reply({ content: 'Error timing out user: ' + err.message, flags: 64 });
            }
            return;
        }

        if (commandName === 'kick') {
            const user = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason') || 'No reason provided';
            
            if (!user) {
                await interaction.reply({ content: 'User not found.', flags: 64 });
                return;
            }
            
            if (user.id === interaction.user.id) {
                await interaction.reply({ content: 'You cannot kick yourself!', flags: 64 });
                return;
            }
            
            if (user.bot) {
                await interaction.reply({ content: 'You cannot kick bots!', flags: 64 });
                return;
            }
            
            try {
                const member = await interaction.guild.members.fetch(user.id);
                if (!member) {
                    await interaction.reply({ content: 'Member not found in this server.', flags: 64 });
                    return;
                }
                
                // Check role hierarchy
                if (member.roles.highest.position >= interaction.member.roles.highest.position) {
                    await interaction.reply({ content: 'You cannot kick this user due to role hierarchy.', flags: 64 });
                    return;
                }
                
                const caseId = await logModAction(interaction.guild.id, user.id, interaction.user.id, 'kick', reason);
                
                // Try to DM the user before kicking
                try {
                    await user.send(`You have been kicked from **${interaction.guild.name}**. Reason: ${reason}`);
                } catch (err) {
                    console.log('Could not DM user:', err.message);
                }
                
                await member.kick(reason);
                await sendModLog(interaction.guild, caseId, user, interaction.user, 'kick', reason);
                
                await interaction.reply({ content: `👢 **${user.tag}** has been kicked. (Case #${caseId})`, flags: 64 });
            } catch (err) {
                console.error(err);
                await interaction.reply({ content: 'Error kicking user: ' + err.message, flags: 64 });
            }
            return;
        }

        if (commandName === 'ban') {
            const user = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason') || 'No reason provided';
            const deleteMessages = interaction.options.getInteger('delete_messages') || 0;
            
            if (!user) {
                await interaction.reply({ content: 'User not found.', flags: 64 });
                return;
            }
            
            if (deleteMessages < 0 || deleteMessages > 7) {
                await interaction.reply({ content: 'Delete messages days must be between 0 and 7.', flags: 64 });
                return;
            }
            
            if (user.id === interaction.user.id) {
                await interaction.reply({ content: 'You cannot ban yourself!', flags: 64 });
                return;
            }
            
            if (user.bot) {
                await interaction.reply({ content: 'You cannot ban bots!', flags: 64 });
                return;
            }
            
            try {
                const member = await interaction.guild.members.fetch(user.id).catch(() => null);
                
                // Check role hierarchy if member exists
                if (member && member.roles.highest.position >= interaction.member.roles.highest.position) {
                    await interaction.reply({ content: 'You cannot ban this user due to role hierarchy.', flags: 64 });
                    return;
                }
                
                const caseId = await logModAction(interaction.guild.id, user.id, interaction.user.id, 'ban', reason);
                
                // Try to DM the user before banning
                try {
                    await user.send(`You have been banned from **${interaction.guild.name}**. Reason: ${reason}`);
                } catch (err) {
                    console.log('Could not DM user:', err.message);
                }
                
                await interaction.guild.members.ban(user, { reason, deleteMessageSeconds: deleteMessages * 24 * 60 * 60 });
                await sendModLog(interaction.guild, caseId, user, interaction.user, 'ban', reason);
                
                await interaction.reply({ content: `🔨 **${user.tag}** has been banned. (Case #${caseId})`, flags: 64 });
            } catch (err) {
                console.error(err);
                await interaction.reply({ content: 'Error banning user: ' + err.message, flags: 64 });
            }
            return;
        }

        if (commandName === 'unban') {
            const userId = interaction.options.getString('user_id');
            const reason = interaction.options.getString('reason') || 'No reason provided';
            
            if (!/^\d{17,}$/.test(userId)) {
                await interaction.reply({ content: 'Invalid user ID format.', flags: 64 });
                return;
            }
            
            try {
                const ban = await interaction.guild.bans.fetch(userId).catch(() => null);
                if (!ban) {
                    await interaction.reply({ content: 'This user is not banned.', flags: 64 });
                    return;
                }
                
                await interaction.guild.members.unban(userId, reason);
                const caseId = await logModAction(interaction.guild.id, userId, interaction.user.id, 'unban', reason);
                await sendModLog(interaction.guild, caseId, ban.user, interaction.user, 'unban', reason);
                
                await interaction.reply({ content: `✅ **${ban.user.tag}** has been unbanned. (Case #${caseId})`, flags: 64 });
            } catch (err) {
                console.error(err);
                await interaction.reply({ content: 'Error unbanning user: ' + err.message, flags: 64 });
            }
            return;
        }

        if (commandName === 'case') {
            const caseId = interaction.options.getInteger('case_id');
            
            try {
                const res = await db.query(
                    'SELECT * FROM mod_cases WHERE case_id = $1 AND guild_id = $2',
                    [caseId, interaction.guild.id]
                );
                
                if (!res.rows.length) {
                    await interaction.reply({ content: 'Case not found.', flags: 64 });
                    return;
                }
                
                const modCase = res.rows[0];
                const user = await client.users.fetch(modCase.user_id).catch(() => ({ tag: 'Unknown User', id: modCase.user_id }));
                const moderator = await client.users.fetch(modCase.moderator_id).catch(() => ({ tag: 'Unknown Moderator', id: modCase.moderator_id }));
                
                const embed = {
                    color: modCase.status === 'closed' ? 0x2ecc71 : 0x3498db,
                    title: `Case #${caseId} ${modCase.status === 'closed' ? '(Closed)' : ''}`,
                    fields: [
                        { name: 'User', value: `<@${user.id}> (${user.tag})`, inline: true },
                        { name: 'Moderator', value: `<@${moderator.id}>`, inline: true },
                        { name: 'Action', value: modCase.action, inline: true },
                        { name: 'Reason', value: modCase.reason || 'No reason provided', inline: false },
                        { name: 'Created', value: new Date(modCase.created_at).toLocaleString(), inline: true },
                        { name: 'Status', value: modCase.status, inline: true }
                    ],
                    footer: { text: `User ID: ${user.id}` }
                };
                
                if (modCase.expires_at) {
                    embed.fields.push({ name: 'Expires', value: new Date(modCase.expires_at).toLocaleString(), inline: true });
                }
                
                // Add close info if closed
                if (modCase.status === 'closed' && modCase.closed_at) {
                    embed.fields.push({ name: 'Closed At', value: new Date(modCase.closed_at).toLocaleString(), inline: true });
                    if (modCase.closed_by) {
                        embed.fields.push({ name: 'Closed By', value: `<@${modCase.closed_by}>`, inline: true });
                    }
                    if (modCase.close_reason) {
                        embed.fields.push({ name: 'Close Reason', value: modCase.close_reason, inline: false });
                    }
                }
                
                await interaction.reply({ embeds: [embed], flags: 64 });
            } catch (err) {
                console.error(err);
                await interaction.reply({ content: 'Error fetching case: ' + err.message, flags: 64 });
            }
            return;
        }

        if (commandName === 'closecase') {
            const caseId = interaction.options.getInteger('case_id');
            const reason = interaction.options.getString('reason') || 'No reason provided';
            
            try {
                // Ensure closed columns exist (migration for existing tables)
                await db.query(`
                    ALTER TABLE mod_cases 
                    ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP,
                    ADD COLUMN IF NOT EXISTS closed_by VARCHAR(32),
                    ADD COLUMN IF NOT EXISTS close_reason TEXT
                `).catch(() => {}); // Ignore if already exists
                
                // Check if case exists
                const res = await db.query(
                    'SELECT * FROM mod_cases WHERE case_id = $1 AND guild_id = $2',
                    [caseId, interaction.guild.id]
                );
                
                if (!res.rows.length) {
                    await interaction.reply({ content: 'Case not found.', flags: 64 });
                    return;
                }
                
                const modCase = res.rows[0];
                
                // Check if already closed
                if (modCase.status === 'closed') {
                    await interaction.reply({ content: `Case #${caseId} is already closed.`, flags: 64 });
                    return;
                }
                
                // Update case to closed
                await db.query(
                    'UPDATE mod_cases SET status = $1, closed_at = NOW(), closed_by = $2, close_reason = $3 WHERE case_id = $4 AND guild_id = $5',
                    ['closed', interaction.user.id, reason, caseId, interaction.guild.id]
                );
                
                const embed = {
                    color: 0x2ecc71,
                    title: '✅ Case Closed',
                    description: `Case #${caseId} has been closed.`,
                    fields: [
                        { name: 'Closed By', value: `<@${interaction.user.id}>`, inline: true },
                        { name: 'Reason', value: reason, inline: false }
                    ],
                    timestamp: new Date()
                };
                
                await interaction.reply({ embeds: [embed] });
                
                // Log to mod log channel if configured
                await db.query(`CREATE TABLE IF NOT EXISTS mod_log_channels (guild_id VARCHAR(32) PRIMARY KEY, channel_id VARCHAR(32))`);
                const logRes = await db.query('SELECT channel_id FROM mod_log_channels WHERE guild_id = $1', [interaction.guild.id]);
                if (logRes.rows.length) {
                    const logChannel = interaction.guild.channels.cache.get(logRes.rows[0].channel_id);
                    if (logChannel && logChannel.isTextBased()) {
                        const user = await client.users.fetch(modCase.user_id).catch(() => ({ tag: 'Unknown User', id: modCase.user_id }));
                        const logEmbed = {
                            color: 0x2ecc71,
                            title: '📋 Case Closed',
                            fields: [
                                { name: 'Case ID', value: `#${caseId}`, inline: true },
                                { name: 'User', value: `<@${user.id}>`, inline: true },
                                { name: 'Original Action', value: modCase.action, inline: true },
                                { name: 'Closed By', value: `<@${interaction.user.id}>`, inline: true },
                                { name: 'Close Reason', value: reason, inline: false }
                            ],
                            timestamp: new Date()
                        };
                        await logChannel.send({ embeds: [logEmbed] });
                    }
                }
            } catch (err) {
                console.error(err);
                await interaction.reply({ content: 'Error closing case: ' + err.message, flags: 64 });
            }
            return;
        }

        if (commandName === 'cases') {
            const user = interaction.options.getUser('user');
            const statusFilter = interaction.options.getString('status') || 'all';
            
            if (!user) {
                await interaction.reply({ content: 'User not found.', flags: 64 });
                return;
            }
            
            try {
                let query = 'SELECT * FROM mod_cases WHERE user_id = $1 AND guild_id = $2';
                const params = [user.id, interaction.guild.id];
                
                if (statusFilter === 'open') {
                    query += ' AND closed_at IS NULL';
                } else if (statusFilter === 'closed') {
                    query += ' AND closed_at IS NOT NULL';
                }
                
                query += ' ORDER BY created_at DESC LIMIT 10';
                
                const res = await db.query(query, params);
                
                if (!res.rows.length) {
                    const statusText = statusFilter === 'all' ? '' : ` ${statusFilter}`;
                    await interaction.reply({ content: `No${statusText} cases found for **${user.tag}**.`, flags: 64 });
                    return;
                }
                
                const cases = res.rows.map(c => {
                    const statusEmoji = c.closed_at ? '🔒' : '🔓';
                    const closedInfo = c.closed_at ? ` (Closed: ${c.close_reason || 'No reason'})` : '';
                    return `${statusEmoji} **Case #${c.case_id}** - ${c.action} - ${new Date(c.created_at).toLocaleDateString()} - ${c.reason || 'No reason'}${closedInfo}`;
                }).join('\n');
                
                const statusTitle = statusFilter === 'all' ? '' : ` (${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)})`;
                
                const embed = {
                    color: 0x3498db,
                    title: `Cases for ${user.tag}${statusTitle}`,
                    description: cases,
                    footer: { text: `User ID: ${user.id} | Showing last 10 cases | 🔓 = Open | 🔒 = Closed` }
                };
                
                await interaction.reply({ embeds: [embed], flags: 64 });
            } catch (err) {
                console.error(err);
                await interaction.reply({ content: 'Error fetching cases: ' + err.message, flags: 64 });
            }
            return;
        }

        if (commandName === 'purge') {
            const count = interaction.options.getInteger('count');
            const targetUser = interaction.options.getUser('user');
            const containsText = interaction.options.getString('contains');
            const botsOnly = interaction.options.getBoolean('bots');
            
            if (count < 1 || count > 100) {
                await interaction.reply({ content: '❌ Count must be between 1 and 100.', flags: 64 });
                return;
            }
            
            await interaction.deferReply({ flags: 64 });
            
            try {
                // Fetch messages
                const messages = await interaction.channel.messages.fetch({ limit: Math.min(count + 50, 100) });
                
                // Filter messages
                let toDelete = messages.filter(m => {
                    // Skip messages older than 14 days (Discord limitation)
                    if (Date.now() - m.createdTimestamp > 14 * 24 * 60 * 60 * 1000) return false;
                    
                    // Filter by user
                    if (targetUser && m.author.id !== targetUser.id) return false;
                    
                    // Filter by text content
                    if (containsText && !m.content.toLowerCase().includes(containsText.toLowerCase())) return false;
                    
                    // Filter bots only
                    if (botsOnly && !m.author.bot) return false;
                    
                    return true;
                });
                
                // Limit to requested count
                toDelete = toDelete.first(count);
                
                if (toDelete.size === 0) {
                    await interaction.editReply({ content: '❌ No messages found matching the criteria.' });
                    return;
                }
                
                // Bulk delete
                const deleted = await interaction.channel.bulkDelete(toDelete, true);
                
                let filterInfo = '';
                if (targetUser) filterInfo += ` from ${targetUser.tag}`;
                if (containsText) filterInfo += ` containing "${containsText}"`;
                if (botsOnly) filterInfo += ' from bots';
                
                const confirmMsg = await interaction.editReply({ 
                    content: `✅ Deleted ${deleted.size} message(s)${filterInfo}.` 
                });
                
                // Auto-delete confirmation after 5 seconds
                setTimeout(() => confirmMsg.delete().catch(() => {}), 5000);
                
                // Log to mod log
                await db.query(`CREATE TABLE IF NOT EXISTS mod_log_channels (guild_id VARCHAR(32) PRIMARY KEY, channel_id VARCHAR(32))`);
                const logRes = await db.query('SELECT channel_id FROM mod_log_channels WHERE guild_id = $1', [interaction.guild.id]);
                
                if (logRes.rows.length > 0) {
                    const logChannel = interaction.guild.channels.cache.get(logRes.rows[0].channel_id);
                    if (logChannel && logChannel.isTextBased()) {
                        const embed = {
                            color: 0xe74c3c,
                            title: '🗑️ Messages Purged',
                            fields: [
                                { name: 'Channel', value: `<#${interaction.channel.id}>`, inline: true },
                                { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
                                { name: 'Count', value: `${deleted.size}`, inline: true },
                                { name: 'Filters', value: filterInfo || 'None', inline: false }
                            ],
                            timestamp: new Date()
                        };
                        await logChannel.send({ embeds: [embed] });
                    }
                }
            } catch (err) {
                console.error(err);
                await interaction.editReply({ content: '❌ Error purging messages: ' + err.message });
            }
            return;
        }

        if (commandName === 'lock') {
            const channel = interaction.options.getChannel('channel') || interaction.channel;
            const reason = interaction.options.getString('reason') || 'No reason provided';
            
            if (!channel.isTextBased()) {
                await interaction.reply({ content: '❌ Please select a text channel.', flags: 64 });
                return;
            }
            
            try {
                await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                    SendMessages: false
                }, { reason: `Locked by ${interaction.user.tag}: ${reason}` });
                
                await interaction.reply({ 
                    content: `🔒 <#${channel.id}> has been locked.\n**Reason:** ${reason}` 
                });
                
                // Send message to locked channel
                if (channel.id !== interaction.channel.id) {
                    await channel.send({
                        embeds: [{
                            color: 0xe74c3c,
                            description: `🔒 This channel has been locked by ${interaction.user}.\n**Reason:** ${reason}`,
                            timestamp: new Date()
                        }]
                    });
                }
            } catch (err) {
                console.error(err);
                await interaction.reply({ content: '❌ Error locking channel: ' + err.message, flags: 64 });
            }
            return;
        }

        if (commandName === 'unlock') {
            const channel = interaction.options.getChannel('channel') || interaction.channel;
            
            if (!channel.isTextBased()) {
                await interaction.reply({ content: '❌ Please select a text channel.', flags: 64 });
                return;
            }
            
            try {
                await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                    SendMessages: null
                }, { reason: `Unlocked by ${interaction.user.tag}` });
                
                await interaction.reply({ 
                    content: `🔓 <#${channel.id}> has been unlocked.` 
                });
                
                // Send message to unlocked channel
                if (channel.id !== interaction.channel.id) {
                    await channel.send({
                        embeds: [{
                            color: 0x2ecc71,
                            description: `🔓 This channel has been unlocked by ${interaction.user}.`,
                            timestamp: new Date()
                        }]
                    });
                }
            } catch (err) {
                console.error(err);
                await interaction.reply({ content: '❌ Error unlocking channel: ' + err.message, flags: 64 });
            }
            return;
        }

        if (commandName === 'slowmode') {
            const seconds = interaction.options.getInteger('seconds');
            const channel = interaction.options.getChannel('channel') || interaction.channel;
            
            if (!channel.isTextBased()) {
                await interaction.reply({ content: '❌ Please select a text channel.', flags: 64 });
                return;
            }
            
            if (seconds < 0 || seconds > 21600) {
                await interaction.reply({ content: '❌ Slowmode must be between 0 and 21600 seconds (6 hours).', flags: 64 });
                return;
            }
            
            try {
                await channel.setRateLimitPerUser(seconds, `Set by ${interaction.user.tag}`);
                
                if (seconds === 0) {
                    await interaction.reply({ 
                        content: `⏱️ Slowmode disabled in <#${channel.id}>.` 
                    });
                } else {
                    const formatted = seconds >= 60 
                        ? `${Math.floor(seconds / 60)} minute(s) ${seconds % 60} second(s)`
                        : `${seconds} second(s)`;
                    
                    await interaction.reply({ 
                        content: `⏱️ Slowmode set to **${formatted}** in <#${channel.id}>.` 
                    });
                }
            } catch (err) {
                console.error(err);
                await interaction.reply({ content: '❌ Error setting slowmode: ' + err.message, flags: 64 });
            }
            return;
        }

        if (commandName === 'setmodlog') {
            const channel = interaction.options.getChannel('channel');
            
            if (!channel.isTextBased()) {
                await interaction.reply({ content: 'Please select a text channel.', flags: 64 });
                return;
            }
            
            try {
                await db.query(`CREATE TABLE IF NOT EXISTS mod_log_channels (guild_id VARCHAR(32) PRIMARY KEY, channel_id VARCHAR(32))`);
                await db.query(
                    'INSERT INTO mod_log_channels (guild_id, channel_id) VALUES ($1, $2) ON CONFLICT (guild_id) DO UPDATE SET channel_id = $2',
                    [interaction.guild.id, channel.id]
                );
                await interaction.reply({ content: `Moderation log channel set to <#${channel.id}>`, flags: 64 });
            } catch (err) {
                console.error(err);
                await interaction.reply({ content: 'Error setting mod log channel: ' + err.message, flags: 64 });
            }
            return;
        }

        if (commandName === 'setlogging') {
            const channel = interaction.options.getChannel('channel');
            
            if (!channel.isTextBased()) {
                await interaction.reply({ content: 'Please select a text channel.', flags: 64 });
                return;
            }
            
            try {
                await db.query(`CREATE TABLE IF NOT EXISTS logging_channels (guild_id VARCHAR(32) PRIMARY KEY, channel_id VARCHAR(32))`);
                await db.query(
                    'INSERT INTO logging_channels (guild_id, channel_id) VALUES ($1, $2) ON CONFLICT (guild_id) DO UPDATE SET channel_id = $2',
                    [interaction.guild.id, channel.id]
                );
                await interaction.reply({ content: `Logging channel set to <#${channel.id}>. Member joins and leaves will be logged here.`, flags: 64 });
            } catch (err) {
                console.error(err);
                await interaction.reply({ content: 'Error setting logging channel: ' + err.message, flags: 64 });
            }
            return;
        }

        if (commandName === 'dashboard') {
            const dashboardUrl = process.env.DASHBOARD_URL || process.env.CALLBACK_URL?.replace('/dashboard/auth/callback', '') || 'https://statussync-production.up.railway.app';
            
            const embed = {
                color: 0x5865F2,
                title: '📊 StatusSync Dashboard',
                description: 'Access the web dashboard to view stats, manage moderation, and configure settings.',
                thumbnail: { url: `${dashboardUrl}/logo.svg` },
                fields: [
                    { name: '🔗 Dashboard Link', value: `[Click here to open dashboard](${dashboardUrl}/dashboard/frontend.html)`, inline: false },
                    { name: '🔐 Login Required', value: 'You must have Administrator permissions in this server to access the dashboard.', inline: false }
                ],
                footer: { text: 'StatusSync Dashboard' },
                timestamp: new Date()
            };
            
            await interaction.reply({ embeds: [embed], flags: 64 });
            return;
        }

        if (commandName === 'premium') {
            const premiumData = await checkPremium(interaction.guild.id);
            const logoUrl = process.env.DASHBOARD_URL || process.env.CALLBACK_URL?.replace('/dashboard/auth/callback', '') || 'https://statussync-production.up.railway.app';
            
            if (premiumData.premium) {
                const tierNames = {
                    basic: '✨ Basic Premium',
                    pro: '🌟 Pro Premium',
                    enterprise: '💎 Enterprise'
                };
                
                const embed = {
                    color: 0x667eea,
                    title: '💎 Premium Status',
                    description: `This server has **${tierNames[premiumData.tier] || premiumData.tier}** active!`,
                    thumbnail: { url: `${logoUrl}/logo.svg` },
                    fields: [
                        { name: '🎁 Features Unlocked', value: 'Access all premium features in `/dashboard`', inline: false },
                        { name: '⚙️ Manage Subscription', value: 'Use `/dashboard` to manage your premium features', inline: false }
                    ],
                    footer: { text: 'Thank you for supporting StatusSync!' },
                    timestamp: new Date()
                };
                
                await interaction.reply({ embeds: [embed], flags: 64 });
            } else {
                const dashboardUrl = process.env.DASHBOARD_URL || process.env.CALLBACK_URL?.replace('/dashboard/auth/callback', '') || 'https://statussync-production.up.railway.app';
                
                const embed = {
                    color: 0x5865F2,
                    title: '💎 Premium Status',
                    description: 'This server does not have an active premium subscription.',
                    thumbnail: { url: `${logoUrl}/logo.svg` },
                    fields: [
                        { name: '✨ Premium Features', value: '• Custom bot status\n• XP multipliers\n• Custom embed colors\n• Auto-moderation rules\n• Custom welcome images\n• Detailed analytics\n• Priority support\n• And more!', inline: false },
                        { name: '🚀 Upgrade Now', value: `[Visit the dashboard](${dashboardUrl}/dashboard/frontend.html) to view plans and upgrade!`, inline: false }
                    ],
                    footer: { text: 'Starting at $4.99/month' },
                    timestamp: new Date()
                };
                
                await interaction.reply({ embeds: [embed], flags: 64 });
            }
            return;
        }

        if (commandName === 'grantpremium') {
            // Bot owner only
            const botOwnerId = '1432443011488288890';
            if (interaction.user.id !== botOwnerId) {
                await interaction.reply({ content: '❌ This command can only be used by the bot owner.', flags: 64 });
                return;
            }
            
            const guildId = interaction.guild.id;
            const tier = interaction.options.getString('tier');
            
            try {
                await db.query(`
                    CREATE TABLE IF NOT EXISTS premium_subscriptions (
                        guild_id VARCHAR(32) PRIMARY KEY,
                        tier VARCHAR(16) NOT NULL,
                        stripe_customer_id VARCHAR(255),
                        stripe_subscription_id VARCHAR(255),
                        status VARCHAR(16) DEFAULT 'active',
                        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        expires_at TIMESTAMP,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                `);
                
                await db.query(`
                    INSERT INTO premium_subscriptions (guild_id, tier, status, started_at) 
                    VALUES ($1, $2, 'active', CURRENT_TIMESTAMP) 
                    ON CONFLICT (guild_id) 
                    DO UPDATE SET tier = $2, status = 'active', started_at = CURRENT_TIMESTAMP
                `, [guildId, tier]);
                
                const tierNames = {
                    basic: '✨ Basic Premium',
                    pro: '🌟 Pro Premium',
                    enterprise: '💎 Enterprise'
                };
                
                await interaction.reply({ 
                    content: `✅ Successfully granted **${tierNames[tier]}** to this server!`, 
                    flags: 64 
                });
            } catch (err) {
                console.error('Error granting premium:', err);
                await interaction.reply({ content: `❌ Failed to grant premium: ${err.message}`, flags: 64 });
            }
            return;
        }

        if (commandName === 'bumpreminder') {
            const subcommand = interaction.options.getSubcommand();
            
            try {
                await ensureBumpRemindersTable();
                
                if (subcommand === 'setup') {
                    const channel = interaction.options.getChannel('channel');
                    const role = interaction.options.getRole('role');
                    
                    await db.query(`
                        INSERT INTO bump_reminders (guild_id, channel_id, role_id, last_bump, next_reminder)
                        VALUES ($1, $2, $3, 0, 0)
                        ON CONFLICT (guild_id)
                        DO UPDATE SET channel_id = $2, role_id = $3
                    `, [interaction.guild.id, channel.id, role?.id || null]);
                    
                    const roleText = role ? ` and ping <@&${role.id}>` : '';
                    await interaction.reply({
                        content: `✅ Bump reminders enabled! I'll send reminders to <#${channel.id}>${roleText} when it's time to bump.\n\n**How it works:**\n1. Use \`/bump\` in any channel\n2. I'll detect when Disboard confirms the bump\n3. You'll get a reminder after 2 hours`,
                        flags: 64
                    });
                } else if (subcommand === 'disable') {
                    await db.query('DELETE FROM bump_reminders WHERE guild_id = $1', [interaction.guild.id]);
                    await interaction.reply({ content: '✅ Bump reminders disabled.', flags: 64 });
                } else if (subcommand === 'status') {
                    const result = await db.query('SELECT * FROM bump_reminders WHERE guild_id = $1', [interaction.guild.id]);
                    
                    if (result.rows.length === 0) {
                        await interaction.reply({ 
                            content: '❌ Bump reminders are not set up. Use `/bumpreminder setup` to enable them.',
                            flags: 64
                        });
                        return;
                    }
                    
                    const config = result.rows[0];
                    const channel = interaction.guild.channels.cache.get(config.channel_id);
                    const role = config.role_id ? interaction.guild.roles.cache.get(config.role_id) : null;
                    
                    let statusText = `**Bump Reminder Status**\n\n`;
                    statusText += `📍 **Channel:** ${channel ? `<#${channel.id}>` : 'Channel not found'}\n`;
                    statusText += `👥 **Role:** ${role ? `<@&${role.id}>` : 'None'}\n`;
                    
                    if (config.last_bump > 0) {
                        const lastBumpTime = new Date(parseInt(config.last_bump));
                        const nextReminderTime = new Date(parseInt(config.next_reminder));
                        const now = Date.now();
                        
                        statusText += `⏱️ **Last Bump:** <t:${Math.floor(lastBumpTime.getTime() / 1000)}:R>\n`;
                        
                        if (now < nextReminderTime.getTime()) {
                            statusText += `⏰ **Next Reminder:** <t:${Math.floor(nextReminderTime.getTime() / 1000)}:R>`;
                        } else {
                            statusText += `✅ **Ready to bump again!**`;
                        }
                    } else {
                        statusText += `\n✨ Waiting for first bump...`;
                    }
                    
                    await interaction.reply({ content: statusText, flags: 64 });
                }
            } catch (err) {
                console.error('Error with bump reminder:', err);
                await interaction.reply({ content: `❌ Error: ${err.message}`, flags: 64 });
            }
            return;
        }

        if (commandName === 'history') {
            const user = interaction.options.getUser('user');
            
            try {
                const member = await interaction.guild.members.fetch(user.id).catch(() => null);
                
                if (!member) {
                    await interaction.reply({ content: '❌ User is not in this server.', flags: 64 });
                    return;
                }
                
                // Get user info
                const accountAge = Math.floor((Date.now() - user.createdTimestamp) / (1000 * 60 * 60 * 24));
                const memberAge = Math.floor((Date.now() - member.joinedTimestamp) / (1000 * 60 * 60 * 24));
                
                // Get mod cases
                const casesRes = await db.query(
                    'SELECT COUNT(*) as total FROM mod_cases WHERE user_id = $1 AND guild_id = $2',
                    [user.id, interaction.guild.id]
                );
                const totalCases = casesRes.rows[0]?.total || 0;
                
                // Get XP/Rep
                const xpRes = await db.query('SELECT xp FROM user_xp WHERE user_id = $1', [user.id]);
                const xp = xpRes.rows[0]?.xp || 0;
                const level = Math.floor(0.1 * Math.sqrt(xp));
                
                const repRes = await db.query('SELECT rep FROM user_rep WHERE user_id = $1', [user.id]);
                const rep = repRes.rows[0]?.rep || 0;
                
                // Get roles
                const roles = member.roles.cache
                    .filter(r => r.id !== interaction.guild.id)
                    .sort((a, b) => b.position - a.position)
                    .map(r => `<@&${r.id}>`)
                    .slice(0, 10)
                    .join(', ') || 'None';
                
                const embed = {
                    color: member.displayColor || 0x5865F2,
                    title: `📋 User History: ${user.tag}`,
                    thumbnail: { url: user.displayAvatarURL({ size: 256 }) },
                    fields: [
                        { name: '👤 User', value: `<@${user.id}>`, inline: true },
                        { name: '🆔 ID', value: user.id, inline: true },
                        { name: '📅 Account Created', value: `${accountAge} days ago`, inline: true },
                        { name: '📥 Joined Server', value: `${memberAge} days ago`, inline: true },
                        { name: '📊 Level / XP', value: `Level ${level} (${xp} XP)`, inline: true },
                        { name: '⭐ Reputation', value: `${rep}`, inline: true },
                        { name: '⚖️ Moderation Cases', value: `${totalCases}`, inline: true },
                        { name: '👥 Roles', value: roles, inline: false }
                    ],
                    footer: { text: `Requested by ${interaction.user.tag}` },
                    timestamp: new Date()
                };
                
                await interaction.reply({ embeds: [embed], flags: 64 });
            } catch (err) {
                console.error(err);
                await interaction.reply({ content: '❌ Error fetching user history: ' + err.message, flags: 64 });
            }
            return;
        }

        if (commandName === 'modstats') {
            const moderator = interaction.options.getUser('moderator');
            
            try {
                let query = 'SELECT moderator_id, action, COUNT(*) as count FROM mod_cases WHERE guild_id = $1';
                const params = [interaction.guild.id];
                
                if (moderator) {
                    query += ' AND moderator_id = $2';
                    params.push(moderator.id);
                }
                
                query += ' GROUP BY moderator_id, action ORDER BY count DESC';
                
                const res = await db.query(query, params);
                
                if (!res.rows.length) {
                    await interaction.reply({ content: '📊 No moderation activity found.', flags: 64 });
                    return;
                }
                
                // Aggregate by moderator
                const modStats = {};
                for (const row of res.rows) {
                    if (!modStats[row.moderator_id]) {
                        modStats[row.moderator_id] = { total: 0, actions: {} };
                    }
                    modStats[row.moderator_id].actions[row.action] = parseInt(row.count);
                    modStats[row.moderator_id].total += parseInt(row.count);
                }
                
                // Build description
                let description = '';
                const sortedMods = Object.entries(modStats).sort((a, b) => b[1].total - a[1].total);
                
                for (const [modId, stats] of sortedMods.slice(0, 10)) {
                    const actionsStr = Object.entries(stats.actions)
                        .map(([action, count]) => `${action}: ${count}`)
                        .join(', ');
                    description += `\n<@${modId}>: **${stats.total}** actions (${actionsStr})`;
                }
                
                const title = moderator ? `📊 Moderation Stats for ${moderator.tag}` : '📊 Server Moderation Stats';
                
                const embed = {
                    color: 0x3498db,
                    title,
                    description: description.trim() || 'No data',
                    footer: { text: 'Showing top 10 moderators' },
                    timestamp: new Date()
                };
                
                await interaction.reply({ embeds: [embed], flags: 64 });
            } catch (err) {
                console.error(err);
                await interaction.reply({ content: '❌ Error fetching mod stats: ' + err.message, flags: 64 });
            }
            return;
        }

        if (commandName === 'massban') {
            const userIdsStr = interaction.options.getString('user_ids');
            const reason = interaction.options.getString('reason') || 'Mass ban';
            
            // Parse user IDs
            const userIds = userIdsStr.split(/[,\s]+/).filter(id => id.match(/^\d{17,19}$/));
            
            if (userIds.length === 0) {
                await interaction.reply({ content: '❌ No valid user IDs provided. Please provide user IDs separated by spaces or commas.', flags: 64 });
                return;
            }
            
            if (userIds.length > 50) {
                await interaction.reply({ content: '❌ Maximum 50 users can be banned at once.', flags: 64 });
                return;
            }
            
            await interaction.deferReply({ flags: 64 });
            
            const results = { success: [], failed: [] };
            
            for (const userId of userIds) {
                try {
                    await interaction.guild.members.ban(userId, { reason: `${reason} | By: ${interaction.user.tag}` });
                    const caseId = await logModAction(interaction.guild.id, userId, interaction.user.id, 'ban', reason);
                    results.success.push(`<@${userId}> (Case #${caseId})`);
                } catch (err) {
                    results.failed.push(`<@${userId}> (${err.message})`);
                }
            }
            
            const embed = {
                color: results.failed.length === 0 ? 0x2ecc71 : 0xe74c3c,
                title: '🔨 Mass Ban Results',
                fields: [
                    { name: `✅ Successful (${results.success.length})`, value: results.success.join('\n') || 'None', inline: false },
                    { name: `❌ Failed (${results.failed.length})`, value: results.failed.join('\n') || 'None', inline: false }
                ],
                footer: { text: `Executed by ${interaction.user.tag}` },
                timestamp: new Date()
            };
            
            await interaction.editReply({ embeds: [embed] });
            return;
        }

        if (commandName === 'massrole') {
            const role = interaction.options.getRole('role');
            const action = interaction.options.getString('action');
            const userIdsStr = interaction.options.getString('user_ids');
            
            // Parse user IDs
            const userIds = userIdsStr.split(/[,\s]+/).filter(id => id.match(/^\d{17,19}$/));
            
            if (userIds.length === 0) {
                await interaction.reply({ content: '❌ No valid user IDs provided.', flags: 64 });
                return;
            }
            
            if (userIds.length > 100) {
                await interaction.reply({ content: '❌ Maximum 100 users at once.', flags: 64 });
                return;
            }
            
            // Check role hierarchy
            if (role.position >= interaction.guild.members.me.roles.highest.position) {
                await interaction.reply({ content: '❌ I cannot manage this role (role hierarchy).', flags: 64 });
                return;
            }
            
            await interaction.deferReply({ flags: 64 });
            
            const results = { success: [], failed: [] };
            
            for (const userId of userIds) {
                try {
                    const member = await interaction.guild.members.fetch(userId);
                    if (action === 'add') {
                        await member.roles.add(role);
                    } else {
                        await member.roles.remove(role);
                    }
                    results.success.push(`<@${userId}>`);
                } catch (err) {
                    results.failed.push(`<@${userId}> (${err.message})`);
                }
            }
            
            const actionText = action === 'add' ? 'Added' : 'Removed';
            
            const embed = {
                color: results.failed.length === 0 ? 0x2ecc71 : 0xe74c3c,
                title: `👥 Mass Role ${actionText}`,
                description: `Role: <@&${role.id}>`,
                fields: [
                    { name: `✅ Successful (${results.success.length})`, value: results.success.join(', ') || 'None', inline: false },
                    { name: `❌ Failed (${results.failed.length})`, value: results.failed.join(', ') || 'None', inline: false }
                ],
                footer: { text: `Executed by ${interaction.user.tag}` },
                timestamp: new Date()
            };
            
            await interaction.editReply({ embeds: [embed] });
            return;
        }

        if (commandName === 'appeal') {
            const serverId = interaction.options.getString('server_id');
            const reason = interaction.options.getString('reason');
            
            try {
                // Create appeals table
                await db.query(`
                    CREATE TABLE IF NOT EXISTS ban_appeals (
                        id SERIAL PRIMARY KEY,
                        guild_id VARCHAR(32) NOT NULL,
                        user_id VARCHAR(32) NOT NULL,
                        reason TEXT NOT NULL,
                        status VARCHAR(16) DEFAULT 'pending',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        reviewed_by VARCHAR(32),
                        reviewed_at TIMESTAMP
                    )
                `);
                
                // Check if server exists and user is banned
                let guild;
                try {
                    guild = await client.guilds.fetch(serverId);
                } catch (err) {
                    await interaction.reply({ content: '❌ Invalid server ID or bot is not in that server.', flags: 64 });
                    return;
                }
                
                const ban = await guild.bans.fetch(interaction.user.id).catch(() => null);
                if (!ban) {
                    await interaction.reply({ content: '❌ You are not banned from that server.', flags: 64 });
                    return;
                }
                
                // Check for existing pending appeal
                const existing = await db.query(
                    'SELECT * FROM ban_appeals WHERE guild_id = $1 AND user_id = $2 AND status = $3',
                    [serverId, interaction.user.id, 'pending']
                );
                
                if (existing.rows.length > 0) {
                    await interaction.reply({ content: '❌ You already have a pending appeal for this server.', flags: 64 });
                    return;
                }
                
                // Create appeal
                const result = await db.query(
                    'INSERT INTO ban_appeals (guild_id, user_id, reason) VALUES ($1, $2, $3) RETURNING id',
                    [serverId, interaction.user.id, reason]
                );
                
                const appealId = result.rows[0].id;
                
                await interaction.reply({ 
                    content: `✅ Your appeal has been submitted to **${guild.name}**.\n📋 Appeal ID: \`${appealId}\`\n\nModerators will review your appeal shortly.`, 
                    flags: 64 
                });
                
                // Notify server (try to send to a channel)
                const channels = guild.channels.cache.filter(c => c.isTextBased() && c.name.includes('appeal') || c.name.includes('mod'));
                const notifChannel = channels.first();
                
                if (notifChannel) {
                    const embed = {
                        color: 0xfaa61a,
                        title: '📝 New Ban Appeal',
                        fields: [
                            { name: 'User', value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
                            { name: 'Appeal ID', value: `${appealId}`, inline: true },
                            { name: 'Reason', value: reason, inline: false }
                        ],
                        footer: { text: 'Use /appeals to manage appeals' },
                        timestamp: new Date()
                    };
                    await notifChannel.send({ embeds: [embed] });
                }
            } catch (err) {
                console.error(err);
                await interaction.reply({ content: '❌ Error submitting appeal: ' + err.message, flags: 64 });
            }
            return;
        }

        if (commandName === 'appeals') {
            const action = interaction.options.getString('action') || 'view';
            const appealId = interaction.options.getInteger('appeal_id');
            
            try {
                await db.query(`
                    CREATE TABLE IF NOT EXISTS ban_appeals (
                        id SERIAL PRIMARY KEY,
                        guild_id VARCHAR(32) NOT NULL,
                        user_id VARCHAR(32) NOT NULL,
                        reason TEXT NOT NULL,
                        status VARCHAR(16) DEFAULT 'pending',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        reviewed_by VARCHAR(32),
                        reviewed_at TIMESTAMP
                    )
                `);
                
                if (action === 'view') {
                    const appeals = await db.query(
                        'SELECT * FROM ban_appeals WHERE guild_id = $1 ORDER BY created_at DESC LIMIT 10',
                        [interaction.guild.id]
                    );
                    
                    if (appeals.rows.length === 0) {
                        await interaction.reply({ content: '📋 No appeals found.', flags: 64 });
                        return;
                    }
                    
                    const description = appeals.rows.map(a => {
                        const statusEmoji = a.status === 'pending' ? '⏳' : a.status === 'approved' ? '✅' : '❌';
                        return `${statusEmoji} **ID ${a.id}** - <@${a.user_id}> - ${a.status}\n${a.reason.substring(0, 100)}...`;
                    }).join('\n\n');
                    
                    const embed = {
                        color: 0x3498db,
                        title: '📋 Ban Appeals',
                        description,
                        footer: { text: 'Use /appeals action:Approve/Deny appeal_id:ID to manage' }
                    };
                    
                    await interaction.reply({ embeds: [embed], flags: 64 });
                } else if (action === 'approve' || action === 'deny') {
                    if (!appealId) {
                        await interaction.reply({ content: '❌ Please provide an appeal ID.', flags: 64 });
                        return;
                    }
                    
                    const appeal = await db.query(
                        'SELECT * FROM ban_appeals WHERE id = $1 AND guild_id = $2',
                        [appealId, interaction.guild.id]
                    );
                    
                    if (appeal.rows.length === 0) {
                        await interaction.reply({ content: '❌ Appeal not found.', flags: 64 });
                        return;
                    }
                    
                    const appealData = appeal.rows[0];
                    
                    if (appealData.status !== 'pending') {
                        await interaction.reply({ content: '❌ This appeal has already been reviewed.', flags: 64 });
                        return;
                    }
                    
                    // Update appeal
                    await db.query(
                        'UPDATE ban_appeals SET status = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP WHERE id = $3',
                        [action === 'approve' ? 'approved' : 'denied', interaction.user.id, appealId]
                    );
                    
                    if (action === 'approve') {
                        // Unban user
                        try {
                            await interaction.guild.members.unban(appealData.user_id, `Appeal approved by ${interaction.user.tag}`);
                        } catch (err) {
                            await interaction.reply({ content: `⚠️ Appeal approved but failed to unban: ${err.message}`, flags: 64 });
                            return;
                        }
                    }
                    
                    const statusText = action === 'approve' ? 'approved ✅' : 'denied ❌';
                    await interaction.reply({ content: `Appeal #${appealId} has been ${statusText}.`, flags: 64 });
                    
                    // Try to DM user
                    try {
                        const user = await client.users.fetch(appealData.user_id);
                        const dmText = action === 'approve' 
                            ? `✅ Your ban appeal for **${interaction.guild.name}** has been approved! You can now rejoin the server.`
                            : `❌ Your ban appeal for **${interaction.guild.name}** has been denied.`;
                        await user.send(dmText);
                    } catch (err) {
                        console.log('Could not DM user about appeal decision');
                    }
                }
            } catch (err) {
                console.error(err);
                await interaction.reply({ content: '❌ Error managing appeals: ' + err.message, flags: 64 });
            }
            return;
        }

        if (commandName === 'rep') {
            const user = interaction.options.getUser('user') || interaction.user;
            let displayName = user.username;
            let avatarURL = user.displayAvatarURL ? user.displayAvatarURL({ extension: 'png', size: 128 }) : user.avatarURL;
            if (interaction.guild) {
                const member = await interaction.guild.members.fetch(user.id).catch(() => null);
                if (member && member.displayName) displayName = member.displayName;
                if (member && member.user && member.user.displayAvatarURL) avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 128 });
            }
            try {
                // Fetch rep
                const repRes = await db.query('SELECT rep FROM user_rep WHERE user_id = $1', [user.id]);
                const userRep = repRes.rows.length ? repRes.rows[0].rep : 0;
                // Fetch XP and level
                const xpRes = await db.query('SELECT xp FROM user_xp WHERE user_id = $1', [user.id]);
                const xp = xpRes.rows.length ? xpRes.rows[0].xp : 0;
                // Level calculation: e.g. level = Math.floor(0.1 * Math.sqrt(xp))
                const level = Math.floor(0.1 * Math.sqrt(xp));
                const xpNeeded = Math.floor(Math.pow((level + 1) / 0.1, 2)) - Math.floor(Math.pow(level / 0.1, 2));
                const xpCurrent = xp - Math.floor(Math.pow(level / 0.1, 2));
                // Fetch rank (by rep)
                const rankRes = await db.query('SELECT user_id FROM user_rep ORDER BY rep DESC');
                let rank = 1;
                if (rankRes.rows.length) {
                    rank = rankRes.rows.findIndex(row => row.user_id === user.id) + 1;
                    if (rank < 1) rank = 1;
                }
                // Fetch background color
                let bgColor = '#23272A';
                const bgRes = await db.query('SELECT background_color FROM user_rep_settings WHERE user_id = $1', [user.id]);
                const colorMap = {
                    blue: '#3498db',
                    red: '#e74c3c',
                    black: '#23272A',
                    white: '#ecf0f1',
                    green: '#2ecc71',
                    purple: '#9b59b6',
                    orange: '#e67e22'
                };
                if (bgRes.rows.length && bgRes.rows[0].background_color && colorMap[bgRes.rows[0].background_color]) {
                    bgColor = colorMap[bgRes.rows[0].background_color];
                }
                // Generate rep card image
                const { generateRepCard } = require('./repCard');
                const buffer = await generateRepCard({
                    displayName,
                    username: user.username,
                    avatarURL,
                    rep: userRep,
                    rank,
                    level,
                    xp: xpCurrent,
                    xpNeeded,
                    bgColor
                });
                // Calculate reps left for the requesting user
                const now = new Date();
                const since = new Date(now.getTime() - 12 * 60 * 60 * 1000);
                await db.query(`CREATE TABLE IF NOT EXISTS rep_give_log (giver_id VARCHAR(32), time TIMESTAMP)`);
                const logRes = await db.query('SELECT COUNT(*) FROM rep_give_log WHERE giver_id = $1 AND time > $2', [interaction.user.id, since]);
                const repsLeft = Math.max(0, 2 - parseInt(logRes.rows[0].count));
                // Send image as attachment with info embed
                await interaction.reply({
                    files: [{ attachment: buffer, name: 'rep_card.png' }]
                });
            } catch (err) {
                console.error(err);
                await interaction.reply({ content: 'Error fetching rep: ' + err.message, flags: 64 });
            }
            return;
        }
        if (commandName === 'addrep') {
            // Slash command: /addrep user:USER amount:NUMBER
            const user = interaction.options?.getUser ? interaction.options.getUser('user') : null;
            let amount = 1;
            if (!user) return interaction.reply('You must specify a user to give rep to!');
            if (interaction.options?.getInteger && interaction.options.getInteger('amount') !== null) {
                amount = interaction.options.getInteger('amount');
            } else if (args.length && /^[-+]?\d+$/.test(args[0])) {
                amount = parseInt(args.shift(), 10);
            }
            const validAmounts = [1, -1, 2, -2];
            if (!validAmounts.includes(amount)) {
                return interaction.reply('Amount must be one of: 1, -1, 2, -2');
            }
            if (user.id === interaction.user.id) {
                return interaction.reply('You cannot rep yourself!');
            }
            // Limit: 2 rep actions per 12 hours
            const now = new Date();
            const since = new Date(now.getTime() - 12 * 60 * 60 * 1000);
            await db.query(`CREATE TABLE IF NOT EXISTS rep_give_log (giver_id VARCHAR(32), time TIMESTAMP)`);
            const logRes = await db.query('SELECT COUNT(*) FROM rep_give_log WHERE giver_id = $1 AND time > $2', [interaction.user.id, since]);
            const repsLeft = Math.max(0, 2 - parseInt(logRes.rows[0].count));
            if (repsLeft <= 0) {
                return interaction.reply('You can only give rep 2 times every 12 hours.');
            }
            if (Math.abs(amount) > repsLeft) {
                return interaction.reply(`You only have ${repsLeft} rep action${repsLeft === 1 ? '' : 's'} left.`);
            }
            let displayName = user.username;
            if (interaction.guild) {
                const member = await interaction.guild.members.fetch(user.id).catch(() => null);
                if (member && member.displayName) displayName = member.displayName;
            }
            try {
                await db.query(`INSERT INTO user_rep (user_id, rep) VALUES ($1, $2)
                    ON CONFLICT (user_id) DO UPDATE SET rep = user_rep.rep + $2`, [user.id, amount]);
                for (let i = 0; i < Math.abs(amount); i++) {
                    await db.query('INSERT INTO rep_give_log (giver_id, time) VALUES ($1, $2)', [interaction.user.id, now]);
                }
                const result = await db.query('SELECT rep FROM user_rep WHERE user_id = $1', [user.id]);
                const newRep = result.rows.length ? result.rows[0].rep : amount;
                const embed = {
                    color: amount > 0 ? 0x00ff00 : 0xff0000,
                    title: `${displayName} now has ${newRep} rep!`,
                    description: `Rep change: ${amount > 0 ? '+' : ''}${amount}`,
                    thumbnail: { url: user.displayAvatarURL ? user.displayAvatarURL() : user.avatarURL },
                };
                await interaction.reply({ embeds: [embed] });
            } catch (err) {
                console.error(err);
                await interaction.reply({ content: 'Error updating rep: ' + err.message, flags: 64 });
            }
            return;
        }

        if (commandName === 'negrep') {
            // Slash command: /negrep user:USER amount:NUMBER
            const user = interaction.options?.getUser ? interaction.options.getUser('user') : null;
            let amount = -1;
            if (!user) return interaction.reply('You must specify a user to give neg rep to!');
            if (interaction.options?.getInteger && interaction.options.getInteger('amount') !== null) {
                amount = interaction.options.getInteger('amount');
            } else if (args.length && /^-\d+$/.test(args[0])) {
                amount = parseInt(args.shift(), 10);
            }
            const validAmounts = [-1, -2];
            if (!validAmounts.includes(amount)) {
                return interaction.reply('Amount must be -1 or -2');
            }
            if (user.id === interaction.user.id) {
                return interaction.reply('You cannot neg rep yourself!');
            }
            // Limit: 2 rep actions per 12 hours
            const now = new Date();
            const since = new Date(now.getTime() - 12 * 60 * 60 * 1000);
            await db.query(`CREATE TABLE IF NOT EXISTS rep_give_log (giver_id VARCHAR(32), time TIMESTAMP)`);
            const logRes = await db.query('SELECT COUNT(*) FROM rep_give_log WHERE giver_id = $1 AND time > $2', [interaction.user.id, since]);
            const repsLeft = Math.max(0, 2 - parseInt(logRes.rows[0].count));
            if (repsLeft <= 0) {
                return interaction.reply('You can only give rep 2 times every 12 hours.');
            }
            if (Math.abs(amount) > repsLeft) {
                return interaction.reply(`You only have ${repsLeft} rep action${repsLeft === 1 ? '' : 's'} left.`);
            }
            let displayName = user.username;
            if (interaction.guild) {
                const member = await interaction.guild.members.fetch(user.id).catch(() => null);
                if (member && member.displayName) displayName = member.displayName;
            }
            try {
                await db.query(`INSERT INTO user_rep (user_id, rep) VALUES ($1, $2)
                    ON CONFLICT (user_id) DO UPDATE SET rep = user_rep.rep + $2`, [user.id, amount]);
                for (let i = 0; i < Math.abs(amount); i++) {
                    await db.query('INSERT INTO rep_give_log (giver_id, time) VALUES ($1, $2)', [interaction.user.id, now]);
                }
                const result = await db.query('SELECT rep FROM user_rep WHERE user_id = $1', [user.id]);
                const newRep = result.rows.length ? result.rows[0].rep : amount;
                const embed = {
                    color: 0xff0000,
                    title: `${displayName} now has ${newRep} rep!`,
                    description: `Rep change: ${amount}`,
                    thumbnail: { url: user.displayAvatarURL ? user.displayAvatarURL() : user.avatarURL },
                };
                await interaction.reply({ embeds: [embed] });
            } catch (err) {
                console.error(err);
                await interaction.reply({ content: 'Error updating rep: ' + err.message, flags: 64 });
            }
            return;
        }

        if (commandName === 'xpleaderboard') {
            try {
                const members = await interaction.guild.members.fetch();
                const res = await db.query('SELECT user_id, xp FROM user_xp ORDER BY xp DESC LIMIT 10');
                if (!res.rows.length) {
                    await interaction.reply('No XP data found.');
                    return;
                }
                const leaderboard = await Promise.all(res.rows.map(async (row, i) => {
                    let member = members.get(row.user_id);
                    let name = member ? member.displayName : `<@${row.user_id}>`;
                    return `#${i+1} - ${name}: **${row.xp} XP**`;
                }));
                const embed = {
                    color: 0x3498db,
                    title: 'All-Time XP Leaderboard',
                    description: leaderboard.join('\n'),
                };
                await interaction.reply({ embeds: [embed] });
            } catch (err) {
                console.error(err);
                await interaction.reply({ content: 'Error fetching XP leaderboard: ' + err.message, flags: 64 });
            }
            return;
        }

        if (commandName === 'xpweekly') {
            try {
                const members = await interaction.guild.members.fetch();
                const weekStart = getCurrentWeekStart();
                const res = await db.query('SELECT user_id, xp FROM user_xp_weekly WHERE week_start = $1 ORDER BY xp DESC LIMIT 10', [weekStart]);
                if (!res.rows.length) {
                    await interaction.reply('No weekly XP data found.');
                    return;
                }
                const leaderboard = await Promise.all(res.rows.map(async (row, i) => {
                    let member = members.get(row.user_id);
                    let name = member ? member.displayName : `<@${row.user_id}>`;
                    return `#${i+1} - ${name}: **${row.xp} XP**`;
                }));
                const embed = {
                    color: 0x2ecc71,
                    title: 'Weekly XP Leaderboard',
                    description: leaderboard.join('\n'),
                    footer: { text: 'Resets every Monday 11am EST' }
                };
                await interaction.reply({ embeds: [embed] });
            } catch (err) {
                console.error(err);
                await interaction.reply({ content: 'Error fetching weekly XP leaderboard: ' + err.message, flags: 64 });
            }
            return;
        }
        if (commandName === 'setupdb') {
            // Only allow server owner or admins to run this
            if (!interaction.member.permissions.has('Administrator')) {
                return interaction.reply('You need Administrator permission to run this command.');
            }
            try {
                await db.query(`
                    CREATE TABLE IF NOT EXISTS user_rep (
                        user_id VARCHAR(32) PRIMARY KEY,
                        rep INTEGER DEFAULT 0
                    );
                `);
                await db.query(`
                    CREATE TABLE IF NOT EXISTS custom_commands (
                        name VARCHAR(64) PRIMARY KEY,
                        response TEXT NOT NULL
                    );
                `);
                await db.query(`
                    CREATE TABLE IF NOT EXISTS rep_give_log (
                        giver_id VARCHAR(32),
                        time TIMESTAMP
                    );
                `);
                // Moderation tables
                await db.query(`
                    CREATE TABLE IF NOT EXISTS mod_cases (
                        case_id SERIAL PRIMARY KEY,
                        user_id VARCHAR(32) NOT NULL,
                        moderator_id VARCHAR(32) NOT NULL,
                        action VARCHAR(16) NOT NULL, -- warn, timeout, kick, ban, unban
                        reason TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        expires_at TIMESTAMP,
                        status VARCHAR(16) DEFAULT 'open', -- open, closed
                        closed_at TIMESTAMP,
                        closed_by VARCHAR(32),
                        close_reason TEXT,
                        guild_id VARCHAR(32) NOT NULL
                    );
                `);
                await db.query(`
                    CREATE TABLE IF NOT EXISTS mod_logs (
                        log_id SERIAL PRIMARY KEY,
                        case_id INTEGER REFERENCES mod_cases(case_id),
                        user_id VARCHAR(32) NOT NULL,
                        moderator_id VARCHAR(32) NOT NULL,
                        action VARCHAR(16) NOT NULL,
                        reason TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        guild_id VARCHAR(32) NOT NULL
                    );
                `);
                interaction.channel.send('Database tables (user_rep, custom_commands, rep_give_log, mod_cases, mod_logs) created or already exist!');
            } catch (err) {
                console.error(err);
                interaction.channel.send('Error creating tables: ' + err.message);
            }
            return;
        }
});
    // Message handler
    client.on('messageCreate', async (message) => {
        if (message.author.bot && message.author.id !== '302050872383242240') return; // Allow Disboard bot
        if (!message.guild) return;

        // === DISBOARD BUMP DETECTION ===
        if (message.author.id === '302050872383242240' && message.interaction) {
            // Disboard bot responded to a slash command
            if (message.interaction.commandName === 'bump') {
                try {
                    await ensureBumpRemindersTable();
                    const result = await db.query('SELECT * FROM bump_reminders WHERE guild_id = $1', [message.guild.id]);
                    
                    if (result.rows.length > 0) {
                        const config = result.rows[0];
                        const now = Date.now();
                        const twoHours = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
                        const nextReminder = now + twoHours;
                        
                        // Update last bump time
                        await db.query(
                            'UPDATE bump_reminders SET last_bump = $1, next_reminder = $2 WHERE guild_id = $3',
                            [now.toString(), nextReminder.toString(), message.guild.id]
                        );
                        
                        // Send confirmation
                        const channel = message.guild.channels.cache.get(config.channel_id);
                        if (channel && channel.isTextBased()) {
                            const bumper = message.interaction.user;
                            await channel.send({
                                embeds: [{
                                    color: 0x2ecc71,
                                    description: `✅ Bump successful! Thanks ${bumper}!\n⏰ I'll remind you to bump again <t:${Math.floor(nextReminder / 1000)}:R>`,
                                    timestamp: new Date()
                                }]
                            });
                        }
                    }
                } catch (err) {
                    console.error('Error processing bump:', err);
                }
            }
        }

        if (message.author.bot) return; // Skip other bot messages

        // === AUTO-MODERATION (Premium Feature) ===
        const autoModEnabled = await getPremiumFeature(message.guild.id, 'auto_mod_enabled', false);
        if (autoModEnabled) {
            const automod = require('./automod');
            const premiumData = await checkPremium(message.guild.id);
            await automod.checkMessage(message, premiumData.premium);
        }

        // === MESSAGE LOGGING ===
        try {
            await db.query(`CREATE TABLE IF NOT EXISTS logging_channels (guild_id VARCHAR(32) PRIMARY KEY, channel_id VARCHAR(32))`);
            const logRes = await db.query('SELECT channel_id FROM logging_channels WHERE guild_id = $1', [message.guild.id]);
            if (logRes.rows.length) {
                const logChannel = message.guild.channels.cache.get(logRes.rows[0].channel_id);
                if (logChannel && logChannel.isTextBased() && logChannel.id !== message.channel.id) {
                    const embed = {
                        color: 0x3498db,
                        author: {
                            name: `${message.author.tag}`,
                            icon_url: message.author.displayAvatarURL()
                        },
                        title: '📝 Message Sent',
                        description: message.content ? (message.content.length > 1024 ? message.content.substring(0, 1021) + '...' : message.content) : '*[No text content]*',
                        fields: [
                            { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
                            { name: 'User', value: `<@${message.author.id}>`, inline: true },
                            { name: 'Message ID', value: message.id, inline: false }
                        ],
                        timestamp: new Date(),
                        footer: { text: `User ID: ${message.author.id}` }
                    };

                    if (message.attachments.size > 0) {
                        const attachments = message.attachments.map(a => `[${a.name}](${a.url})`).join('\n');
                        embed.fields.push({ name: 'Attachments', value: attachments.length > 1024 ? attachments.substring(0, 1021) + '...' : attachments, inline: false });
                        const firstImage = message.attachments.find(a => a.contentType?.startsWith('image/'));
                        if (firstImage) {
                            embed.image = { url: firstImage.url };
                        }
                    }

                    if (message.stickers.size > 0) {
                        const stickers = message.stickers.map(s => s.name).join(', ');
                        embed.fields.push({ name: 'Stickers', value: stickers, inline: false });
                    }

                    await logChannel.send({ embeds: [embed] });
                }
            }
        } catch (err) {
            console.error('Error logging message creation:', err);
        }

        // XP SYSTEM: Add XP for every message (5 for text, 10 for sticker)
        await ensureXpTables();
        let xpToAdd = 0;
        if (message.stickers && message.stickers.size > 0) {
            xpToAdd = 10;
        } else if (message.content && message.content.length > 0) {
            xpToAdd = 5;
        }
        if (xpToAdd > 0) {
            // Apply premium XP multiplier if available
            if (message.guild) {
                const multiplier = await getPremiumFeature(message.guild.id, 'xp_multiplier', 1.0);
                xpToAdd = Math.floor(xpToAdd * multiplier);
            }
            
            await db.query('INSERT INTO user_xp (user_id, xp) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET xp = user_xp.xp + $2', [message.author.id, xpToAdd]);
            // Weekly XP: use week_start and reset on new week
            const weekStart = getCurrentWeekStart();
            const res = await db.query('SELECT week_start, xp FROM user_xp_weekly WHERE user_id = $1', [message.author.id]);
            if (!res.rows.length) {
                await db.query('INSERT INTO user_xp_weekly (user_id, xp, week_start) VALUES ($1, $2, $3)', [message.author.id, xpToAdd, weekStart]);
            } else if (res.rows[0].week_start !== weekStart) {
                await db.query('UPDATE user_xp_weekly SET xp = $1, week_start = $2 WHERE user_id = $3', [xpToAdd, weekStart, message.author.id]);
            } else {
                await db.query('UPDATE user_xp_weekly SET xp = xp + $1 WHERE user_id = $2', [xpToAdd, message.author.id]);
            }
        }

        // Prefix command handling (!rep, !addrep, !negrep, custom commands)
        if (message.content.startsWith('!')) {
            const args = message.content.slice(1).trim().split(/ +/);
            const command = args.shift().toLowerCase();
            try {
                // !rep [@user]
                if (command === 'rep') {
                    let user = message.mentions.users.first() || message.author;
                    let displayName = user.username;
                    let avatarURL = user.displayAvatarURL ? user.displayAvatarURL({ extension: 'png', size: 128 }) : user.avatarURL;
                    if (message.guild) {
                        const member = await message.guild.members.fetch(user.id).catch(() => null);
                        if (member && member.displayName) displayName = member.displayName;
                        if (member && member.user && member.user.displayAvatarURL) avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 128 });
                    }
                    try {
                        const repRes = await db.query('SELECT rep FROM user_rep WHERE user_id = $1', [user.id]);
                        const userRep = repRes.rows.length ? repRes.rows[0].rep : 0;
                        const xpRes = await db.query('SELECT xp FROM user_xp WHERE user_id = $1', [user.id]);
                        const xp = xpRes.rows.length ? xpRes.rows[0].xp : 0;
                        const level = Math.floor(0.1 * Math.sqrt(xp));
                        const xpNeeded = Math.floor(Math.pow((level + 1) / 0.1, 2)) - Math.floor(Math.pow(level / 0.1, 2));
                        const xpCurrent = xp - Math.floor(Math.pow(level / 0.1, 2));
                        const rankRes = await db.query('SELECT user_id FROM user_rep ORDER BY rep DESC');
                        let rank = 1;
                        if (rankRes.rows.length) {
                            rank = rankRes.rows.findIndex(row => row.user_id === user.id) + 1;
                            if (rank < 1) rank = 1;
                        }
                        let bgColor = '#23272A';
                        const bgRes = await db.query('SELECT background_color FROM user_rep_settings WHERE user_id = $1', [user.id]);
                        const colorMap = {
                            blue: '#3498db', red: '#e74c3c', black: '#23272A', white: '#ecf0f1', green: '#2ecc71', purple: '#9b59b6', orange: '#e67e22'
                        };
                        if (bgRes.rows.length && bgRes.rows[0].background_color && colorMap[bgRes.rows[0].background_color]) {
                            bgColor = colorMap[bgRes.rows[0].background_color];
                        }
                        const { generateRepCard } = require('./repCard');
                        const buffer = await generateRepCard({ displayName, username: user.username, avatarURL, rep: userRep, rank, level, xp: xpCurrent, xpNeeded, bgColor });
                        await message.reply({ files: [{ attachment: buffer, name: 'rep_card.png' }] });
                    } catch (err) {
                        await message.reply('Error fetching rep: ' + err.message);
                    }
                    return;
                }

                // !addrep @user [amount] (everyone can use)
                if (command === 'addrep') {
                    const user = message.mentions.users.first();
                    if (!user) return message.reply('You must mention a user to give rep to!');
                    let amount = 1;
                    if (args.length && /^[-+]?\d+$/.test(args[0])) amount = parseInt(args.shift(), 10);
                    const validAmounts = [1, -1, 2, -2];
                    if (!validAmounts.includes(amount)) return message.reply('Amount must be one of: 1, -1, 2, -2');
                    if (user.id === message.author.id) return message.reply('You cannot rep yourself!');
                    const now = new Date();
                    const since = new Date(now.getTime() - 12 * 60 * 60 * 1000);
                    await db.query(`CREATE TABLE IF NOT EXISTS rep_give_log (giver_id VARCHAR(32), time TIMESTAMP)`);
                    const logRes = await db.query('SELECT COUNT(*) FROM rep_give_log WHERE giver_id = $1 AND time > $2', [message.author.id, since]);
                    const repsLeft = Math.max(0, 2 - parseInt(logRes.rows[0].count));
                    if (repsLeft <= 0) return message.reply('You can only give rep 2 times every 12 hours.');
                    if (Math.abs(amount) > repsLeft) return message.reply(`You only have ${repsLeft} rep action${repsLeft === 1 ? '' : 's'} left.`);
                    let displayName = user.username;
                    if (message.guild) {
                        const member = await message.guild.members.fetch(user.id).catch(() => null);
                        if (member && member.displayName) displayName = member.displayName;
                    }
                    try {
                        await db.query(`INSERT INTO user_rep (user_id, rep) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET rep = user_rep.rep + $2`, [user.id, amount]);
                        for (let i = 0; i < Math.abs(amount); i++) {
                            await db.query('INSERT INTO rep_give_log (giver_id, time) VALUES ($1, $2)', [message.author.id, now]);
                        }
                        const result = await db.query('SELECT rep FROM user_rep WHERE user_id = $1', [user.id]);
                        const newRep = result.rows.length ? result.rows[0].rep : amount;
                        const embed = {
                            color: amount > 0 ? 0x00ff00 : 0xff0000,
                            title: `${displayName} now has ${newRep} rep!`,
                            description: `Rep change: ${amount > 0 ? '+' : ''}${amount}`,
                            thumbnail: { url: user.displayAvatarURL ? user.displayAvatarURL() : user.avatarURL },
                        };
                        await message.reply({ embeds: [embed] });
                    } catch (err) {
                        await message.reply('Error updating rep: ' + err.message);
                    }
                    return;
                }

                // !negrep @user [amount] (everyone can use)
                if (command === 'negrep') {
                    const user = message.mentions.users.first();
                    if (!user) return message.reply('You must mention a user to give neg rep to!');
                    let amount = -1;
                    if (args.length && /^-\d+$/.test(args[0])) amount = parseInt(args.shift(), 10);
                    const validAmounts = [-1, -2];
                    if (!validAmounts.includes(amount)) return message.reply('Amount must be -1 or -2');
                    if (user.id === message.author.id) return message.reply('You cannot neg rep yourself!');
                    const now = new Date();
                    const since = new Date(now.getTime() - 12 * 60 * 60 * 1000);
                    await db.query(`CREATE TABLE IF NOT EXISTS rep_give_log (giver_id VARCHAR(32), time TIMESTAMP)`);
                    const logRes = await db.query('SELECT COUNT(*) FROM rep_give_log WHERE giver_id = $1 AND time > $2', [message.author.id, since]);
                    const repsLeft = Math.max(0, 2 - parseInt(logRes.rows[0].count));
                    if (repsLeft <= 0) return message.reply('You can only give rep 2 times every 12 hours.');
                    if (Math.abs(amount) > repsLeft) return message.reply(`You only have ${repsLeft} rep action${repsLeft === 1 ? '' : 's'} left.`);
                    let displayName = user.username;
                    if (message.guild) {
                        const member = await message.guild.members.fetch(user.id).catch(() => null);
                        if (member && member.displayName) displayName = member.displayName;
                    }
                    try {
                        await db.query(`INSERT INTO user_rep (user_id, rep) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET rep = user_rep.rep + $2`, [user.id, amount]);
                        for (let i = 0; i < Math.abs(amount); i++) {
                            await db.query('INSERT INTO rep_give_log (giver_id, time) VALUES ($1, $2)', [message.author.id, now]);
                        }
                        const result = await db.query('SELECT rep FROM user_rep WHERE user_id = $1', [user.id]);
                        const newRep = result.rows.length ? result.rows[0].rep : amount;
                        const embed = {
                            color: 0xff0000,
                            title: `${displayName} now has ${newRep} rep!`,
                            description: `Rep change: ${amount}`,
                            thumbnail: { url: user.displayAvatarURL ? user.displayAvatarURL() : user.avatarURL },
                        };
                        await message.reply({ embeds: [embed] });
                    } catch (err) {
                        await message.reply('Error updating rep: ' + err.message);
                    }
                    return;
                }

                // Custom command management and execution
                if (command && customCommands) {
                    // List custom commands
                    if (command === 'listcmds') {
                        const names = await customCommands.listCommands();
                        if (!names.length) {
                            await message.reply('No custom commands found.');
                        } else {
                            await message.reply('Custom commands: ' + names.map(n => '`' + n + '`').join(', '));
                        }
                        return;
                    }
                    // Add custom command (admin only)
                    if (command === 'addcmd' && message.member?.permissions.has('Administrator')) {
                        const name = args.shift()?.toLowerCase();
                        const response = args.join(' ');
                        if (!name || !response) return message.reply('Usage: !addcmd <name> <response>');
                        await customCommands.addCommand(name, response);
                        await message.reply(`Custom command !${name} added!`);
                        return;
                    }
                    // Remove custom command (admin only)
                    if (command === 'removecmd' && message.member?.permissions.has('Administrator')) {
                        const name = args.shift()?.toLowerCase();
                        if (!name) return message.reply('Usage: !removecmd <name>');
                        const exists = await customCommands.getCommand(name);
                        if (!exists) {
                            await message.reply(`Custom command !${name} does not exist.`);
                            return;
                        }
                        await customCommands.removeCommand(name);
                        await message.reply(`Custom command !${name} removed!`);
                        return;
                    }
                    // Run custom command
                    const cmd = await customCommands.getCommand(command);
                    if (cmd) {
                        await message.reply(cmd);
                        return;
                    }
                }
            } catch (err) {
                await message.reply('Command error: ' + err.message);
            }
        }
    });

    // === MESSAGE UPDATE/DELETE LOGGING ===
    // Log message updates/edits
    client.on('messageUpdate', async (oldMessage, newMessage) => {
        if (newMessage.author?.bot) return;
        if (!newMessage.guild) return;
        if (oldMessage.content === newMessage.content) return; // Ignore embed updates

        try {
            await db.query(`CREATE TABLE IF NOT EXISTS logging_channels (guild_id VARCHAR(32) PRIMARY KEY, channel_id VARCHAR(32))`);
            const logRes = await db.query('SELECT channel_id FROM logging_channels WHERE guild_id = $1', [newMessage.guild.id]);
            if (logRes.rows.length) {
                const logChannel = newMessage.guild.channels.cache.get(logRes.rows[0].channel_id);
                if (logChannel && logChannel.isTextBased()) {
                    const embed = {
                        color: 0xffa500,
                        author: {
                            name: `${newMessage.author.tag}`,
                            icon_url: newMessage.author.displayAvatarURL()
                        },
                        title: '✏️ Message Edited',
                        fields: [
                            { name: 'Channel', value: `<#${newMessage.channel.id}>`, inline: true },
                            { name: 'User', value: `<@${newMessage.author.id}>`, inline: true },
                            { name: 'Before', value: oldMessage.content || '*[No text content]*', inline: false },
                            { name: 'After', value: newMessage.content || '*[No text content]*', inline: false },
                            { name: 'Jump to Message', value: `[Click here](${newMessage.url})`, inline: false }
                        ],
                        timestamp: new Date(),
                        footer: { text: `Message ID: ${newMessage.id}` }
                    };

                    await logChannel.send({ embeds: [embed] });
                }
            }
        } catch (err) {
            console.error('Error logging message edit:', err);
        }
    });

    // Log message deletions
    client.on('messageDelete', async (message) => {
        if (message.author?.bot) return;
        if (!message.guild) return;

        try {
            await db.query(`CREATE TABLE IF NOT EXISTS logging_channels (guild_id VARCHAR(32) PRIMARY KEY, channel_id VARCHAR(32))`);
            const logRes = await db.query('SELECT channel_id FROM logging_channels WHERE guild_id = $1', [message.guild.id]);
            if (logRes.rows.length) {
                const logChannel = message.guild.channels.cache.get(logRes.rows[0].channel_id);
                if (logChannel && logChannel.isTextBased()) {
                    const embed = {
                        color: 0xff0000,
                        author: {
                            name: message.author ? `${message.author.tag}` : 'Unknown User',
                            icon_url: message.author ? message.author.displayAvatarURL() : null
                        },
                        title: '🗑️ Message Deleted',
                        description: message.content || '*[No text content]*',
                        fields: [
                            { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
                            { name: 'User', value: message.author ? `<@${message.author.id}>` : 'Unknown', inline: true },
                            { name: 'Message ID', value: message.id, inline: false }
                        ],
                        timestamp: new Date(),
                        footer: { text: message.author ? `User ID: ${message.author.id}` : 'Message ID: ' + message.id }
                    };

                    if (message.attachments.size > 0) {
                        const attachments = message.attachments.map(a => `${a.name} (${a.url})`).join('\n');
                        embed.fields.push({ name: 'Attachments', value: attachments, inline: false });
                        const firstImage = message.attachments.find(a => a.contentType?.startsWith('image/'));
                        if (firstImage) {
                            embed.image = { url: firstImage.url };
                        }
                    }

                    if (message.stickers?.size > 0) {
                        const stickers = message.stickers.map(s => s.name).join(', ');
                        embed.fields.push({ name: 'Stickers', value: stickers, inline: false });
                    }

                    await logChannel.send({ embeds: [embed] });
                }
            }
        } catch (err) {
            console.error('Error logging message deletion:', err);
        }
    });

    // Log bulk message deletions
    client.on('messageDeleteBulk', async (messages) => {
        const firstMessage = messages.first();
        if (!firstMessage?.guild) return;

        try {
            await db.query(`CREATE TABLE IF NOT EXISTS logging_channels (guild_id VARCHAR(32) PRIMARY KEY, channel_id VARCHAR(32))`);
            const logRes = await db.query('SELECT channel_id FROM logging_channels WHERE guild_id = $1', [firstMessage.guild.id]);
            if (logRes.rows.length) {
                const logChannel = firstMessage.guild.channels.cache.get(logRes.rows[0].channel_id);
                if (logChannel && logChannel.isTextBased()) {
                    const embed = {
                        color: 0xff0000,
                        title: '🗑️ Bulk Messages Deleted',
                        fields: [
                            { name: 'Channel', value: `<#${firstMessage.channel.id}>`, inline: true },
                            { name: 'Count', value: `${messages.size} messages`, inline: true }
                        ],
                        timestamp: new Date()
                    };

                    await logChannel.send({ embeds: [embed] });
                }
            }
        } catch (err) {
            console.error('Error logging bulk message deletion:', err);
        }
    });

    // Welcome new members
    client.on('guildMemberAdd', async (member) => {
        try {
            // Fetch welcome channel from DB
            await db.query(`CREATE TABLE IF NOT EXISTS welcome_channels (guild_id VARCHAR(32) PRIMARY KEY, channel_id VARCHAR(32))`);
            const res = await db.query('SELECT channel_id FROM welcome_channels WHERE guild_id = $1', [member.guild.id]);
            if (!res.rows.length) return;
            const channelId = res.rows[0].channel_id;
            const channel = member.guild.channels.cache.get(channelId);
            if (!channel || !channel.isTextBased || !channel.isTextBased()) return;

            // Gather rep card info for the new member
            let displayName = member.displayName || member.user.username;
            let avatarURL = member.user.displayAvatarURL ? member.user.displayAvatarURL({ extension: 'png', size: 128 }) : member.user.avatarURL;
            // Fetch rep
            const repRes = await db.query('SELECT rep FROM user_rep WHERE user_id = $1', [member.id]);
            const userRep = repRes.rows.length ? repRes.rows[0].rep : 0;
            // Fetch XP and level
            const xpRes = await db.query('SELECT xp FROM user_xp WHERE user_id = $1', [member.id]);
            const xp = xpRes.rows.length ? xpRes.rows[0].xp : 0;
            const level = Math.floor(0.1 * Math.sqrt(xp));
            const xpNeeded = Math.floor(Math.pow((level + 1) / 0.1, 2)) - Math.floor(Math.pow(level / 0.1, 2));
            const xpCurrent = xp - Math.floor(Math.pow(level / 0.1, 2));
            // Fetch rank (by rep)
            const rankRes = await db.query('SELECT user_id FROM user_rep ORDER BY rep DESC');
            let rank = 1;
            if (rankRes.rows.length) {
                rank = rankRes.rows.findIndex(row => row.user_id === member.id) + 1;
                if (rank < 1) rank = 1;
            }
            // Fetch background color
            let bgColor = '#23272A';
            const bgRes = await db.query('SELECT background_color FROM user_rep_settings WHERE user_id = $1', [member.id]);
            const colorMap = {
                blue: '#3498db',
                red: '#e74c3c',
                black: '#23272A',
                white: '#ecf0f1',
                green: '#2ecc71',
                purple: '#9b59b6',
                orange: '#e67e22'
            };
            if (bgRes.rows.length && bgRes.rows[0].background_color && colorMap[bgRes.rows[0].background_color]) {
                bgColor = colorMap[bgRes.rows[0].background_color];
            }
            // Generate rep card image
            const { generateRepCard } = require('./repCard');
            const buffer = await generateRepCard({
                displayName,
                username: member.user.username,
                avatarURL,
                rep: userRep,
                rank,
                level,
                xp: xpCurrent,
                xpNeeded,
                bgColor
            });

            // Check for premium custom welcome
            const customWelcomeEnabled = await getPremiumFeature(member.guild.id, 'custom_welcome_enabled', false);
            const embedColor = await getPremiumEmbedColor(member.guild.id, 0x00ff00);
            
            if (customWelcomeEnabled) {
                // Premium welcome with rich embed
                const embed = {
                    color: embedColor,
                    title: `🎉 Welcome to ${member.guild.name}!`,
                    description: `Hey <@${member.id}>, we're excited to have you here!`,
                    thumbnail: { url: member.user.displayAvatarURL() || member.user.avatarURL },
                    fields: [
                        { name: '👤 Member', value: `${member.user.tag}`, inline: true },
                        { name: '📊 Member #', value: `${member.guild.memberCount}`, inline: true },
                        { name: '⭐ Reputation', value: `${userRep}`, inline: true },
                        { name: '🎯 Level', value: `${level}`, inline: true },
                        { name: '💫 XP', value: `${xp}`, inline: true },
                        { name: '🏆 Rank', value: `#${rank}`, inline: true }
                    ],
                    image: { url: 'attachment://rep_card.png' },
                    footer: { text: `Welcome! • ${member.guild.name}`, icon_url: member.guild.iconURL() },
                    timestamp: new Date()
                };

                await channel.send({
                    embeds: [embed],
                    files: [{ attachment: buffer, name: 'rep_card.png' }]
                });
            } else {
                // Standard welcome message
                await channel.send({
                    content: `Welcome to the server, <@${member.id}>! 🎉 Here is your rep card:`,
                    files: [{ attachment: buffer, name: 'rep_card.png' }]
                });
            }
        } catch (err) {
            console.error('Error sending welcome message:', err);
        }

        // Log member join to logging channel
        try {
            await db.query(`CREATE TABLE IF NOT EXISTS logging_channels (guild_id VARCHAR(32) PRIMARY KEY, channel_id VARCHAR(32))`);
            const logRes = await db.query('SELECT channel_id FROM logging_channels WHERE guild_id = $1', [member.guild.id]);
            if (logRes.rows.length) {
                const logChannel = member.guild.channels.cache.get(logRes.rows[0].channel_id);
                if (logChannel && logChannel.isTextBased()) {
                    const embed = {
                        color: 0x00ff00,
                        title: '📥 Member Joined',
                        thumbnail: { url: member.user.displayAvatarURL ? member.user.displayAvatarURL() : member.user.avatarURL },
                        fields: [
                            { name: 'User', value: `<@${member.id}>`, inline: true },
                            { name: 'Username', value: member.user.tag, inline: true },
                            { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: false },
                            { name: 'Member Count', value: `${member.guild.memberCount}`, inline: true }
                        ],
                        timestamp: new Date(),
                        footer: { text: `User ID: ${member.id}` }
                    };
                    await logChannel.send({ embeds: [embed] });
                }
            }
        } catch (err) {
            console.error('Error logging member join:', err);
        }
    });

    // Log member leave
    client.on('guildMemberRemove', async (member) => {
        try {
            await db.query(`CREATE TABLE IF NOT EXISTS logging_channels (guild_id VARCHAR(32) PRIMARY KEY, channel_id VARCHAR(32))`);
            const logRes = await db.query('SELECT channel_id FROM logging_channels WHERE guild_id = $1', [member.guild.id]);
            if (logRes.rows.length) {
                const logChannel = member.guild.channels.cache.get(logRes.rows[0].channel_id);
                if (logChannel && logChannel.isTextBased()) {
                    // Check if this was a kick
                    const auditLogs = await member.guild.fetchAuditLogs({ limit: 1, type: 20 }).catch(() => null);
                    const kickLog = auditLogs?.entries.first();
                    const wasKicked = kickLog && kickLog.target.id === member.id && Date.now() - kickLog.createdTimestamp < 5000;
                    
                    // Check if this was a ban
                    const banLogs = await member.guild.fetchAuditLogs({ limit: 1, type: 22 }).catch(() => null);
                    const banLog = banLogs?.entries.first();
                    const wasBanned = banLog && banLog.target.id === member.id && Date.now() - banLog.createdTimestamp < 5000;
                    
                    // If kicked, log to moderation system (external kick)
                    if (wasKicked) {
                        const moderator = kickLog.executor;
                        const reason = kickLog.reason || 'No reason provided';
                        
                        // Check if we already logged this kick
                        const recentCase = await db.query(
                            `SELECT case_id FROM mod_cases WHERE user_id = $1 AND guild_id = $2 AND action = 'kick' 
                             AND created_at > NOW() - INTERVAL '5 seconds' ORDER BY created_at DESC LIMIT 1`,
                            [member.id, member.guild.id]
                        );
                        
                        if (recentCase.rows.length === 0) {
                            // This is an external kick - log it
                            const caseId = await db.query(
                                `INSERT INTO mod_cases (user_id, moderator_id, action, reason, guild_id)
                                 VALUES ($1, $2, 'kick', $3, $4) RETURNING case_id`,
                                [member.id, moderator.id, reason, member.guild.id]
                            );
                            
                            await db.query(
                                `INSERT INTO mod_logs (case_id, user_id, moderator_id, action, reason, guild_id)
                                 VALUES ($1, $2, $3, 'kick', $4, $5)`,
                                [caseId.rows[0].case_id, member.id, moderator.id, reason, member.guild.id]
                            );
                            
                            // Send to mod log channel
                            const modLogRes = await db.query('SELECT channel_id FROM mod_log_channels WHERE guild_id = $1', [member.guild.id]);
                            if (modLogRes.rows.length) {
                                const modChannel = member.guild.channels.cache.get(modLogRes.rows[0].channel_id);
                                if (modChannel && modChannel.isTextBased()) {
                                    const embed = {
                                        color: 0xff4757,
                                        title: `Case #${caseId.rows[0].case_id} | KICK (External)`,
                                        fields: [
                                            { name: 'User', value: `<@${member.id}> (${member.user.tag})`, inline: true },
                                            { name: 'Moderator', value: `<@${moderator.id}>`, inline: true },
                                            { name: 'Reason', value: reason, inline: false }
                                        ],
                                        timestamp: new Date(),
                                        footer: { text: `User ID: ${member.id}` }
                                    };
                                    await modChannel.send({ embeds: [embed] });
                                }
                            }
                        }
                    }
                    
                    if (!wasKicked && !wasBanned) {
                        // Regular leave (not kicked or banned) - log to logging channel
                        const embed = {
                            color: 0xff0000,
                            title: '📤 Member Left',
                            thumbnail: { url: member.user.displayAvatarURL ? member.user.displayAvatarURL() : member.user.avatarURL },
                            fields: [
                                { name: 'User', value: `<@${member.id}>`, inline: true },
                                { name: 'Username', value: member.user.tag, inline: true },
                                { name: 'Joined Server', value: member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown', inline: false },
                                { name: 'Member Count', value: `${member.guild.memberCount}`, inline: true }
                            ],
                            timestamp: new Date(),
                            footer: { text: `User ID: ${member.id}` }
                        };
                        await logChannel.send({ embeds: [embed] });
                    }
                }
            }
        } catch (err) {
            console.error('Error logging member leave:', err);
        }
    });

    // === AUTOMOD EVENT LOGGING ===
    // Log AutoMod rule execution (when AutoMod takes action)
    client.on('autoModerationActionExecution', async (execution) => {
        try {
            const { action, ruleTriggerType, user, guild, content, matchedContent } = execution;
            
            // Log to mod_logs table
            await db.query(
                `INSERT INTO mod_logs (user_id, moderator_id, action, reason, guild_id, created_at)
                 VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
                [
                    user.id,
                    guild.members.me.id, // Bot as moderator for AutoMod
                    'automod',
                    `AutoMod: ${ruleTriggerType} - Matched: ${matchedContent || 'N/A'}`,
                    guild.id
                ]
            );
            
            // Send to mod log channel if configured
            const res = await db.query('SELECT channel_id FROM mod_log_channels WHERE guild_id = $1', [guild.id]);
            if (res.rows.length) {
                const channel = guild.channels.cache.get(res.rows[0].channel_id);
                if (channel && channel.isTextBased()) {
                    const actionType = action.type === 1 ? 'Block Message' : 
                                     action.type === 2 ? 'Send Alert' : 
                                     action.type === 3 ? 'Timeout' : 'Unknown';
                    
                    const embed = {
                        color: 0xff9500,
                        title: '🤖 AutoMod Action',
                        fields: [
                            { name: 'User', value: `<@${user.id}> (${user.tag})`, inline: true },
                            { name: 'Action Type', value: actionType, inline: true },
                            { name: 'Rule Type', value: ruleTriggerType, inline: true },
                            { name: 'Matched Content', value: matchedContent || 'N/A', inline: false },
                            { name: 'Original Message', value: content ? content.substring(0, 100) : 'N/A', inline: false }
                        ],
                        timestamp: new Date(),
                        footer: { text: `User ID: ${user.id}` }
                    };
                    
                    await channel.send({ embeds: [embed] });
                }
            }
        } catch (err) {
            console.error('Error logging AutoMod action:', err);
        }
    });

    // Log when members are banned (including AutoMod bans)
    client.on('guildBanAdd', async (ban) => {
        try {
            // Fetch audit log to see who banned and why
            const auditLogs = await ban.guild.fetchAuditLogs({
                limit: 1,
                type: 22 // MEMBER_BAN_ADD
            });
            
            const banLog = auditLogs.entries.first();
            if (banLog && banLog.target.id === ban.user.id) {
                const moderator = banLog.executor;
                const reason = banLog.reason || 'No reason provided';
                
                // Only log if not already logged by our /ban command (check if it's within last 5 seconds)
                const recentCase = await db.query(
                    `SELECT case_id FROM mod_cases WHERE user_id = $1 AND guild_id = $2 AND action = 'ban' 
                     AND created_at > NOW() - INTERVAL '5 seconds' ORDER BY created_at DESC LIMIT 1`,
                    [ban.user.id, ban.guild.id]
                );
                
                if (recentCase.rows.length === 0) {
                    // This is an external ban (not from our bot)
                    const caseId = await db.query(
                        `INSERT INTO mod_cases (user_id, moderator_id, action, reason, guild_id)
                         VALUES ($1, $2, 'ban', $3, $4) RETURNING case_id`,
                        [ban.user.id, moderator.id, reason, ban.guild.id]
                    );
                    
                    await db.query(
                        `INSERT INTO mod_logs (case_id, user_id, moderator_id, action, reason, guild_id)
                         VALUES ($1, $2, $3, 'ban', $4, $5)`,
                        [caseId.rows[0].case_id, ban.user.id, moderator.id, reason, ban.guild.id]
                    );
                    
                    // Send to mod log
                    const res = await db.query('SELECT channel_id FROM mod_log_channels WHERE guild_id = $1', [ban.guild.id]);
                    if (res.rows.length) {
                        const channel = ban.guild.channels.cache.get(res.rows[0].channel_id);
                        if (channel && channel.isTextBased()) {
                            const embed = {
                                color: 0xff0000,
                                title: `Case #${caseId.rows[0].case_id} | BAN (External)`,
                                fields: [
                                    { name: 'User', value: `<@${ban.user.id}> (${ban.user.tag})`, inline: true },
                                    { name: 'Moderator', value: `<@${moderator.id}>`, inline: true },
                                    { name: 'Reason', value: reason, inline: false }
                                ],
                                timestamp: new Date(),
                                footer: { text: `User ID: ${ban.user.id}` }
                            };
                            await channel.send({ embeds: [embed] });
                        }
                    }
                }
            }
        } catch (err) {
            console.error('Error logging ban:', err);
        }
    });

    // === READY EVENT - Set Custom Bot Status ===
    client.once('clientReady', async () => {
        console.log(`✅ Logged in as ${client.user.tag}`);
        
        // Apply custom bot status from first premium server
        try {
            for (const guild of client.guilds.cache.values()) {
                const customStatus = await getPremiumFeature(guild.id, 'custom_status');
                if (customStatus) {
                    client.user.setActivity(customStatus);
                    console.log(`🎨 Using custom status from ${guild.name}: ${customStatus}`);
                    break;
                }
            }
        } catch (err) {
            console.error('Error setting custom status:', err);
        }
    });

    // === ROLE CHANGE LOGGING ===
    client.on('guildMemberUpdate', async (oldMember, newMember) => {
        try {
            // Check for role changes
            const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
            const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));
            
            if (addedRoles.size === 0 && removedRoles.size === 0) return;
            
            // Get logging channel
            await db.query(`CREATE TABLE IF NOT EXISTS logging_channels (guild_id VARCHAR(32) PRIMARY KEY, channel_id VARCHAR(32))`);
            const logRes = await db.query('SELECT channel_id FROM logging_channels WHERE guild_id = $1', [newMember.guild.id]);
            if (!logRes.rows.length) return;
            
            const logChannel = newMember.guild.channels.cache.get(logRes.rows[0].channel_id);
            if (!logChannel || !logChannel.isTextBased()) return;
            
            // Fetch audit logs to see who made the change
            const auditLogs = await newMember.guild.fetchAuditLogs({ limit: 1, type: 25 }).catch(() => null); // MEMBER_ROLE_UPDATE
            const roleLog = auditLogs?.entries.first();
            const moderator = roleLog && Date.now() - roleLog.createdTimestamp < 5000 ? roleLog.executor : null;
            
            // Log added roles
            if (addedRoles.size > 0) {
                const embed = {
                    color: 0x2ecc71,
                    title: '📝 Roles Added',
                    thumbnail: { url: newMember.user.displayAvatarURL() || newMember.user.avatarURL },
                    fields: [
                        { name: 'User', value: `<@${newMember.id}>`, inline: true },
                        { name: 'User Tag', value: newMember.user.tag, inline: true },
                        { name: 'Added Roles', value: addedRoles.map(r => `<@&${r.id}>`).join(', '), inline: false }
                    ],
                    timestamp: new Date()
                };
                
                if (moderator) {
                    embed.fields.push({ name: 'Added By', value: `<@${moderator.id}>`, inline: true });
                }
                
                await logChannel.send({ embeds: [embed] });
            }
            
            // Log removed roles
            if (removedRoles.size > 0) {
                const embed = {
                    color: 0xe74c3c,
                    title: '📝 Roles Removed',
                    thumbnail: { url: newMember.user.displayAvatarURL() || newMember.user.avatarURL },
                    fields: [
                        { name: 'User', value: `<@${newMember.id}>`, inline: true },
                        { name: 'User Tag', value: newMember.user.tag, inline: true },
                        { name: 'Removed Roles', value: removedRoles.map(r => `<@&${r.id}>`).join(', '), inline: false }
                    ],
                    timestamp: new Date()
                };
                
                if (moderator) {
                    embed.fields.push({ name: 'Removed By', value: `<@${moderator.id}>`, inline: true });
                }
                
                await logChannel.send({ embeds: [embed] });
            }
        } catch (err) {
            console.error('Error logging role changes:', err);
        }
    });

    // === MODERATION EVENT LOGGING (External kicks) ===
    // Note: guildMemberRemove for leaves and kicks is already handled above with logging channel

    client.login(process.env.BOT_TOKEN);

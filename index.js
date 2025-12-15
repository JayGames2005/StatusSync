// Removed invalid top-level imgsay handler. See below for correct placement.
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
        .setName('cases')
        .setDescription('View all moderation cases for a user')
        .addUserOption(option => option.setName('user').setDescription('User to view cases for').setRequired(true))
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

// Health check HTTP server for Railway
const http = require('http');
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            status: 'ok', 
            uptime: process.uptime(),
            botReady: client.isReady(),
            timestamp: new Date().toISOString()
        }));
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

server.listen(PORT, () => {
    console.log(`Health check server listening on port ${PORT}`);
});

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
                
                const embed = {
                    color: action === 'warn' ? 0xffa500 : action === 'timeout' ? 0xff6b6b : action === 'kick' ? 0xff4757 : action === 'ban' ? 0xff0000 : 0x00ff00,
                    title: `Case #${caseId} | ${action.toUpperCase()}`,
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
                    color: 0x3498db,
                    title: `Case #${caseId}`,
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
                
                await interaction.reply({ embeds: [embed], flags: 64 });
            } catch (err) {
                console.error(err);
                await interaction.reply({ content: 'Error fetching case: ' + err.message, flags: 64 });
            }
            return;
        }

        if (commandName === 'cases') {
            const user = interaction.options.getUser('user');
            
            if (!user) {
                await interaction.reply({ content: 'User not found.', flags: 64 });
                return;
            }
            
            try {
                const res = await db.query(
                    'SELECT * FROM mod_cases WHERE user_id = $1 AND guild_id = $2 ORDER BY created_at DESC LIMIT 10',
                    [user.id, interaction.guild.id]
                );
                
                if (!res.rows.length) {
                    await interaction.reply({ content: `No cases found for **${user.tag}**.`, flags: 64 });
                    return;
                }
                
                const cases = res.rows.map(c => 
                    `**Case #${c.case_id}** - ${c.action} - ${new Date(c.created_at).toLocaleDateString()} - ${c.reason || 'No reason'}`
                ).join('\n');
                
                const embed = {
                    color: 0x3498db,
                    title: `Cases for ${user.tag}`,
                    description: cases,
                    footer: { text: `User ID: ${user.id} | Showing last 10 cases` }
                };
                
                await interaction.reply({ embeds: [embed], flags: 64 });
            } catch (err) {
                console.error(err);
                await interaction.reply({ content: 'Error fetching cases: ' + err.message, flags: 64 });
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
        if (message.author.bot || !message.guild) return;

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

            // Send welcome message with rep card
            await channel.send({
                content: `Welcome to the server, <@${member.id}>! 🎉 Here is your rep card:`,
                files: [{ attachment: buffer, name: 'rep_card.png' }]
            });
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

    // === MODERATION EVENT LOGGING (External kicks) ===
    // Note: guildMemberRemove for leaves and kicks is already handled above with logging channel

    client.login(process.env.BOT_TOKEN);

    // Optional: Start dashboard if ENABLE_DASHBOARD=true
    if (process.env.ENABLE_DASHBOARD === 'true') {
        console.log('Starting dashboard server...');
        require('./dashboard/server');
    }

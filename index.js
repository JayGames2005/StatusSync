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
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

    // Handle slash commands
    client.on('interactionCreate', async (interaction) => {
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
        if (commandName === 'rep') {
            const user = interaction.options.getUser('user') || interaction.user;
            let displayName = user.username;
            if (interaction.guild) {
                const member = await interaction.guild.members.fetch(user.id).catch(() => null);
                if (member && member.displayName) displayName = member.displayName;
            }
            try {
                const result = await db.query('SELECT rep FROM user_rep WHERE user_id = $1', [user.id]);
                const userRep = result.rows.length ? result.rows[0].rep : 0;
                // Calculate reps left for the requesting user
                const now = new Date();
                const since = new Date(now.getTime() - 12 * 60 * 60 * 1000);
                await db.query(`CREATE TABLE IF NOT EXISTS rep_give_log (giver_id VARCHAR(32), time TIMESTAMP)`);
                const logRes = await db.query('SELECT COUNT(*) FROM rep_give_log WHERE giver_id = $1 AND time > $2', [interaction.user.id, since]);
                const repsLeft = Math.max(0, 2 - parseInt(logRes.rows[0].count));
                const embed = {
                    color: 0x0099ff,
                    title: `${displayName}'s Reputation`,
                    description: `Rep: **${userRep}**\nReps you can give in next 12h: **${repsLeft}**`,
                    thumbnail: { url: user.displayAvatarURL ? user.displayAvatarURL() : user.avatarURL },
                };
                await interaction.reply({ embeds: [embed] });
            } catch (err) {
                console.error(err);
                await interaction.reply({ content: 'Error fetching rep: ' + err.message, flags: 64 });
            }
            return;
        }
        if (commandName === 'addrep') {
            // Usage: !addrep @user [amount]
            if (!interaction.mentions.users.size) return interaction.reply('Usage: !addrep @user [amount] (amount can be 1, 2, -1, -2)');
            const user = interaction.mentions.users.first();
            let amount = 1;
            if (args.length && /^[-+]?\d+$/.test(args[0])) {
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
                // Log each rep action separately (e.g. +2 counts as 2 actions)
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
            // Usage: !negrep @user [amount]
            if (!interaction.mentions.users.size) return interaction.reply('Usage: !negrep @user [amount] (amount can be -1 or -2)');
            const user = interaction.mentions.users.first();
            let amount = -1;
            if (args.length && /^-\d+$/.test(args[0])) {
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
                console.error('XP Leaderboard error:', err);
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
                console.error('Weekly XP Leaderboard error:', err);
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
                interaction.channel.send('Database tables (user_rep, custom_commands) created or already exist!');
            } catch (err) {
                console.error(err);
                interaction.channel.send('Error creating tables: ' + err.message);
            }
            return;
        }
    });
client.commands = new Collection();

// --- STARBOARD FEATURE ---
client.on('messageReactionAdd', async (reaction, user) => {
    await ensureStarboardTable();
    try {
        // Only in guilds
        if (!reaction.message.guild) return;
        // Fetch full reaction/message if partial
        if (reaction.partial) await reaction.fetch();
        if (reaction.message.partial) await reaction.message.fetch();
        // Get starboard settings from DB
        await db.query(`CREATE TABLE IF NOT EXISTS starboard_settings (guild_id VARCHAR(32) PRIMARY KEY, channel_id VARCHAR(32), emoji TEXT, threshold INTEGER)`);
        const settingsRes = await db.query('SELECT * FROM starboard_settings WHERE guild_id = $1', [reaction.message.guild.id]);
        if (!settingsRes.rows.length) return;
        const { channel_id, emoji, threshold } = settingsRes.rows[0];
        // Debug: log emoji info
        console.log('[Starboard] Reaction emoji:', {
            name: reaction.emoji.name,
            id: reaction.emoji.id,
            identifier: reaction.emoji.identifier,
            unicode: reaction.emoji.toString(),
            config: emoji
        });
        // Match Unicode or custom emoji
        const isUnicode = !reaction.emoji.id;
        let emojiMatch = false;
        if (isUnicode) {
            // Unicode emoji: match by character or name
            emojiMatch = (reaction.emoji.name === emoji || reaction.emoji.toString() === emoji);
        } else {
            // Custom emoji: match by name or id
            emojiMatch = (reaction.emoji.name === emoji || reaction.emoji.id === emoji);
        }
        if (!emojiMatch) return;
        // Only trigger when threshold is met
        if (reaction.count < threshold) return;
        // Find the configured starboard channel
        let starboard = reaction.message.guild.channels.cache.get(channel_id);
        // Debug: log channel info
        console.log('[Starboard] Looking for channel_id:', channel_id);
        if (!starboard) {
            console.log('[Starboard] Channel not found in cache. Available text channels:');
            reaction.message.guild.channels.cache.filter(c => c.isTextBased && c.isTextBased()).forEach(c => {
                console.log(`- ${c.name} (${c.id})`);
            });
        } else {
            console.log('[Starboard] Found channel:', starboard.name, starboard.id);
        }
        if (!starboard || !starboard.isTextBased || !starboard.isTextBased()) return;
        // Prevent duplicate posts (by checking if already posted)
        const fetched = await starboard.messages.fetch({ limit: 100 });
        if (fetched.some(m => m.embeds[0]?.footer?.text?.includes(reaction.message.id))) return;
        // Build embed
        const embed = {
            color: 0xffd700,
            author: {
                name: reaction.message.author.tag,
                icon_url: reaction.message.author.displayAvatarURL()
            },
            description: reaction.message.content || '[No text]',
            fields: [
                { name: 'Jump to Message', value: `[Go to message](${reaction.message.url})` }
            ],
            footer: { text: `${emoji} ${reaction.count} | ${reaction.message.id}` },
            timestamp: new Date(reaction.message.createdTimestamp)
        };
        // Attach image if present
        if (reaction.message.attachments.size > 0) {
            const img = reaction.message.attachments.find(a => a.contentType && a.contentType.startsWith('image/'));
            if (img) embed.image = { url: img.url };
        }
        // Track starboarded message in DB
        await db.query(`INSERT INTO starboard_posts (message_id, author_id, stars, url, content, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (message_id) DO UPDATE SET stars = $3`, [
            reaction.message.id,
            reaction.message.author.id,
            reaction.count,
            reaction.message.url,
            reaction.message.content,
            new Date(reaction.message.createdTimestamp)
        ]);
        await starboard.send({ embeds: [embed] });
    } catch (err) {
        console.error('Starboard error:', err);
    }
});

client.once('clientReady', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// Welcome message
client.on('guildMemberAdd', member => {
    // Find welcome channel from DB
    (async () => {
        await db.query(`CREATE TABLE IF NOT EXISTS welcome_channels (guild_id VARCHAR(32) PRIMARY KEY, channel_id VARCHAR(32))`);
        const res = await db.query('SELECT channel_id FROM welcome_channels WHERE guild_id = $1', [member.guild.id]);
        let channel = null;
        if (res.rows.length) {
            channel = member.guild.channels.cache.get(res.rows[0].channel_id);
        }
        if (!channel) channel = member.guild.systemChannel;
        if (!channel) return;
        // Get rep
        let userRep = 0;
        try {
            const repRes = await db.query('SELECT rep FROM user_rep WHERE user_id = $1', [member.id]);
            userRep = repRes.rows.length ? repRes.rows[0].rep : 0;
        } catch {}
        // Use display name if available
        let displayName = member.displayName || member.user.username;
        const embed = {
            color: 0x00bfff,
            title: `Welcome, ${displayName}!`,
            description: `<@${member.id}> joined the server!\nRep: **${userRep}**`,
            thumbnail: { url: member.user.displayAvatarURL ? member.user.displayAvatarURL() : member.user.avatarURL },
        };
        channel.send({ content: `<@${member.id}> Welcome to the server!`, embeds: [embed] });
    })();
});



const customCommands = require('./custom_commands');

client.on('messageCreate', async (message) => {
    // !ask prefix command (AI Q&A)
    if (message.content.startsWith('!ask ')) {
        const question = message.content.slice(5).trim();
        if (!question) return message.reply('Ask me a question!');
        const sent = await message.reply('Thinking...');
        try {
            const answer = await askAI(question);
            await sent.edit(answer);
        } catch (err) {
            await sent.edit('AI error: ' + err.message);
        }
        return;
    }
    if (message.author.bot || !message.guild) return;
    if (!message.content.startsWith('!')) return;
    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    // XP SYSTEM: Add XP for every message (no level up messages)
    await ensureXpTables();
    await db.query('INSERT INTO user_xp (user_id, xp) VALUES ($1, 1) ON CONFLICT (user_id) DO UPDATE SET xp = user_xp.xp + 1', [message.author.id]);
    // Weekly XP
    const weekStart = getCurrentWeekStart();
    const res = await db.query('SELECT week_start FROM user_xp_weekly WHERE user_id = $1', [message.author.id]);
    if (!res.rows.length || res.rows[0].week_start !== weekStart) {
        // New week or new user: reset
        await db.query('INSERT INTO user_xp_weekly (user_id, xp, week_start) VALUES ($1, 1, $2) ON CONFLICT (user_id) DO UPDATE SET xp = 1, week_start = $2', [message.author.id, weekStart]);
    } else {
        await db.query('UPDATE user_xp_weekly SET xp = xp + 1 WHERE user_id = $1', [message.author.id]);
    }
    if (command === 'xpleaderboard') {
        // All-time XP leaderboard
        try {
            const members = await message.guild.members.fetch();
            const res = await db.query('SELECT user_id, xp FROM user_xp ORDER BY xp DESC LIMIT 10');
            if (!res.rows.length) {
                console.error('XP Leaderboard DB result:', res);
                message.channel.send('No XP data found.');
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
            message.channel.send({ embeds: [embed] });
        } catch (err) {
            console.error('XP Leaderboard error:', err);
            message.channel.send('Error fetching XP leaderboard: ' + err.message);
        }
        return;
    }
    if (command === 'xpweekly') {
        // Weekly XP leaderboard
        try {
            const members = await message.guild.members.fetch();
            const weekStart = getCurrentWeekStart();
            const res = await db.query('SELECT user_id, xp FROM user_xp_weekly WHERE week_start = $1 ORDER BY xp DESC LIMIT 10', [weekStart]);
            if (!res.rows.length) {
                console.error('Weekly XP Leaderboard DB result:', res);
                message.channel.send('No weekly XP data found.');
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
            message.channel.send({ embeds: [embed] });
        } catch (err) {
            console.error('Weekly XP Leaderboard error:', err);
            message.channel.send('Error fetching weekly XP leaderboard: ' + err.message);
        }
        return;
    }
    if (command === 'repleaderboard') {
        try {
            const members = await message.guild.members.fetch();
            const res = await db.query('SELECT user_id, rep FROM user_rep ORDER BY rep DESC LIMIT 10');
            if (!res.rows.length) {
                message.channel.send('No reputation data found.');
                return;
            }
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
            message.channel.send({ embeds: [embed] });
        } catch (err) {
            console.error(err);
            message.channel.send('Error fetching leaderboard: ' + err.message);
        }
        return;
    }
    if (message.author.bot || !message.guild) return;
    if (!message.content.startsWith('!')) return;
        if (command === 'negrep') {
            // Usage: !negrep @user [amount]
            if (!message.mentions.users.size) return message.reply('Usage: !negrep @user [amount] (amount can be -1 or -2)');
            const user = message.mentions.users.first();
            let amount = -1;
            if (args.length && /^-\d+$/.test(args[0])) {
                amount = parseInt(args.shift(), 10);
            }
            const validAmounts = [-1, -2];
            if (!validAmounts.includes(amount)) {
                return message.reply('Amount must be -1 or -2');
            }
            if (user.id === message.author.id) {
                return message.reply('You cannot neg rep yourself!');
            }
            // Limit: 2 rep actions per 12 hours
            const now = new Date();
            const since = new Date(now.getTime() - 12 * 60 * 60 * 1000);
            await db.query(`CREATE TABLE IF NOT EXISTS rep_give_log (giver_id VARCHAR(32), time TIMESTAMP)`);
            const logRes = await db.query('SELECT COUNT(*) FROM rep_give_log WHERE giver_id = $1 AND time > $2', [message.author.id, since]);
            const repsLeft = Math.max(0, 2 - parseInt(logRes.rows[0].count));
            if (repsLeft <= 0) {
                return message.reply('You can only give rep 2 times every 12 hours.');
            }
            if (Math.abs(amount) > repsLeft) {
                return message.reply(`You only have ${repsLeft} rep action${repsLeft === 1 ? '' : 's'} left.`);
            }
            let displayName = user.username;
            if (message.guild) {
                const member = await message.guild.members.fetch(user.id).catch(() => null);
                if (member && member.displayName) displayName = member.displayName;
            }
            try {
                await db.query(`INSERT INTO user_rep (user_id, rep) VALUES ($1, $2)
                    ON CONFLICT (user_id) DO UPDATE SET rep = user_rep.rep + $2`, [user.id, amount]);
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
                message.channel.send({ embeds: [embed] });
            } catch (err) {
                console.error(err);
                message.channel.send('Error updating rep: ' + err.message);
            }
            return;
        }
    // ...existing code...

    if (command === 'setupdb') {
        // Only allow server owner or admins to run this
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('You need Administrator permission to run this command.');
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
            message.channel.send('Database tables (user_rep, custom_commands) created or already exist!');
        } catch (err) {
            console.error(err);
            message.channel.send('Error creating tables: ' + err.message);
        }
        return;
    }
    if (command === 'rep') {
        const user = message.mentions.users.first() || message.author;
        let displayName = user.username;
        if (command === 'addrep') {
            // Usage: !addrep @user [amount]
            if (!message.mentions.users.size) return message.reply('Usage: !addrep @user [amount] (amount can be 1, 2, -1, -2)');
            const user = message.mentions.users.first();
            let amount = 1;
            if (args.length && /^[-+]?\d+$/.test(args[0])) {
                amount = parseInt(args.shift(), 10);
            }
            const validAmounts = [1, -1, 2, -2];
            if (!validAmounts.includes(amount)) {
                return message.reply('Amount must be one of: 1, -1, 2, -2');
            }
            if (user.id === message.author.id) {
                return message.reply('You cannot rep yourself!');
            }
            // Limit: 2 rep actions per 12 hours
            const now = new Date();
            const since = new Date(now.getTime() - 12 * 60 * 60 * 1000);
            await db.query(`CREATE TABLE IF NOT EXISTS rep_give_log (giver_id VARCHAR(32), time TIMESTAMP)`);
            const logRes = await db.query('SELECT COUNT(*) FROM rep_give_log WHERE giver_id = $1 AND time > $2', [message.author.id, since]);
            const repsLeft = Math.max(0, 2 - parseInt(logRes.rows[0].count));
            if (repsLeft <= 0) {
                return message.reply('You can only give rep 2 times every 12 hours.');
            }
            if (Math.abs(amount) > repsLeft) {
                return message.reply(`You only have ${repsLeft} rep action${repsLeft === 1 ? '' : 's'} left.`);
            }
            let displayName = user.username;
            if (message.guild) {
                const member = await message.guild.members.fetch(user.id).catch(() => null);
                if (member && member.displayName) displayName = member.displayName;
            }
            try {
                await db.query(`INSERT INTO user_rep (user_id, rep) VALUES ($1, $2)
                    ON CONFLICT (user_id) DO UPDATE SET rep = user_rep.rep + $2`, [user.id, amount]);
                // Log each rep action separately (e.g. +2 counts as 2 actions)
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
                message.channel.send({ embeds: [embed] });
            } catch (err) {
                console.error(err);
                message.channel.send('Error updating rep: ' + err.message);
            }
            return;
        }
        let displayName = user.username;
        if (message.guild) {
            const member = await message.guild.members.fetch(user.id).catch(() => null);
            if (member && member.displayName) displayName = member.displayName;
        }
        try {
            await db.query(`INSERT INTO user_rep (user_id, rep) VALUES ($1, $2)
                ON CONFLICT (user_id) DO UPDATE SET rep = user_rep.rep + $2`, [user.id, amount]);
            // Log each rep action separately (e.g. +2 counts as 2 actions)
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
            message.channel.send({ embeds: [embed] });
        } catch (err) {
            console.error(err);
            message.channel.send('Error updating rep: ' + err.message);
        }
        return;
    }

    if (command === 'negrep') {
        // Usage: !negrep @user [amount]
        if (!message.mentions.users.size) return message.reply('Usage: !negrep @user [amount] (amount can be -1 or -2)');
        const user = message.mentions.users.first();
        let amount = -1;
        if (args.length && /^-\d+$/.test(args[0])) {
            amount = parseInt(args.shift(), 10);
        }
        const validAmounts = [-1, -2];
        if (!validAmounts.includes(amount)) {
            return message.reply('Amount must be -1 or -2');
        }
        if (user.id === message.author.id) {
            return message.reply('You cannot neg rep yourself!');
        }
        // Limit: 2 rep actions per 12 hours
        const now = new Date();
        const since = new Date(now.getTime() - 12 * 60 * 60 * 1000);
        await db.query(`CREATE TABLE IF NOT EXISTS rep_give_log (giver_id VARCHAR(32), time TIMESTAMP)`);
        const logRes = await db.query('SELECT COUNT(*) FROM rep_give_log WHERE giver_id = $1 AND time > $2', [message.author.id, since]);
        const repsLeft = Math.max(0, 2 - parseInt(logRes.rows[0].count));
        if (repsLeft <= 0) {
            return message.reply('You can only give rep 2 times every 12 hours.');
        }
        if (Math.abs(amount) > repsLeft) {
            return message.reply(`You only have ${repsLeft} rep action${repsLeft === 1 ? '' : 's'} left.`);
        }
        let displayName = user.username;
        if (message.guild) {
            const member = await message.guild.members.fetch(user.id).catch(() => null);
            if (member && member.displayName) displayName = member.displayName;
        }
        try {
            await db.query(`INSERT INTO user_rep (user_id, rep) VALUES ($1, $2)
                ON CONFLICT (user_id) DO UPDATE SET rep = user_rep.rep + $2`, [user.id, amount]);
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
            message.channel.send({ embeds: [embed] });
        } catch (err) {
            console.error(err);
            message.channel.send('Error updating rep: ' + err.message);
        }
        return;
    }

    if (command === 'xpleaderboard') {
        try {
            const members = await message.guild.members.fetch();
            const res = await db.query('SELECT user_id, xp FROM user_xp ORDER BY xp DESC LIMIT 10');
            if (!res.rows.length) {
                message.channel.send('No XP data found.');
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
            message.channel.send({ embeds: [embed] });
        } catch (err) {
            console.error(err);
            message.channel.send('Error fetching XP leaderboard: ' + err.message);
        }
        return;
    }

    if (command === 'xpweekly') {
        try {
            const members = await message.guild.members.fetch();
            const weekStart = getCurrentWeekStart();
            const res = await db.query('SELECT user_id, xp FROM user_xp_weekly WHERE week_start = $1 ORDER BY xp DESC LIMIT 10', [weekStart]);
            if (!res.rows.length) {
                message.channel.send('No weekly XP data found.');
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
            message.channel.send({ embeds: [embed] });
        } catch (err) {
            console.error(err);
            message.channel.send('Error fetching weekly XP leaderboard: ' + err.message);
        }
        return;
    }
    if (command === 'setupdb') {
        // Only allow server owner or admins to run this
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('You need Administrator permission to run this command.');
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
            message.channel.send('Database tables (user_rep, custom_commands) created or already exist!');
        } catch (err) {
            console.error(err);
            message.channel.send('Error creating tables: ' + err.message);
        }
        return;
    }
    if (command === 'rep') {
        const user = message.mentions.users.first() || message.author;
        let displayName = user.username;
        if (message.guild) {
            const member = await message.guild.members.fetch(user.id).catch(() => null);
            if (member && member.displayName) displayName = member.displayName;
        }
        try {
            const result = await db.query('SELECT rep FROM user_rep WHERE user_id = $1', [user.id]);
            const userRep = result.rows.length ? result.rows[0].rep : 0;
            // Calculate reps left for the requesting user
            const now = new Date();
            const since = new Date(now.getTime() - 12 * 60 * 60 * 1000);
            await db.query(`CREATE TABLE IF NOT EXISTS rep_give_log (giver_id VARCHAR(32), time TIMESTAMP)`);
            const logRes = await db.query('SELECT COUNT(*) FROM rep_give_log WHERE giver_id = $1 AND time > $2', [message.author.id, since]);
            const repsLeft = Math.max(0, 2 - parseInt(logRes.rows[0].count));
            const embed = {
                color: 0x0099ff,
                title: `${displayName}'s Reputation`,
                description: `Rep: **${userRep}**\nReps you can give in next 12h: **${repsLeft}**`,
                thumbnail: { url: user.displayAvatarURL ? user.displayAvatarURL() : user.avatarURL },
            };
            message.channel.send({ embeds: [embed] });
        } catch (err) {
            console.error(err);
            message.channel.send('Error fetching rep: ' + err.message);
        }
        return;
    }
    if (command === 'addrep') {
        // Usage: !addrep @user [amount]
        if (!message.mentions.users.size) return message.reply('Usage: !addrep @user [amount] (amount can be 1, 2, -1, -2)');
        const user = message.mentions.users.first();
        let amount = 1;
        if (args.length && /^[-+]?\d+$/.test(args[0])) {
            amount = parseInt(args.shift(), 10);
        }
        const validAmounts = [1, -1, 2, -2];
        if (!validAmounts.includes(amount)) {
            return message.reply('Amount must be one of: 1, -1, 2, -2');
        }
        if (user.id === message.author.id) {
            return message.reply('You cannot rep yourself!');
        }
        // Limit: 2 rep actions per 12 hours
        const now = new Date();
        const since = new Date(now.getTime() - 12 * 60 * 60 * 1000);
        await db.query(`CREATE TABLE IF NOT EXISTS rep_give_log (giver_id VARCHAR(32), time TIMESTAMP)`);
        const logRes = await db.query('SELECT COUNT(*) FROM rep_give_log WHERE giver_id = $1 AND time > $2', [message.author.id, since]);
        const repsLeft = Math.max(0, 2 - parseInt(logRes.rows[0].count));
        if (repsLeft <= 0) {
            return message.reply('You can only give rep 2 times every 12 hours.');
        }
        if (Math.abs(amount) > repsLeft) {
            return message.reply(`You only have ${repsLeft} rep action${repsLeft === 1 ? '' : 's'} left.`);
        }
        let displayName = user.username;
        if (message.guild) {
            const member = await message.guild.members.fetch(user.id).catch(() => null);
            if (member && member.displayName) displayName = member.displayName;
        }
        try {
            await db.query(`INSERT INTO user_rep (user_id, rep) VALUES ($1, $2)
                ON CONFLICT (user_id) DO UPDATE SET rep = user_rep.rep + $2`, [user.id, amount]);
            // Log each rep action separately (e.g. +2 counts as 2 actions)
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
            message.channel.send({ embeds: [embed] });
        } catch (err) {
            console.error(err);
            message.channel.send('Error updating rep: ' + err.message);
        }
        return;
    }

    if (command === 'negrep') {
        // Usage: !negrep @user [amount]
        if (!message.mentions.users.size) return message.reply('Usage: !negrep @user [amount] (amount can be -1 or -2)');
        const user = message.mentions.users.first();
        let amount = -1;
        if (args.length && /^-\d+$/.test(args[0])) {
            amount = parseInt(args.shift(), 10);
        }
        const validAmounts = [-1, -2];
        if (!validAmounts.includes(amount)) {
            return message.reply('Amount must be -1 or -2');
        }
        if (user.id === message.author.id) {
            return message.reply('You cannot neg rep yourself!');
        }
        // Limit: 2 rep actions per 12 hours
        const now = new Date();
        const since = new Date(now.getTime() - 12 * 60 * 60 * 1000);
        await db.query(`CREATE TABLE IF NOT EXISTS rep_give_log (giver_id VARCHAR(32), time TIMESTAMP)`);
        const logRes = await db.query('SELECT COUNT(*) FROM rep_give_log WHERE giver_id = $1 AND time > $2', [message.author.id, since]);
        const repsLeft = Math.max(0, 2 - parseInt(logRes.rows[0].count));
        if (repsLeft <= 0) {
            return message.reply('You can only give rep 2 times every 12 hours.');
        }
        if (Math.abs(amount) > repsLeft) {
            return message.reply(`You only have ${repsLeft} rep action${repsLeft === 1 ? '' : 's'} left.`);
        }
        let displayName = user.username;
        if (message.guild) {
            const member = await message.guild.members.fetch(user.id).catch(() => null);
            if (member && member.displayName) displayName = member.displayName;
        }
        try {
            await db.query(`INSERT INTO user_rep (user_id, rep) VALUES ($1, $2)
                ON CONFLICT (user_id) DO UPDATE SET rep = user_rep.rep + $2`, [user.id, amount]);
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
            message.channel.send({ embeds: [embed] });
        } catch (err) {
            console.error(err);
            message.channel.send('Error updating rep: ' + err.message);
        }
        return;
    }

    if (command === 'xpleaderboard') {
        try {
            const members = await message.guild.members.fetch();
            const res = await db.query('SELECT user_id, xp FROM user_xp ORDER BY xp DESC LIMIT 10');
            if (!res.rows.length) {
                message.channel.send('No XP data found.');
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
            message.channel.send({ embeds: [embed] });
        } catch (err) {
            console.error(err);
            message.channel.send('Error fetching XP leaderboard: ' + err.message);
        }
        return;
    }

    if (command === 'xpweekly') {
        try {
            const members = await message.guild.members.fetch();
            const weekStart = getCurrentWeekStart();
            const res = await db.query('SELECT user_id, xp FROM user_xp_weekly WHERE week_start = $1 ORDER BY xp DESC LIMIT 10', [weekStart]);
            if (!res.rows.length) {
                message.channel.send('No weekly XP data found.');
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
            message.channel.send({ embeds: [embed] });
        } catch (err) {
            console.error(err);
            message.channel.send('Error fetching weekly XP leaderboard: ' + err.message);
        }
        return;
    }
    if (command === 'setupdb') {
        // Only allow server owner or admins to run this
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('You need Administrator permission to run this command.');
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
            message.channel.send('Database tables (user_rep, custom_commands) created or already exist!');
        } catch (err) {
            console.error(err);
            message.channel.send('Error creating tables: ' + err.message);
        }
        return;
    }
    if (command === 'rep') {
        const user = message.mentions.users.first() || message.author;
        let displayName = user.username;
        if (message.guild) {
            const member = await message.guild.members.fetch(user.id).catch(() => null);
            if (member && member.displayName) displayName = member.displayName;
        }
        try {
            const result = await db.query('SELECT rep FROM user_rep WHERE user_id = $1', [user.id]);
            const userRep = result.rows.length ? result.rows[0].rep : 0;
            // Calculate reps left for the requesting user
            const now = new Date();
            const since = new Date(now.getTime() - 12 * 60 * 60 * 1000);
            await db.query(`CREATE TABLE IF NOT EXISTS rep_give_log (giver_id VARCHAR(32), time TIMESTAMP)`);
            const logRes = await db.query('SELECT COUNT(*) FROM rep_give_log WHERE giver_id = $1 AND time > $2', [message.author.id, since]);
            const repsLeft = Math.max(0, 2 - parseInt(logRes.rows[0].count));
            const embed = {
                color: 0x0099ff,
                title: `${displayName}'s Reputation`,
                description: `Rep: **${userRep}**\nReps you can give in next 12h: **${repsLeft}**`,
                thumbnail: { url: user.displayAvatarURL ? user.displayAvatarURL() : user.avatarURL },
            };
            message.channel.send({ embeds: [embed] });
        } catch (err) {
            console.error(err);
            message.channel.send('Error fetching rep: ' + err.message);
        }
        return;
    }
    if (command === 'addrep') {
        // Usage: !addrep @user [amount]
        if (!message.mentions.users.size) return message.reply('Usage: !addrep @user [amount] (amount can be 1, 2, -1, -2)');
        const user = message.mentions.users.first();
        let amount = 1;
        if (args.length && /^[-+]?\d+$/.test(args[0])) {
            amount = parseInt(args.shift(), 10);
        }
        const validAmounts = [1, -1, 2, -2];
        if (!validAmounts.includes(amount)) {
            return message.reply('Amount must be one of: 1, -1, 2, -2');
        }
        if (user.id === message.author.id) {
            return message.reply('You cannot rep yourself!');
        }
        // Limit: 2 rep actions per 12 hours
        const now = new Date();
        const since = new Date(now.getTime() - 12 * 60 * 60 * 1000);
        await db.query(`CREATE TABLE IF NOT EXISTS rep_give_log (giver_id VARCHAR(32), time TIMESTAMP)`);
        const logRes = await db.query('SELECT COUNT(*) FROM rep_give_log WHERE giver_id = $1 AND time > $2', [message.author.id, since]);
        const repsLeft = Math.max(0, 2 - parseInt(logRes.rows[0].count));
        if (repsLeft <= 0) {
            return message.reply('You can only give rep 2 times every 12 hours.');
        }
        if (Math.abs(amount) > repsLeft) {
            return message.reply(`You only have ${repsLeft} rep action${repsLeft === 1 ? '' : 's'} left.`);
        }
        let displayName = user.username;
        if (message.guild) {
            const member = await message.guild.members.fetch(user.id).catch(() => null);
            if (member && member.displayName) displayName = member.displayName;
        }
        try {
            await db.query(`INSERT INTO user_rep (user_id, rep) VALUES ($1, $2)
                ON CONFLICT (user_id) DO UPDATE SET rep = user_rep.rep + $2`, [user.id, amount]);
            // Log each rep action separately (e.g. +2 counts as 2 actions)
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
            message.channel.send({ embeds: [embed] });
        } catch (err) {
            console.error(err);
            message.channel.send('Error updating rep: ' + err.message);
        }
        return;
    }

    if (command === 'negrep') {
        // Usage: !negrep @user [amount]
        if (!message.mentions.users.size) return message.reply('Usage: !negrep @user [amount] (amount can be -1 or -2)');
        const user = message.mentions.users.first();
        let amount = -1;
        if (args.length && /^-\d+$/.test(args[0])) {
            amount = parseInt(args.shift(), 10);
       
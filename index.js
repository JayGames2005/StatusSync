
require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection, REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
// Register slash commands
const commands = [
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
                await interaction.reply({ content: 'Error fetching leaderboard: ' + err.message, ephemeral: true });
            }
            return;
        }
        if (!interaction.isCommand()) return;
        const { commandName } = interaction;
        // Set welcome channel
        if (commandName === 'setwelcome') {
            if (!interaction.member.permissions.has('Administrator')) {
                await interaction.reply({ content: 'You need Administrator permission to set the welcome channel.', flags: 64 });
                return;
            }
            const channel = interaction.options.getChannel('channel');
            if (!channel || channel.type !== 0) { // 0 = GUILD_TEXT
                await interaction.reply({ content: 'Please select a text channel.', ephemeral: true });
                return;
            }
            await db.query(`CREATE TABLE IF NOT EXISTS welcome_channels (guild_id VARCHAR(32) PRIMARY KEY, channel_id VARCHAR(32))`);
            await db.query('INSERT INTO welcome_channels (guild_id, channel_id) VALUES ($1, $2) ON CONFLICT (guild_id) DO UPDATE SET channel_id = $2', [interaction.guild.id, channel.id]);
            await interaction.reply(`Welcome channel set to <#${channel.id}>!`);
            return;
        }

        // List custom commands
        if (commandName === 'listcmds') {
            const fs = require('fs');
            const path = require('path');
            const file = path.join(__dirname, 'custom_commands.json');
            let cmds = {};
            if (fs.existsSync(file)) {
                cmds = JSON.parse(fs.readFileSync(file, 'utf8'));
            }
            const names = Object.keys(cmds);
            if (names.length === 0) {
                await interaction.reply('No custom commands found.');
            } else {
                await interaction.reply('Custom commands: ' + names.map(n => '`' + n + '`').join(', '));
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
            customCommands.addCommand(name, response);
            await interaction.reply(`Custom command /${name} added!`);
            return;
        }
        // Remove custom command
        if (commandName === 'removecmd') {
            if (!interaction.member.permissions.has('Administrator')) {
                await interaction.reply({ content: 'You need Administrator permission to remove custom commands.', flags: 64 });
                return;
            }
            const name = interaction.options.getString('name').toLowerCase();
            const cmds = require('./custom_commands');
            const allCmds = require('fs').existsSync(require('path').join(__dirname, 'custom_commands.json')) ? require('fs').readFileSync(require('path').join(__dirname, 'custom_commands.json'), 'utf8') : '{}';
            if (!JSON.parse(allCmds)[name]) {
                await interaction.reply({ content: `Custom command /${name} does not exist.`, ephemeral: true });
                return;
            }
            // Remove command
            const cmdsObj = JSON.parse(allCmds);
            delete cmdsObj[name];
            require('fs').writeFileSync(require('path').join(__dirname, 'custom_commands.json'), JSON.stringify(cmdsObj, null, 2));
            await interaction.reply(`Custom command /${name} removed!`);
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
                await interaction.reply({ content: 'Error fetching rep: ' + err.message, ephemeral: true });
            }
            return;
        }
        if (commandName === 'addrep') {
            const user = interaction.options.getUser('user');
            const amount = interaction.options.getInteger('amount') ?? 1;
            const validAmounts = [1, -1, 2, -2];
            if (!user) {
                await interaction.reply({ content: 'You must specify a user to give rep to!', ephemeral: true });
                return;
            }
            if (!validAmounts.includes(amount)) {
                await interaction.reply({ content: 'Amount must be one of: 1, -1, 2, -2', ephemeral: true });
                return;
            }
            if (user.id === interaction.user.id) {
                await interaction.reply({ content: 'You cannot rep yourself!', ephemeral: true });
                return;
            }
            // Limit: 2 rep actions per 12 hours
            const now = new Date();
            const since = new Date(now.getTime() - 12 * 60 * 60 * 1000);
            await db.query(`CREATE TABLE IF NOT EXISTS rep_give_log (giver_id VARCHAR(32), time TIMESTAMP)`);
            const logRes = await db.query('SELECT COUNT(*) FROM rep_give_log WHERE giver_id = $1 AND time > $2', [interaction.user.id, since]);
            const repsLeft = Math.max(0, 2 - parseInt(logRes.rows[0].count));
            if (repsLeft <= 0) {
                await interaction.reply({ content: 'You can only give rep 2 times every 12 hours.', ephemeral: true });
                return;
            }
            if (Math.abs(amount) > repsLeft) {
                await interaction.reply({ content: `You only have ${repsLeft} rep action${repsLeft === 1 ? '' : 's'} left.`, ephemeral: true });
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
                await interaction.reply({ content: 'Error updating rep: ' + err.message, ephemeral: true });
            }
            return;
        }
    });
client.commands = new Collection();

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
    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

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
        if (!message.mentions.users.size) return message.reply('Mention a user to give rep!');
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
    if (command === 'addcmd') {
        if (args.length < 2) return message.reply('Usage: !addcmd <name> <response>');
        const name = args.shift().toLowerCase();
        const response = args.join(' ');
        customCommands.addCommand(name, response);
        message.channel.send(`Custom command !${name} added!`);
        return;
    }
    // Check for custom command
    const customResponse = customCommands.getCommand(command);
    if (customResponse) {
        message.channel.send(customResponse);
    }
});

client.login(process.env.BOT_TOKEN);

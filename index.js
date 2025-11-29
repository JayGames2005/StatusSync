
require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection, REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
// Register slash commands
const commands = [
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
        .addUserOption(option => option.setName('user').setDescription('User to give rep to').setRequired(true)),
];

async function registerSlashCommands() {
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

if (process.env.BOT_TOKEN && process.env.CLIENT_ID) {
    registerSlashCommands();
}
// Slash command handler
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === 'setupdb') {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: 'You need Administrator permission to run this command.', ephemeral: true });
        }
        try {
            await db.query(`
                CREATE TABLE IF NOT EXISTS user_rep (
                    user_id VARCHAR(32) PRIMARY KEY,
                    rep INTEGER DEFAULT 0
                );
            `);
            await interaction.reply('Database tables created or already exist!');
        } catch (err) {
            console.error(err);
            await interaction.reply('Error creating tables: ' + err.message);
        }
        return;
    }
    if (interaction.commandName === 'rep') {
        const user = interaction.options.getUser('user') || interaction.user;
        try {
            const result = await db.query('SELECT rep FROM user_rep WHERE user_id = $1', [user.id]);
            const userRep = result.rows.length ? result.rows[0].rep : 0;
            await interaction.reply(`${user.username} has ${userRep} rep.`);
        } catch (err) {
            console.error(err);
            await interaction.reply('Error fetching rep: ' + err.message);
        }
        return;
    }
    if (interaction.commandName === 'addrep') {
        const user = interaction.options.getUser('user');
        try {
            await db.query(`INSERT INTO user_rep (user_id, rep) VALUES ($1, 1)
                ON CONFLICT (user_id) DO UPDATE SET rep = user_rep.rep + 1`, [user.id]);
            const result = await db.query('SELECT rep FROM user_rep WHERE user_id = $1', [user.id]);
            const newRep = result.rows.length ? result.rows[0].rep : 1;
            await interaction.reply(`${user.username} now has ${newRep} rep!`);
        } catch (err) {
            console.error(err);
            await interaction.reply('Error updating rep: ' + err.message);
        }
        return;
    }
});

const db = require('./db');
const rep = require('./rep');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

client.commands = new Collection();

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// Welcome message
client.on('guildMemberAdd', member => {
    const channel = member.guild.systemChannel;
    if (channel) {
        channel.send(`Welcome to the server, ${member}!`);
    }
});



const customCommands = require('./custom_commands');

client.on('messageCreate', async (message) => {
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
            message.channel.send('Database tables created or already exist!');
        } catch (err) {
            console.error(err);
            message.channel.send('Error creating tables: ' + err.message);
        }
        return;
    }
    if (message.author.bot || !message.guild) return;
    if (!message.content.startsWith('!')) return;
    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'rep') {
        const user = message.mentions.users.first() || message.author;
        try {
            const result = await db.query('SELECT rep FROM user_rep WHERE user_id = $1', [user.id]);
            const userRep = result.rows.length ? result.rows[0].rep : 0;
            message.channel.send(`${user.username} has ${userRep} rep.`);
        } catch (err) {
            console.error(err);
            message.channel.send('Error fetching rep: ' + err.message);
        }
        return;
    }
    if (command === 'addrep') {
        if (!message.mentions.users.size) return message.reply('Mention a user to give rep!');
        const user = message.mentions.users.first();
        try {
            await db.query(`INSERT INTO user_rep (user_id, rep) VALUES ($1, 1)
                ON CONFLICT (user_id) DO UPDATE SET rep = user_rep.rep + 1`, [user.id]);
            const result = await db.query('SELECT rep FROM user_rep WHERE user_id = $1', [user.id]);
            const newRep = result.rows.length ? result.rows[0].rep : 1;
            message.channel.send(`${user.username} now has ${newRep} rep!`);
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

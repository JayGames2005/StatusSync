
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
        if (!interaction.isCommand()) return;
        const { commandName } = interaction;

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
                await interaction.reply({ content: 'You need Administrator permission to add custom commands.', ephemeral: true });
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
                await interaction.reply({ content: 'You need Administrator permission to remove custom commands.', ephemeral: true });
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

        if (commandName === 'setupdb') {
            if (!interaction.member.permissions.has('Administrator')) {
                await interaction.reply({ content: 'You need Administrator permission to run this command.', ephemeral: true });
                return;
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
                await interaction.reply({ content: 'Error creating tables: ' + err.message, ephemeral: true });
            }
            return;
        }
        if (commandName === 'rep') {
            const user = interaction.options.getUser('user') || interaction.user;
            try {
                const result = await db.query('SELECT rep FROM user_rep WHERE user_id = $1', [user.id]);
                const userRep = result.rows.length ? result.rows[0].rep : 0;
                await interaction.reply(`${user.username} has ${userRep} rep.`);
            } catch (err) {
                console.error(err);
                await interaction.reply({ content: 'Error fetching rep: ' + err.message, ephemeral: true });
            }
            return;
        }
        if (commandName === 'addrep') {
            const user = interaction.options.getUser('user');
            if (!user) {
                await interaction.reply({ content: 'You must specify a user to give rep to!', ephemeral: true });
                return;
            }
            try {
                await db.query(`INSERT INTO user_rep (user_id, rep) VALUES ($1, 1)
                    ON CONFLICT (user_id) DO UPDATE SET rep = user_rep.rep + 1`, [user.id]);
                const result = await db.query('SELECT rep FROM user_rep WHERE user_id = $1', [user.id]);
                const newRep = result.rows.length ? result.rows[0].rep : 1;
                await interaction.reply(`${user.username} now has ${newRep} rep!`);
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
    const channel = member.guild.systemChannel;
    if (channel) {
        channel.send(`Welcome to the server, ${member}!`);
    }
});



const customCommands = require('./custom_commands');

client.on('messageCreate', async (message) => {
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
            message.channel.send('Database tables created or already exist!');
        } catch (err) {
            console.error(err);
            message.channel.send('Error creating tables: ' + err.message);
        }
        return;
    }
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

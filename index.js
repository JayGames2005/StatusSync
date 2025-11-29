
require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');

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

    // TODO: Update rep system to use PostgreSQL
    if (command === 'rep') {
        const user = message.mentions.users.first() || message.author;
        // Placeholder: fetch rep from DB in future
        const userRep = rep.getRep(user.id);
        message.channel.send(`${user.username} has ${userRep} rep.`);
        return;
    }
    if (command === 'addrep') {
        if (!message.mentions.users.size) return message.reply('Mention a user to give rep!');
        const user = message.mentions.users.first();
        // Placeholder: update rep in DB in future
        const newRep = rep.addRep(user.id, 1);
        message.channel.send(`${user.username} now has ${newRep} rep!`);
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

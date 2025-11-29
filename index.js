
require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
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
    if (message.author.bot || !message.guild) return;
    if (!message.content.startsWith('!')) return;
    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'rep') {
        const user = message.mentions.users.first() || message.author;
        const userRep = rep.getRep(user.id);
        message.channel.send(`${user.username} has ${userRep} rep.`);
        return;
    }
    if (command === 'addrep') {
        if (!message.mentions.users.size) return message.reply('Mention a user to give rep!');
        const user = message.mentions.users.first();
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

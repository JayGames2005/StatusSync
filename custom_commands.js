// Simple in-memory custom command handler (persist to file for production)
const fs = require('fs');
const path = require('path');

const COMMANDS_FILE = path.join(__dirname, 'custom_commands.json');

function loadCommands() {
    if (!fs.existsSync(COMMANDS_FILE)) return {};
    return JSON.parse(fs.readFileSync(COMMANDS_FILE, 'utf8'));
}

function saveCommands(cmds) {
    fs.writeFileSync(COMMANDS_FILE, JSON.stringify(cmds, null, 2));
}

function addCommand(name, response) {
    const cmds = loadCommands();
    cmds[name] = response;
    saveCommands(cmds);
}

function getCommand(name) {
    const cmds = loadCommands();
    return cmds[name];
}

module.exports = { addCommand, getCommand };

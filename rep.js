// Simple JSON-based global reputation system
const fs = require('fs');
const path = require('path');

const REP_FILE = path.join(__dirname, 'rep.json');

function loadRep() {
    if (!fs.existsSync(REP_FILE)) return {};
    return JSON.parse(fs.readFileSync(REP_FILE, 'utf8'));
}

function saveRep(rep) {
    fs.writeFileSync(REP_FILE, JSON.stringify(rep, null, 2));
}

function addRep(userId, amount = 1) {
    const rep = loadRep();
    rep[userId] = (rep[userId] || 0) + amount;
    saveRep(rep);
    return rep[userId];
}

function getRep(userId) {
    const rep = loadRep();
    return rep[userId] || 0;
}

module.exports = { addRep, getRep };

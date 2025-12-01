
// PostgreSQL-based custom command handler
const db = require('./db');

async function ensureTable() {
    await db.query(`CREATE TABLE IF NOT EXISTS custom_commands (
        name VARCHAR(64) PRIMARY KEY,
        response TEXT NOT NULL
    )`);
}

async function addCommand(name, response) {
    await ensureTable();
    await db.query(
        'INSERT INTO custom_commands (name, response) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET response = $2',
        [name, response]
    );
}

async function getCommand(name) {
    await ensureTable();
    const res = await db.query('SELECT response FROM custom_commands WHERE name = $1', [name]);
    return res.rows.length ? res.rows[0].response : undefined;
}

async function removeCommand(name) {
    await ensureTable();
    await db.query('DELETE FROM custom_commands WHERE name = $1', [name]);
}

async function listCommands() {
    await ensureTable();
    const res = await db.query('SELECT name FROM custom_commands');
    return res.rows.map(row => row.name);
}

module.exports = { addCommand, getCommand, removeCommand, listCommands };

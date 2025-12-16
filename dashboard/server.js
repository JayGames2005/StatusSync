// Enhanced Express server for StatusSync Dashboard
const express = require('express');
const session = require('express-session');
const app = express();
const api = require('./api');
const path = require('path');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Static files
app.use('/dashboard', express.static(path.join(__dirname)));
app.get('/logo.svg', (req, res) => {
    res.sendFile(path.join(__dirname, 'logo.svg'));
});

// API routes
app.use('/dashboard/api', api);

// Root redirect
app.get('/', (req, res) => {
    res.redirect('/dashboard/frontend.html');
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

const PORT = process.env.DASHBOARD_PORT || process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`✅ StatusSync Dashboard running on http://localhost:${PORT}`);
    console.log(`📊 Access at: http://localhost:${PORT}/dashboard/frontend.html`);
});

module.exports = app;

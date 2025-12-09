// Simple Express server for dashboard
const express = require('express');
const app = express();
const api = require('./api');
const path = require('path');

app.use('/dashboard/api', api);
app.use('/dashboard', express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.redirect('/dashboard/frontend.html');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Dashboard running on port ${PORT}`);
});

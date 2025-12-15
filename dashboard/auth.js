// Discord OAuth2 Authentication
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;

function setupAuth(app, client) {
    // Serialize user
    passport.serializeUser((user, done) => {
        done(null, user);
    });

    passport.deserializeUser((obj, done) => {
        done(null, obj);
    });

    // Discord OAuth2 Strategy
    passport.use(new DiscordStrategy({
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: process.env.CALLBACK_URL || 'http://localhost:3000/dashboard/auth/callback',
        scope: ['identify', 'guilds']
    }, (accessToken, refreshToken, profile, done) => {
        // Store profile info
        profile.accessToken = accessToken;
        return done(null, profile);
    }));

    app.use(passport.initialize());
    app.use(passport.session());

    // Auth routes
    app.get('/dashboard/auth/login', passport.authenticate('discord'));

    app.get('/dashboard/auth/callback',
        passport.authenticate('discord', { failureRedirect: '/dashboard/auth/login' }),
        (req, res) => {
            res.redirect('/dashboard/frontend.html');
        }
    );

    app.get('/dashboard/auth/logout', (req, res) => {
        req.logout(() => {
            res.redirect('/dashboard/frontend.html');
        });
    });

    // Check if user is authenticated and has admin in at least one mutual guild
    app.get('/dashboard/auth/user', (req, res) => {
        if (!req.isAuthenticated()) {
            return res.json({ authenticated: false });
        }

        // Get user's guilds they have admin in
        const userGuilds = req.user.guilds || [];
        const botGuilds = client.guilds.cache.map(g => g.id);
        
        const mutualGuilds = userGuilds
            .filter(g => botGuilds.includes(g.id))
            .filter(g => (parseInt(g.permissions) & 0x8) === 0x8); // Administrator permission

        res.json({
            authenticated: true,
            user: {
                id: req.user.id,
                username: req.user.username,
                discriminator: req.user.discriminator,
                avatar: req.user.avatar
            },
            guilds: mutualGuilds
        });
    });

    // Middleware to protect API routes
    const requireAuth = (req, res, next) => {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const guildId = req.query.guild_id;
        if (!guildId) {
            return next();
        }

        // Check if user has admin in this guild
        const userGuilds = req.user.guilds || [];
        const guild = userGuilds.find(g => g.id === guildId);
        
        if (!guild || (parseInt(guild.permissions) & 0x8) !== 0x8) {
            return res.status(403).json({ error: 'You do not have admin permissions in this server' });
        }

        next();
    };

    return { requireAuth };
}

module.exports = setupAuth;

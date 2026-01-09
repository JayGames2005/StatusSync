# 🎯 Dashboard Files Summary

This document lists all dashboard files and their purposes.

## 📁 Core Dashboard Files

### Frontend Files
| File | Location | Purpose |
|------|----------|---------|
| `frontend.html` | `/dashboard/` | Main dashboard HTML interface |
| `frontend.js` | `/dashboard/` | Dashboard client-side JavaScript logic |
| `style.css` | `/dashboard/` | Dashboard styling and themes |
| `logo.svg` | `/dashboard/` | StatusSync logo for branding |

### Backend Files
| File | Location | Purpose |
|------|----------|---------|
| `server.js` | `/dashboard/` | Standalone dashboard server (optional) |
| `api.js` | `/dashboard/` | REST API endpoints for dashboard data |
| `auth.js` | `/dashboard/` | Discord OAuth2 authentication setup |
| `premium.js` | `/dashboard/` | Premium features and Stripe integration |

### Bot Integration
| File | Location | Purpose |
|------|----------|---------|
| `index.js` | `/` | Main bot file with integrated dashboard |
| `db.js` | `/` | Database connection and queries |
| `automod.js` | `/` | Auto-moderation system (premium) |
| `backup.js` | `/` | Backup & restore system (premium) |

## 📖 Documentation Files

| File | Purpose |
|------|---------|
| `DASHBOARD_SETUP.md` | Complete setup guide with detailed instructions |
| `DASHBOARD_QUICKSTART.md` | Quick 5-step startup guide |
| `DASHBOARD_CHECKLIST.md` | Step-by-step checklist for setup validation |
| `DASHBOARD_FILES.md` | This file - overview of all dashboard files |
| `.env.example` | Example environment variables configuration |

## 🔧 Utility Files

| File | Purpose |
|------|---------|
| `validate-dashboard.js` | Configuration validation script |
| `package.json` | Dependencies and npm scripts |

## 🌐 API Endpoints

The dashboard exposes these REST API routes:

### Authentication
- `GET /dashboard/auth/login` - Initiate Discord OAuth2 login
- `GET /dashboard/auth/callback` - OAuth2 callback handler
- `GET /dashboard/auth/logout` - Logout and clear session
- `GET /dashboard/auth/user` - Get current authenticated user

### Guild Management
- `GET /dashboard/api/guilds` - List guilds bot is in (filtered by user)
- `GET /dashboard/api/channels?guild_id=X` - Get channels in guild

### Statistics & Data
- `GET /dashboard/api/stats?guild_id=X` - Server statistics
- `GET /dashboard/api/cases?guild_id=X` - Moderation cases
- `GET /dashboard/api/modlogs?guild_id=X` - Moderation logs
- `GET /dashboard/api/userhistory?user_id=X&guild_id=Y` - User mod history

### Leaderboards
- `GET /dashboard/api/leaderboard/rep` - Reputation leaderboard
- `GET /dashboard/api/leaderboard/xp` - XP leaderboard
- `GET /dashboard/api/leaderboard/weekly` - Weekly XP leaderboard

### Settings
- `GET /dashboard/api/settings?guild_id=X` - Get all settings
- `POST /dashboard/api/settings/welcome` - Update welcome channel
- `POST /dashboard/api/settings/modlog` - Update mod log channel
- `POST /dashboard/api/settings/logging` - Update logging channel
- `POST /dashboard/api/settings/starboard` - Update starboard settings

### Premium Features
- `GET /dashboard/premium/tiers` - Available premium tiers
- `GET /dashboard/premium/status?guild_id=X` - Premium subscription status
- `GET /dashboard/premium/features?guild_id=X` - Get premium features config
- `POST /dashboard/premium/features` - Update premium features
- `POST /dashboard/premium/grant` - Grant premium (admin only)
- `POST /dashboard/premium/checkout` - Create Stripe checkout session
- `POST /dashboard/premium/webhook` - Stripe webhook handler

### Auto-Moderation (Premium)
- `GET /dashboard/api/automod/rules?guild_id=X` - Get auto-mod rules
- `POST /dashboard/api/automod/rules` - Update auto-mod rules
- `GET /dashboard/api/automod/violations?guild_id=X` - Recent violations

### Backup & Restore (Premium)
- `GET /dashboard/api/backup/list?guild_id=X` - List backups
- `POST /dashboard/api/backup/create` - Create new backup
- `POST /dashboard/api/backup/restore` - Restore from backup
- `DELETE /dashboard/api/backup/:id` - Delete backup

## 🎨 Dashboard Tabs

1. **Overview** - Server statistics, top users, moderation charts
2. **Moderation** - User history search, recent cases
3. **Leaderboards** - Rep, XP, and weekly rankings
4. **Settings** - Channel configuration, starboard setup
5. **Logs** - Detailed moderation logs
6. **Premium** - Subscription management and premium features

## 🔐 Authentication Flow

```
User → Click "Login" → Discord OAuth2 → Authorization → Callback 
→ Session Created → User Data Stored → Dashboard Access Granted
```

## 💎 Premium Features

- Custom bot status messages
- XP multipliers (1.0-5.0x)
- Custom embed colors
- Advanced auto-moderation rules
  - Spam detection
  - Bad words filter
  - Link blocking
  - Caps lock detection
- Custom welcome messages
- Server backup & restore
- Detailed analytics
- Priority support

## 📦 Required Dependencies

From `package.json`:
```json
{
  "discord.js": "^14.25.1",
  "express": "^4.18.2",
  "express-session": "^1.18.2",
  "passport": "^0.7.0",
  "passport-discord": "^0.1.4",
  "pg": "^8.16.3",
  "dotenv": "^17.2.3",
  "stripe": "^20.0.0"
}
```

## 🚀 Quick Commands

```bash
# Install dependencies
npm install

# Validate configuration
npm run validate

# Start bot with integrated dashboard
npm start

# Run standalone dashboard (not recommended)
npm run dashboard
```

## 📱 Dashboard URLs

- **Local Development**: `http://localhost:3000/dashboard/frontend.html`
- **Production**: `https://your-domain.com/dashboard/frontend.html`
- **Health Check**: `http://localhost:3000/health`

## 🎯 Environment Variables Needed

### Required
- `BOT_TOKEN` - Discord bot token
- `CLIENT_ID` - Discord application ID
- `CLIENT_SECRET` - Discord OAuth2 secret
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Random secret for sessions
- `ENABLE_DASHBOARD` - Set to `true`

### Optional
- `PORT` - Server port (default: 3000)
- `CALLBACK_URL` - OAuth2 callback URL
- `DASHBOARD_URL` - Dashboard base URL
- `ADMIN_KEY` - For testing premium features
- `STRIPE_SECRET_KEY` - For real payments
- `STRIPE_WEBHOOK_SECRET` - For Stripe webhooks
- Price IDs for each premium tier

## 🏗️ Architecture

```
┌─────────────────┐
│   Frontend      │
│  (Browser)      │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────┐
│   Express       │
│   Server        │
├─────────────────┤
│ • Static Files  │
│ • API Routes    │
│ • Auth Routes   │
│ • Premium API   │
└────────┬────────┘
         │
         ├───────────┐
         │           │
         ▼           ▼
┌─────────────┐ ┌─────────────┐
│  Discord    │ │ PostgreSQL  │
│  Bot/API    │ │  Database   │
└─────────────┘ └─────────────┘
```

## 📊 Database Tables Used

- `welcome_channels` - Welcome channel configuration
- `mod_log_channels` - Mod log channel configuration
- `logging_channels` - Logging channel configuration
- `starboard_settings` - Starboard configuration
- `mod_cases` - Moderation cases
- `mod_logs` - Detailed moderation logs
- `user_rep` - User reputation
- `user_xp` - All-time XP
- `user_xp_weekly` - Weekly XP
- `custom_commands` - Custom commands
- `premium_subscriptions` - Premium subscription status
- `premium_features` - Premium feature configuration
- `automod_rules` - Auto-moderation rules
- `automod_violations` - Auto-mod violation logs
- `server_backups` - Server configuration backups

## ✅ Testing the Dashboard

Run through this quick test:
1. Start bot: `npm start`
2. Open: `http://localhost:3000/dashboard/frontend.html`
3. Login with Discord
4. Select server
5. Click "Load"
6. Navigate through all tabs
7. Test saving settings
8. Check browser console for errors

If all works → Dashboard is fully functional! 🎉

---

**Last Updated**: 2025
**Version**: 1.0.0

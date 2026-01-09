# 🏗️ StatusSync Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERACTION                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Discord Client           Browser (Dashboard)                  │
│  ┌──────────┐             ┌──────────────┐                    │
│  │  Slash   │             │   Frontend   │                    │
│  │ Commands │             │    HTML/JS   │                    │
│  └────┬─────┘             └──────┬───────┘                    │
│       │                          │                             │
└───────┼──────────────────────────┼─────────────────────────────┘
        │                          │
        │ Discord API              │ HTTPS
        ▼                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      STATUSSYNC SERVER                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                    Express HTTP Server                   │  │
│  │                      (Port 3000)                         │  │
│  └──────────────┬──────────────────┬───────────────────────┘  │
│                 │                  │                           │
│     ┌───────────▼──────────┐  ┌───▼────────────┐             │
│     │   Discord Bot        │  │  Web Dashboard  │             │
│     │   (discord.js)       │  │    Routes       │             │
│     │                      │  │                 │             │
│     │ • Event Handlers     │  │ • /dashboard/   │             │
│     │ • Slash Commands     │  │ • /api/         │             │
│     │ • Interactions       │  │ • /auth/        │             │
│     │ • Moderation         │  │ • /premium/     │             │
│     └──────────┬───────────┘  └───┬─────────────┘             │
│                │                  │                             │
│                └──────────┬───────┘                             │
│                           │                                     │
│              ┌────────────▼─────────────┐                      │
│              │   Core Modules           │                      │
│              ├──────────────────────────┤                      │
│              │ • db.js                  │                      │
│              │ • automod.js             │                      │
│              │ • backup.js              │                      │
│              │ • rep.js                 │                      │
│              │ • custom_commands.js     │                      │
│              │ • ai.js                  │                      │
│              └────────────┬─────────────┘                      │
│                           │                                     │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌─────────────┐  ┌────────────┐           │
│  │  PostgreSQL  │  │   Discord   │  │   Stripe   │           │
│  │   Database   │  │   API/CDN   │  │  Payments  │           │
│  │              │  │             │  │ (Optional) │           │
│  │ • user_rep   │  │ • Gateway   │  │            │           │
│  │ • user_xp    │  │ • REST API  │  │ • Checkout │           │
│  │ • mod_cases  │  │ • OAuth2    │  │ • Webhooks │           │
│  │ • settings   │  │             │  │            │           │
│  │ • premium    │  │             │  │            │           │
│  └──────────────┘  └─────────────┘  └────────────┘           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Data Flow Examples

### Example 1: User Views Dashboard

```
User Browser
    │
    ├─→ GET /dashboard/frontend.html
    │   └─→ Express serves HTML/CSS/JS
    │
    ├─→ Click "Login with Discord"
    │   └─→ GET /dashboard/auth/login
    │       └─→ Redirect to Discord OAuth2
    │
    ├─→ User authorizes on Discord
    │   └─→ Discord redirects to /dashboard/auth/callback
    │       └─→ Passport creates session
    │           └─→ Redirect to dashboard
    │
    ├─→ Select server, click "Load"
    │   └─→ GET /dashboard/api/stats?guild_id=X
    │       └─→ API queries PostgreSQL
    │           └─→ Returns JSON data
    │               └─→ Dashboard renders stats
    │
    └─→ Dashboard fully loaded! 🎉
```

### Example 2: User Runs Slash Command

```
Discord User
    │
    ├─→ Types /rep @user
    │   └─→ Discord sends interaction to bot
    │       └─→ Bot queries database (db.js)
    │           └─→ SELECT * FROM user_rep WHERE user_id = ?
    │               └─→ Bot creates embed
    │                   └─→ Sends reply to Discord
    │                       └─→ User sees reputation! ⭐
```

### Example 3: Moderator Bans User

```
Moderator
    │
    ├─→ Uses /ban @user reason
    │   └─→ Bot receives interaction
    │       ├─→ Validates permissions
    │       ├─→ Bans user via Discord API
    │       ├─→ Inserts into mod_cases table
    │       ├─→ Inserts into mod_logs table
    │       └─→ Posts to mod log channel
    │
    └─→ Admin views in dashboard
        └─→ GET /dashboard/api/cases?guild_id=X
            └─→ Returns case from database
                └─→ Displays in Moderation tab 📋
```

## 📊 File Structure

```
StatusSync/
├── index.js                    # Main bot entry point
├── package.json               # Dependencies
├── .env                       # Environment config (DO NOT COMMIT!)
├── .env.example              # Environment template
│
├── Core Modules/
│   ├── db.js                 # Database connection
│   ├── automod.js            # Auto-moderation engine
│   ├── backup.js             # Backup/restore system
│   ├── rep.js                # Reputation system
│   ├── repCard.js            # Rep card generator
│   ├── custom_commands.js    # Custom commands
│   ├── ai.js                 # AI integration
│   ├── imgsay.js             # Image text generation
│   └── grant-premium.js      # Premium management
│
├── dashboard/
│   ├── frontend.html         # Dashboard UI
│   ├── frontend.js           # Dashboard logic
│   ├── style.css             # Dashboard styles
│   ├── logo.svg              # Bot logo
│   ├── api.js                # REST API endpoints
│   ├── auth.js               # OAuth2 authentication
│   ├── premium.js            # Premium features API
│   └── server.js             # Standalone server (optional)
│
├── fonts/                    # Custom fonts for images
│
└── Documentation/
    ├── README.md             # Main readme
    ├── GETTING_STARTED.md    # Quick start guide
    ├── DASHBOARD_SETUP.md    # Complete setup guide
    ├── DASHBOARD_QUICKSTART.md
    ├── DASHBOARD_CHECKLIST.md
    ├── DASHBOARD_FILES.md
    ├── ARCHITECTURE.md       # This file
    ├── MODERATION.md
    ├── PREMIUM_IMPLEMENTATION.md
    ├── STRIPE_SETUP.md
    └── RAILWAY_DEPLOY.md
```

## 🔐 Authentication Flow

```
┌─────────────┐
│   User      │
│   Browser   │
└──────┬──────┘
       │
       │ 1. Clicks "Login"
       ▼
┌────────────────────────┐
│  /dashboard/auth/login │
│  (Passport.js)         │
└──────┬─────────────────┘
       │
       │ 2. Redirects to Discord
       ▼
┌────────────────────────┐
│   Discord OAuth2       │
│   Authorization Page   │
└──────┬─────────────────┘
       │
       │ 3. User authorizes
       ▼
┌──────────────────────────┐
│ /dashboard/auth/callback │
│ (Receives code)          │
└──────┬───────────────────┘
       │
       │ 4. Exchange code for token
       ▼
┌────────────────────────┐
│  Get user profile      │
│  from Discord API      │
└──────┬─────────────────┘
       │
       │ 5. Create session
       ▼
┌────────────────────────┐
│  Store in session      │
│  cookie: { user: ... } │
└──────┬─────────────────┘
       │
       │ 6. Redirect to dashboard
       ▼
┌────────────────────────┐
│  Dashboard loaded!     │
│  Shows user's servers  │
└────────────────────────┘
```

## 💾 Database Schema (Simplified)

```
user_rep
├── user_id (PK)
├── rep
└── last_rep_given

user_xp
├── user_id (PK)
└── xp

user_xp_weekly
├── user_id (PK)
├── xp
└── week_start

mod_cases
├── case_id (PK)
├── guild_id
├── user_id
├── moderator_id
├── action (ban/kick/warn/etc)
├── reason
├── status
└── created_at

premium_subscriptions
├── guild_id (PK)
├── tier (basic/pro/enterprise)
├── stripe_subscription_id
├── status
├── started_at
└── expires_at

automod_rules
├── id (PK)
├── guild_id
├── rule_type (spam/bad_words/links/caps)
├── enabled
├── action
├── threshold
└── config (JSON)

...and many more!
```

## 🔌 API Endpoints Summary

### Public Endpoints
- `GET /` - Health check
- `GET /health` - Detailed health status

### Authentication Endpoints
- `GET /dashboard/auth/login` - Start OAuth2 flow
- `GET /dashboard/auth/callback` - OAuth2 callback
- `GET /dashboard/auth/logout` - End session
- `GET /dashboard/auth/user` - Get current user

### Dashboard API (Requires Auth)
- `GET /dashboard/api/guilds` - List user's guilds
- `GET /dashboard/api/stats` - Server statistics
- `GET /dashboard/api/cases` - Moderation cases
- `GET /dashboard/api/settings` - Server settings
- `POST /dashboard/api/settings/*` - Update settings

### Premium API
- `GET /dashboard/premium/status` - Check premium status
- `GET /dashboard/premium/tiers` - List available tiers
- `POST /dashboard/premium/checkout` - Create payment session
- `POST /dashboard/premium/webhook` - Stripe webhook

## 🎯 Key Technologies

| Technology | Purpose | Version |
|------------|---------|---------|
| Node.js | Runtime | v18+ |
| discord.js | Discord API | v14.25.1 |
| Express | HTTP Server | v4.18.2 |
| Passport | Authentication | v0.7.0 |
| PostgreSQL | Database | v8+ |
| Stripe | Payments | v20.0.0 |

## 🚀 Deployment Architecture

```
┌─────────────────────────────────────┐
│          Production Setup           │
├─────────────────────────────────────┤
│                                     │
│  Railway / Heroku / VPS            │
│  ┌─────────────────────────────┐  │
│  │   StatusSync Application     │  │
│  │   (Node.js Process)          │  │
│  │                              │  │
│  │   • Discord Bot              │  │
│  │   • HTTP Server              │  │
│  │   • Dashboard                │  │
│  └──────────┬───────────────────┘  │
│             │                       │
│             │ DATABASE_URL          │
│             ▼                       │
│  ┌─────────────────────────────┐  │
│  │   PostgreSQL Database        │  │
│  │   (Railway/Heroku Addon)     │  │
│  └─────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
         │
         │ HTTPS
         ▼
┌─────────────────────────────────────┐
│           End Users                 │
├─────────────────────────────────────┤
│  • Discord App                      │
│  • Web Browser (Dashboard)          │
└─────────────────────────────────────┘
```

## 💡 Best Practices

1. **Environment Variables**: Store ALL secrets in `.env`
2. **Database Connections**: Use connection pooling (pg.Pool)
3. **Error Handling**: Try-catch all async operations
4. **Logging**: Use console.log with emojis for clarity
5. **Authentication**: Always validate sessions
6. **Permissions**: Check Discord perms before actions
7. **Rate Limiting**: Respect Discord API limits
8. **Security**: Never expose tokens in client-side code

## 📈 Performance Considerations

- **Database Queries**: Use indexes on frequently queried columns
- **Caching**: Cache frequently accessed data (guild settings, etc.)
- **Connection Pooling**: Reuse database connections
- **Static Files**: Serve from CDN in production
- **Session Storage**: Consider Redis for distributed deployments

---

**Last Updated**: 2025
**Version**: 1.0.0

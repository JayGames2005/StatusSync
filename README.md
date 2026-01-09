# StatusSync Discord Bot

A comprehensive Discord bot with moderation, XP system, reputation tracking, and a powerful web dashboard.

## ✨ Features

### Core Features
- 🎉 Welcome messages for new members
- ⭐ Global reputation system synced across all servers
- 💬 Custom commands with ! prefix
- 📊 XP and leveling system (weekly and all-time)
- ⚖️ Advanced moderation tools (ban, kick, warn, timeout, etc.)
- 📝 Moderation logging and case management
- 🌟 Starboard system
- 🎫 Ticket system
- 🎁 Giveaway system
- 💭 Suggestion system
- 🔄 Reaction roles
- 🤖 AI integration (with OpenAI)

### Web Dashboard
- 🔐 Discord OAuth2 authentication
- 📊 Server statistics and analytics
- 👥 User leaderboards (XP and reputation)
- ⚙️ Server configuration (channels, starboard, etc.)
- 📋 Moderation case management
- 🔍 User history search
- 💎 Premium features management

### Premium Features
- 🎨 Custom bot status messages
- ⚡ XP multipliers (1.0-5.0x)
- 🎨 Custom embed colors
- 🛡️ Advanced auto-moderation rules
- 🖼️ Custom welcome images
- 💾 Server backup & restore
- 📈 Detailed analytics

## 🚀 Quick Start

### Prerequisites
- Node.js v18 or higher
- PostgreSQL database
- Discord Bot Account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/JayGames2005/StatusSync.git
   cd StatusSync
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and set required variables:
   - `BOT_TOKEN` - Your Discord bot token
   - `CLIENT_ID` - Discord application ID
   - `CLIENT_SECRET` - Discord OAuth2 secret
   - `DATABASE_URL` - PostgreSQL connection string
   - `SESSION_SECRET` - Random secret key
   - `ENABLE_DASHBOARD=true` - Enable web dashboard

4. **Setup Discord OAuth2**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Add redirect: `http://localhost:3000/dashboard/auth/callback`

5. **Start the bot**
   ```bash
   npm start
   ```

6. **Access the dashboard**
   - Open: `http://localhost:3000/dashboard/frontend.html`
   - Login with Discord
   - Select your server and enjoy!

## 📚 Documentation

- **[Quick Start Guide](DASHBOARD_QUICKSTART.md)** - Get started in 5 minutes
- **[Complete Setup Guide](DASHBOARD_SETUP.md)** - Detailed installation instructions
- **[Setup Checklist](DASHBOARD_CHECKLIST.md)** - Step-by-step validation
- **[Files Overview](DASHBOARD_FILES.md)** - Complete file structure and API docs
- **[Moderation Guide](SETUP_MODERATION.md)** - Moderation system setup
- **[Premium Setup](PREMIUM_IMPLEMENTATION.md)** - Premium features and Stripe
- **[Stripe Setup](STRIPE_SETUP.md)** - Payment processing configuration
- **[Railway Deployment](RAILWAY_DEPLOY.md)** - Deploy to Railway

## 🔧 Configuration

### Validate Your Setup
```bash
npm run validate
```

This will check:
- All required files exist
- Environment variables are set
- Database connection works
- Dependencies are installed

## 🎮 Commands

### User Commands
- `/rep [@user]` - Show reputation
- `/addrep @user [amount]` - Give reputation
- `/xpleaderboard` - Show XP leaderboard
- `/xpweekly` - Show weekly XP leaderboard
- `/repleaderboard` - Show reputation leaderboard

### Moderation Commands
- `/ban @user [reason]` - Ban a user
- `/kick @user [reason]` - Kick a user
- `/warn @user [reason]` - Warn a user
- `/timeout @user <duration> [reason]` - Timeout a user
- `/purge <count> [@user]` - Delete messages
- `/lock [#channel]` - Lock channel
- `/unlock [#channel]` - Unlock channel
- `/slowmode <seconds>` - Set slowmode

### Configuration Commands
- `/setwelcome #channel` - Set welcome channel
- `/setstarboard #channel [emoji] [threshold]` - Configure starboard
- `/setupdb` - Create database tables

### Custom Commands
- `/addcmd <name> <response>` - Add custom command
- `/removecmd <name>` - Remove custom command
- `/listcmds` - List all custom commands

## 🌐 Dashboard Features

### Overview Tab
- Server statistics (users, cases, commands)
- Top users by reputation and XP
- Moderation activity charts

### Moderation Tab
- Search user history
- View recent cases
- Case management

### Leaderboards Tab
- Reputation rankings
- All-time XP rankings
- Weekly XP rankings

### Settings Tab
- Configure welcome channel
- Set mod log channel
- Configure logging channel
- Set up starboard

### Premium Tab
- View subscription status
- Manage premium features
- Configure auto-moderation
- Backup & restore

## 💎 Premium Tiers

### Basic Premium ($4.99/month)
- Custom bot status
- XP multipliers
- Custom embed colors
- Priority support

### Pro Premium ($9.99/month)
- All Basic features
- Custom welcome images
- Auto-moderation rules
- Backup & restore
- Detailed analytics

### Enterprise ($19.99/month)
- All Pro features
- Dedicated support
- Custom development
- SLA guarantee
- White-label option

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run validation
npm run validate

# Start bot (with dashboard)
npm start

# Start standalone dashboard (not recommended)
npm run dashboard
```

## 📦 Tech Stack

- **Bot Framework**: discord.js v14
- **Backend**: Node.js, Express
- **Database**: PostgreSQL
- **Auth**: Passport.js with Discord OAuth2
- **Payments**: Stripe (optional)
- **AI**: OpenAI API (optional)

## 🔒 Security

- All sensitive data in environment variables
- Strong session secrets required
- OAuth2 for secure authentication
- SQL injection protection via parameterized queries
- CSRF protection via session tokens

## 🐛 Troubleshooting

### Dashboard won't load
- Check `ENABLE_DASHBOARD=true` in `.env`
- Verify Discord OAuth2 redirect URL is correct
- Clear browser cookies and try again

### "Bot is not ready" error
- Wait a few seconds for bot to connect
- Check BOT_TOKEN is valid
- Verify bot has proper intents enabled

### Database errors
- Verify DATABASE_URL is correct
- Ensure PostgreSQL is running
- Run `/setupdb` command to create tables

### Authentication issues
- Check CLIENT_ID and CLIENT_SECRET
- Verify OAuth2 redirect URL matches exactly
- Generate new SESSION_SECRET

## 📞 Support

For help and support:
- Read the documentation files
- Run `npm run validate` to check configuration
- Check [GitHub Issues](https://github.com/JayGames2005/StatusSync/issues)

## 📄 License

ISC License

## 🙏 Credits

Made with ❤️ for Discord communities

---

**Repository**: [github.com/JayGames2005/StatusSync](https://github.com/JayGames2005/StatusSync.git)


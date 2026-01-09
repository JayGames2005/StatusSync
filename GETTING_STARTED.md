# 🎯 Getting Started with StatusSync Dashboard

Welcome! This guide will help you get your StatusSync dashboard up and running in just a few minutes.

## 📋 What You'll Need

Before starting, make sure you have:
- ✅ Node.js v18+ installed ([Download](https://nodejs.org/))
- ✅ PostgreSQL database ([Download](https://www.postgresql.org/download/))
- ✅ Discord account
- ✅ Text editor (VS Code recommended)
- ✅ 15 minutes of your time

## 🚀 Step-by-Step Setup

### Step 1: Get the Code (1 minute)

```bash
# Clone or download the repository
git clone https://github.com/JayGames2005/StatusSync.git
cd StatusSync

# Install dependencies
npm install
```

### Step 2: Create Discord Application (3 minutes)

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Give it a name (e.g., "StatusSync")
4. Go to **Bot** section:
   - Click "Reset Token" and copy it (this is your `BOT_TOKEN`)
   - Enable these intents:
     - ✅ Presence Intent
     - ✅ Server Members Intent
     - ✅ Message Content Intent
5. Go to **OAuth2** section:
   - Copy "Client ID" (this is your `CLIENT_ID`)
   - Click "Reset Secret" and copy it (this is your `CLIENT_SECRET`)
   - Under "Redirects", add: `http://localhost:3000/dashboard/auth/callback`
   - Save Changes

### Step 3: Configure Environment (2 minutes)

```bash
# Create .env file from example
cp .env.example .env
```

Open `.env` in your text editor and fill in:

```env
# From Discord Developer Portal
BOT_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
CLIENT_SECRET=your_client_secret_here

# Your PostgreSQL database
DATABASE_URL=postgresql://username:password@localhost:5432/statussync

# Generate a random secret (or use the one below)
SESSION_SECRET=change_this_to_a_very_long_random_secret

# Dashboard settings
ENABLE_DASHBOARD=true
PORT=3000
CALLBACK_URL=http://localhost:3000/dashboard/auth/callback
```

**Pro Tip**: Generate a strong session secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 4: Setup Database (2 minutes)

Make sure PostgreSQL is running, then create a database:

```bash
# On Windows (Command Prompt)
psql -U postgres
CREATE DATABASE statussync;
\q

# On Mac/Linux
createdb statussync
```

The bot will automatically create all tables when it starts!

### Step 5: Invite Bot to Server (1 minute)

1. Go to Discord Developer Portal → Your Application → OAuth2 → URL Generator
2. Select scopes:
   - ✅ bot
   - ✅ applications.commands
3. Select bot permissions:
   - ✅ Administrator (or specific permissions you need)
4. Copy generated URL and open in browser
5. Select your test server and authorize

### Step 6: Validate Configuration (1 minute)

Before starting, validate everything is set up correctly:

```bash
npm run validate
```

If you see "✅ All checks passed!" - you're good to go!
If you see errors, fix them before continuing.

### Step 7: Start the Bot (1 minute)

```bash
npm start
```

You should see:
```
✅ HTTP server listening on port 3000
✅ Dashboard enabled with Discord OAuth2
📊 Dashboard: http://localhost:3000/dashboard/frontend.html
✅ StatusSync Bot logged in as YourBot#1234
```

### Step 8: Access Dashboard (2 minutes)

1. Open your browser
2. Go to: `http://localhost:3000/dashboard/frontend.html`
3. Click "Login with Discord"
4. Authorize the application
5. Select your server from dropdown
6. Click "Load"
7. 🎉 **You're in!**

## ✅ What's Next?

Now that your dashboard is running:

1. **Explore the tabs**:
   - Overview - See server stats
   - Moderation - Manage cases and warnings
   - Leaderboards - View top users
   - Settings - Configure channels
   - Premium - Check out premium features

2. **Configure your server**:
   - Set welcome channel
   - Configure mod log channel
   - Set up starboard

3. **Try commands in Discord**:
   - `/rep` - Check reputation
   - `/xpleaderboard` - View XP rankings
   - `/setupdb` - Create database tables

4. **Test premium features** (optional):
   ```bash
   # Grant premium for testing
   curl -X POST http://localhost:3000/dashboard/premium/grant \
     -H "Content-Type: application/json" \
     -d '{"guild_id":"YOUR_GUILD_ID","tier":"pro","admin_key":"test-premium-key-2025"}'
   ```

## 📚 More Resources

- **[Complete Setup Guide](DASHBOARD_SETUP.md)** - Detailed instructions
- **[Setup Checklist](DASHBOARD_CHECKLIST.md)** - Verify everything works
- **[Files Overview](DASHBOARD_FILES.md)** - API docs and architecture
- **[Troubleshooting](#-common-issues)** - Solutions to common problems

## 🐛 Common Issues

### ❌ "Not authenticated" error
**Solution**: Make sure you clicked "Login with Discord" and authorized the app

### ❌ "Bot is not ready"
**Solution**: Wait a few seconds for bot to connect to Discord, then refresh

### ❌ "Guild not found"
**Solution**: Make sure bot is invited to your server and you have admin permission

### ❌ Database connection error
**Solution**: 
- Check DATABASE_URL is correct
- Verify PostgreSQL is running
- Try connecting manually: `psql postgresql://your_url`

### ❌ "Invalid redirect_uri"
**Solution**: Make sure redirect URL in Discord matches exactly:
- Discord Portal: `http://localhost:3000/dashboard/auth/callback`
- .env CALLBACK_URL: `http://localhost:3000/dashboard/auth/callback`

### ❌ npm install fails
**Solution**:
- Update Node.js to v18+
- Clear npm cache: `npm cache clean --force`
- Delete `node_modules` and `package-lock.json`, then retry

## 💡 Pro Tips

1. **Keep .env secure** - Never commit it to git!
2. **Use strong passwords** - Especially for DATABASE_URL and SESSION_SECRET
3. **Test locally first** - Before deploying to production
4. **Enable all intents** - In Discord Developer Portal → Bot section
5. **Check logs** - Terminal shows helpful error messages

## 🎓 Learning More

### Discord Commands
After the bot is running, try these commands in Discord:
- `/help` - See all commands
- `/setupdb` - Create database tables
- `/setwelcome #channel` - Configure welcome messages
- `/ban @user reason` - Test moderation

### Dashboard Features
Explore each tab in the dashboard:
- **Overview**: Real-time server statistics
- **Moderation**: Manage warnings and cases
- **Leaderboards**: See top users
- **Settings**: Configure bot behavior
- **Premium**: Unlock advanced features

## 🎉 Success!

Congratulations! Your StatusSync dashboard is now fully operational.

**Having issues?** 
- Read [DASHBOARD_SETUP.md](DASHBOARD_SETUP.md) for detailed help
- Run `npm run validate` to diagnose problems
- Check logs in terminal for error messages

**Everything working?**
- ⭐ Star the repo on GitHub
- Share with your Discord community
- Consider premium features for advanced functionality

---

**Need Help?** Check [DASHBOARD_SETUP.md](DASHBOARD_SETUP.md) or [GitHub Issues](https://github.com/JayGames2005/StatusSync/issues)

**Ready for Production?** See [RAILWAY_DEPLOY.md](RAILWAY_DEPLOY.md) for deployment guide

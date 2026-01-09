# StatusSync Dashboard Setup Guide

This guide will help you set up and run the StatusSync web dashboard with Discord OAuth2 authentication.

## Prerequisites

1. **Node.js** (v18 or higher)
2. **PostgreSQL** database
3. **Discord Application** with OAuth2 configured
4. All dependencies installed: `npm install`

## Step 1: Configure Environment Variables

Create a `.env` file in the root directory by copying `.env.example`:

```bash
cp .env.example .env
```

### Required Variables

Edit the `.env` file with the following:

#### Discord Bot & OAuth2
```env
BOT_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_application_id
CLIENT_SECRET=your_discord_client_secret
CALLBACK_URL=http://localhost:3000/dashboard/auth/callback
```

**How to get these values:**
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. **BOT_TOKEN**: Go to "Bot" section → Reset Token
4. **CLIENT_ID**: Found on the "General Information" page (Application ID)
5. **CLIENT_SECRET**: Go to "OAuth2" section → Client Secret → Reset Secret
6. **CALLBACK_URL**: Must match exactly in OAuth2 Redirects (see Step 2)

#### Database
```env
DATABASE_URL=postgresql://user:password@localhost:5432/statussync
```

#### Dashboard Configuration
```env
ENABLE_DASHBOARD=true
PORT=3000
SESSION_SECRET=your_very_long_random_secret_key_here
```

**Generate a secure session secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Step 2: Configure Discord OAuth2

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Navigate to **OAuth2** section
4. Under **Redirects**, add:
   ```
   http://localhost:3000/dashboard/auth/callback
   ```
   For production, also add:
   ```
   https://your-domain.com/dashboard/auth/callback
   ```
5. Save changes

## Step 3: Setup Database

Make sure PostgreSQL is running and you have created a database.

The bot will automatically create all necessary tables when it starts, but you can also manually run:

```bash
psql -U your_username -d statussync
```

Then in the bot, use the `/setupdb` command to ensure all tables are created.

## Step 4: Start the Bot

Run the bot which includes the integrated dashboard:

```bash
npm start
```

You should see output like:
```
✅ HTTP server listening on port 3000
✅ Dashboard enabled with Discord OAuth2
📊 Dashboard: http://localhost:3000/dashboard/frontend.html
✅ StatusSync Bot logged in as YourBot#1234
```

## Step 5: Access the Dashboard

1. Open your browser and navigate to:
   ```
   http://localhost:3000/dashboard/frontend.html
   ```

2. Click "Login with Discord"

3. Authorize the application

4. Select a server from the dropdown (you must have Administrator permission)

5. Click "Load" to view the dashboard

## Dashboard Features

### Overview Tab
- Server statistics (users, mod cases, custom commands)
- Top users by reputation and XP
- Moderation activity charts

### Moderation Tab
- Search user moderation history
- View recent mod cases
- Case management

### Leaderboards Tab
- Reputation leaderboard
- All-time XP leaderboard
- Weekly XP leaderboard

### Settings Tab
- Configure welcome channel
- Set mod log channel
- Configure logging channel
- Set up starboard (emoji, threshold)

### Logs Tab
- View detailed moderation logs
- Filter by action, user, moderator

### Premium Tab
- View premium status
- Manage premium features (if subscribed):
  - Custom bot status
  - XP multipliers
  - Custom embed colors
  - Auto-moderation rules
  - Backup & Restore

## Optional: Enable Premium Features

### Test Premium (Without Payment)

To test premium features without setting up Stripe:

```bash
# Use curl or Postman to grant premium
curl -X POST http://localhost:3000/dashboard/premium/grant \
  -H "Content-Type: application/json" \
  -d '{
    "guild_id": "YOUR_GUILD_ID",
    "tier": "pro",
    "admin_key": "test-premium-key-2025"
  }'
```

### Setup Stripe (For Real Payments)

1. Create a [Stripe account](https://dashboard.stripe.com/)

2. Get API keys from Stripe Dashboard → Developers → API Keys

3. Add to `.env`:
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

4. Create Products and Prices in Stripe Dashboard

5. Add Price IDs to `.env`:
   ```env
   STRIPE_BASIC_PRICE_ID=price_...
   STRIPE_PRO_PRICE_ID=price_...
   STRIPE_ENTERPRISE_PRICE_ID=price_...
   ```

6. Setup webhook endpoint:
   - URL: `https://your-domain.com/dashboard/premium/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed`

## Troubleshooting

### "Not authenticated" error
- Make sure you've logged in with Discord
- Check that your OAuth2 callback URL is correct
- Clear browser cookies and try again

### "Bot is not ready" error
- Wait a few seconds for the bot to fully connect to Discord
- Check that BOT_TOKEN is valid

### "Guild not found" error
- Make sure the bot is invited to your server
- Verify you have Administrator permission in the server

### Database errors
- Check DATABASE_URL is correct
- Ensure PostgreSQL is running
- Run `/setupdb` command in Discord to create tables

### Session expired issues
- Generate a new SESSION_SECRET
- Increase cookie maxAge in `index.js` if needed
- Check browser allows cookies from localhost

## Production Deployment

### Railway Deployment

1. Push your code to GitHub

2. Create a new project on [Railway](https://railway.app)

3. Add PostgreSQL plugin

4. Set environment variables in Railway dashboard:
   - Copy all variables from `.env`
   - Update `CALLBACK_URL` to your Railway domain
   - Update `DASHBOARD_URL` to your Railway domain
   - Set `NODE_ENV=production`

5. Add OAuth2 redirect in Discord Developer Portal:
   ```
   https://your-app.railway.app/dashboard/auth/callback
   ```

6. Deploy!

### Heroku Deployment

1. Create Heroku app: `heroku create your-app-name`

2. Add PostgreSQL: `heroku addons:create heroku-postgresql:mini`

3. Set environment variables:
   ```bash
   heroku config:set BOT_TOKEN=your_token
   heroku config:set CLIENT_ID=your_id
   heroku config:set CLIENT_SECRET=your_secret
   # ... etc
   ```

4. Deploy: `git push heroku main`

## API Endpoints

The dashboard exposes these REST API endpoints:

- `GET /dashboard/api/guilds` - List bot guilds
- `GET /dashboard/api/stats?guild_id=...` - Server statistics
- `GET /dashboard/api/cases?guild_id=...` - Moderation cases
- `GET /dashboard/api/settings?guild_id=...` - Server settings
- `POST /dashboard/api/settings/welcome` - Update welcome channel
- `POST /dashboard/api/settings/modlog` - Update mod log channel
- `GET /dashboard/api/leaderboard/rep` - Reputation leaderboard
- `GET /dashboard/api/leaderboard/xp` - XP leaderboard
- `GET /dashboard/premium/status?guild_id=...` - Premium status
- `GET /dashboard/premium/tiers` - Available premium tiers

All API endpoints require authentication via Discord OAuth2 session.

## Security Notes

- Never commit `.env` file to version control
- Use strong SESSION_SECRET (32+ random characters)
- In production, set `cookie.secure: true` in session config (requires HTTPS)
- Restrict OAuth2 callback URLs to your actual domains
- Keep CLIENT_SECRET confidential
- Use environment variables for all sensitive data

## Support

For issues or questions:
1. Check this guide thoroughly
2. Review the console logs for errors
3. Check Discord Developer Portal for OAuth2 configuration
4. Verify all environment variables are set correctly

## Features Coming Soon

- [ ] User role management from dashboard
- [ ] Advanced analytics and graphs
- [ ] Custom command editor
- [ ] Audit log export
- [ ] Server insights dashboard
- [ ] Mobile-responsive improvements

---

**Built with ❤️ for Discord communities**

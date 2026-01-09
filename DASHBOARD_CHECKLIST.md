# Dashboard Setup Checklist

Use this checklist to ensure your StatusSync dashboard is fully configured.

## ✅ Prerequisites
- [ ] Node.js v18+ installed
- [ ] PostgreSQL database running
- [ ] Discord bot created and invited to server
- [ ] Git repository cloned/downloaded
- [ ] Dependencies installed (`npm install`)

## ✅ Discord Developer Portal Setup
- [ ] Created Discord application at https://discord.com/developers/applications
- [ ] Got Bot Token from Bot section
- [ ] Got Client ID from General Information
- [ ] Got Client Secret from OAuth2 section
- [ ] Added OAuth2 redirect URL: `http://localhost:3000/dashboard/auth/callback`
- [ ] Enabled "Presence Intent" in Bot section
- [ ] Enabled "Server Members Intent" in Bot section
- [ ] Enabled "Message Content Intent" in Bot section

## ✅ Environment Configuration
- [ ] Copied `.env.example` to `.env`
- [ ] Set `BOT_TOKEN` in `.env`
- [ ] Set `CLIENT_ID` in `.env`
- [ ] Set `CLIENT_SECRET` in `.env`
- [ ] Set `DATABASE_URL` in `.env`
- [ ] Generated and set strong `SESSION_SECRET` (32+ chars)
- [ ] Set `ENABLE_DASHBOARD=true` in `.env`
- [ ] Set `PORT=3000` in `.env`
- [ ] Set `CALLBACK_URL=http://localhost:3000/dashboard/auth/callback` in `.env`

## ✅ Database Setup
- [ ] PostgreSQL server is running
- [ ] Database created
- [ ] DATABASE_URL connection string is correct
- [ ] Can connect to database (run `npm run validate`)

## ✅ Optional: Premium Features
- [ ] Set `ADMIN_KEY` for testing premium without payment
- [ ] OR configured Stripe (STRIPE_SECRET_KEY, etc.) for real payments
- [ ] Created Stripe products and price IDs (if using Stripe)

## ✅ File Structure
- [ ] `dashboard/frontend.html` exists
- [ ] `dashboard/frontend.js` exists
- [ ] `dashboard/style.css` exists
- [ ] `dashboard/api.js` exists
- [ ] `dashboard/auth.js` exists
- [ ] `dashboard/premium.js` exists
- [ ] `dashboard/logo.svg` exists
- [ ] `index.js` exists
- [ ] `db.js` exists

## ✅ Validation
- [ ] Run `npm run validate` - all checks pass
- [ ] No critical errors reported

## ✅ Starting the Bot
- [ ] Run `npm start`
- [ ] See "✅ HTTP server listening on port 3000"
- [ ] See "✅ Dashboard enabled with Discord OAuth2"
- [ ] See "📊 Dashboard: http://localhost:3000/dashboard/frontend.html"
- [ ] See "✅ StatusSync Bot logged in as..."

## ✅ Testing Dashboard
- [ ] Open http://localhost:3000/dashboard/frontend.html
- [ ] Click "Login with Discord"
- [ ] Authorize application on Discord
- [ ] Redirected back to dashboard
- [ ] Can see server selector dropdown
- [ ] Select a server (must have admin permission)
- [ ] Click "Load"
- [ ] Dashboard loads with data

## ✅ Testing Features

### Overview Tab
- [ ] Shows server statistics (users, cases, commands)
- [ ] Shows top users by reputation
- [ ] Shows top users by XP
- [ ] Shows moderation activity chart

### Moderation Tab
- [ ] Can search user history by ID
- [ ] Shows recent mod cases
- [ ] Cases display correctly

### Leaderboards Tab
- [ ] Shows reputation leaderboard
- [ ] Shows XP leaderboard (all-time)
- [ ] Shows weekly XP leaderboard

### Settings Tab
- [ ] Can see channel dropdowns
- [ ] Can select welcome channel
- [ ] Can select mod log channel
- [ ] Can select logging channel
- [ ] Can select starboard channel
- [ ] Can configure starboard emoji/threshold
- [ ] Clicking "Save" works without errors

### Logs Tab
- [ ] Shows moderation logs
- [ ] Logs display with correct formatting

### Premium Tab
- [ ] Shows current premium status
- [ ] If no premium: shows tier options
- [ ] If premium: shows feature controls

## 🎉 Success!
If all items are checked, your dashboard is fully working!

## 🐛 Troubleshooting
If something doesn't work:
1. Check browser console (F12) for JavaScript errors
2. Check terminal/console for server errors
3. Verify all environment variables are set correctly
4. Make sure bot has admin permission in test server
5. Clear browser cookies and try logging in again
6. Read DASHBOARD_SETUP.md for detailed help

## 📚 Additional Resources
- **Quick Start**: DASHBOARD_QUICKSTART.md
- **Full Guide**: DASHBOARD_SETUP.md
- **Validation Script**: Run `npm run validate`
- **Discord Developer Portal**: https://discord.com/developers/applications

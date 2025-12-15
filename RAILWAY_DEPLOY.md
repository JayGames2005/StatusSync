# Railway Deployment Guide for StatusSync

## Quick Deploy to Railway

### Option 1: Deploy via GitHub (Recommended)

1. **Push your code to GitHub** (already done ✅)

2. **Go to Railway**
   - Visit [railway.app](https://railway.app)
   - Sign in with GitHub

3. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `StatusSync` repository

4. **Add PostgreSQL Database**
   - Click "New" → "Database" → "Add PostgreSQL"
   - Railway will automatically set `DATABASE_URL` environment variable

5. **Configure Environment Variables**
   Click on your service → Variables tab and add:
   ```
   BOT_TOKEN=your_discord_bot_token_here
   CLIENT_ID=your_discord_application_id_here
   OPENAI_API_KEY=your_openai_api_key_here (optional)
   SESSION_SECRET=random_secret_key_for_dashboard
   DASHBOARD_PORT=3001
   ```

6. **Deploy**
   - Railway will automatically detect your `railway.json` and `package.json`
   - Click "Deploy" or push to GitHub to trigger deployment

### Option 2: Deploy via Railway CLI

1. **Install Railway CLI**
   ```bash
   npm i -g @railway/cli
   ```

2. **Login**
   ```bash
   railway login
   ```

3. **Initialize Project**
   ```bash
   railway init
   ```

4. **Add PostgreSQL**
   ```bash
   railway add -d postgres
   ```

5. **Set Environment Variables**
   ```bash
   railway variables set BOT_TOKEN=your_token_here
   railway variables set CLIENT_ID=your_client_id_here
   railway variables set OPENAI_API_KEY=your_api_key_here
   railway variables set SESSION_SECRET=random_secret_here
   ```

6. **Deploy**
   ```bash
   railway up
   ```

## Environment Variables Required

| Variable | Description | Required |
|----------|-------------|----------|
| `BOT_TOKEN` | Your Discord bot token from Discord Developer Portal | ✅ Yes |
| `CLIENT_ID` | Your Discord application ID | ✅ Yes |
| `DATABASE_URL` | PostgreSQL connection string (auto-set by Railway) | ✅ Yes |
| `OPENAI_API_KEY` | OpenAI API key for AI features | ⚠️ Optional |
| `SESSION_SECRET` | Random secret for dashboard sessions | ✅ Yes |
| `DASHBOARD_PORT` | Port for dashboard (default: 3001) | ⚠️ Optional |

## Getting Your Discord Credentials

### Bot Token
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application (or create one)
3. Go to "Bot" section
4. Click "Reset Token" or "Copy" to get your bot token
5. ⚠️ **Never share this token publicly!**

### Client ID
1. In Discord Developer Portal
2. Select your application
3. Go to "General Information"
4. Copy "Application ID" (this is your CLIENT_ID)

### Invite Bot to Server
Use this URL (replace `YOUR_CLIENT_ID`):
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot%20applications.commands
```

## Database Setup

Railway automatically provides PostgreSQL, but you need to run setup:

### Option 1: Run Setup in Discord
Once your bot is deployed and running:
```
/setupdb
```

### Option 2: Connect and Run SQL
1. In Railway, go to your PostgreSQL service
2. Click "Connect" → "psql"
3. The bot will create tables automatically on first run

## Monitoring Your Deployment

### View Logs
In Railway dashboard:
- Click on your service
- Go to "Deployments" tab
- Click on the active deployment
- View logs in real-time

### Check Status
- Green = Running ✅
- Red = Failed ❌
- Yellow = Building 🔨

## Dashboard Access

Once deployed, your dashboard will be available at:
```
https://your-project-name.up.railway.app/dashboard/frontend.html
```

To enable the dashboard on Railway:
1. Go to your service settings
2. Under "Networking" → "Public Networking"
3. Click "Generate Domain"
4. Access your dashboard via the provided URL

## Scaling

Railway automatically handles:
- ✅ Auto-restart on crashes
- ✅ Automatic deploys on git push
- ✅ Environment variable management
- ✅ Database backups
- ✅ SSL/HTTPS

## Troubleshooting

### Bot Not Responding
1. Check logs for errors
2. Verify `BOT_TOKEN` is correct
3. Ensure bot has proper permissions
4. Check if bot is online in Discord

### Database Connection Errors
1. Verify PostgreSQL service is running
2. Check `DATABASE_URL` is set (Railway sets this automatically)
3. Run `/setupdb` command in Discord

### Dashboard Not Loading
1. Check if `DASHBOARD_PORT` is set
2. Verify public networking is enabled
3. Check logs for Express server errors
4. Try accessing `/health` endpoint first

### Build Failures
1. Check Node.js version (requires 18+)
2. Verify all dependencies in `package.json`
3. Check for syntax errors in code
4. Review build logs in Railway

## Cost Optimization

Railway pricing:
- **Free Tier**: $5 of usage per month
- **Pro Plan**: $20/month for teams

Tips to stay in free tier:
- Use sleep mode for non-production bots
- Optimize database queries
- Monitor usage in Railway dashboard

## Updates and Maintenance

### Auto-Deploy on Git Push
Railway automatically deploys when you push to your connected branch:
```bash
git add .
git commit -m "Update bot"
git push
```

### Manual Deploy
In Railway dashboard:
- Click "Deploy" → "Redeploy"

### Rollback
If something breaks:
- Click "Deployments" tab
- Find previous working deployment
- Click "Redeploy"

## Advanced Configuration

### Custom Domain
1. Go to service settings
2. "Networking" → "Custom Domains"
3. Add your domain
4. Configure DNS settings

### Multiple Services
Deploy bot and dashboard separately:
1. Create two services in Railway
2. Service 1: Bot (set start command: `node index.js`)
3. Service 2: Dashboard (set start command: `node dashboard/server.js`)
4. Both can share the same PostgreSQL database

### Environment-Specific Settings
Create different projects for:
- Development
- Staging  
- Production

## Security Best Practices

1. ✅ Never commit `.env` file
2. ✅ Use Railway's environment variables
3. ✅ Rotate tokens regularly
4. ✅ Enable 2FA on Discord and Railway accounts
5. ✅ Use strong `SESSION_SECRET`
6. ✅ Monitor logs for suspicious activity

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- StatusSync Issues: https://github.com/JayGames2005/StatusSync/issues

---

**Ready to deploy?** Just push to GitHub and let Railway do the rest! 🚀

# Quick Start Guide - StatusSync Dashboard

## Fastest Way to Get Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment
```bash
cp .env.example .env
```

Edit `.env` and add:
- `BOT_TOKEN` - Your Discord bot token
- `CLIENT_ID` - Your Discord application ID  
- `CLIENT_SECRET` - Your Discord OAuth2 client secret
- `DATABASE_URL` - Your PostgreSQL database URL
- `SESSION_SECRET` - Random string (run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- `ENABLE_DASHBOARD=true`
- `PORT=3000`
- `CALLBACK_URL=http://localhost:3000/dashboard/auth/callback`

### 3. Configure Discord OAuth2
1. Go to https://discord.com/developers/applications
2. Select your application → OAuth2
3. Add redirect: `http://localhost:3000/dashboard/auth/callback`
4. Save

### 4. Start the Bot
```bash
npm start
```

### 5. Open Dashboard
Navigate to: http://localhost:3000/dashboard/frontend.html

Click "Login with Discord" and enjoy!

---

**Need help?** Read [DASHBOARD_SETUP.md](DASHBOARD_SETUP.md) for detailed instructions.

# StatusSync Dashboard

A modern, responsive web dashboard for managing your StatusSync Discord bot.

## Features

### 📊 Overview
- Real-time server statistics
- Top users by reputation and XP
- Moderation activity charts
- Quick insights into your server

### ⚖️ Moderation Panel
- View all moderation cases
- Search user moderation history
- Filter and sort cases
- Real-time moderation logs

### 🏆 Leaderboards
- Reputation leaderboard
- All-time XP leaderboard
- Weekly XP leaderboard
- Starboard top posts

### ⚙️ Settings
- View server configuration
- Welcome channel settings
- Mod log channel settings
- Logging channel settings
- Starboard configuration
- Custom commands list

### 📝 Logs
- Complete moderation log history
- Detailed case information
- Filter by action type
- Export capabilities

## Setup

### 1. Install Dependencies
```bash
npm install
```

This will install:
- `express` - Web server
- `express-session` - Session management

### 2. Configure Environment
Add to your `.env` file:
```env
DASHBOARD_PORT=3001
SESSION_SECRET=your-secret-key-here-change-this
```

### 3. Start the Dashboard
```bash
npm run dashboard
```

Or run both bot and dashboard:
```bash
# Terminal 1 - Bot
npm start

# Terminal 2 - Dashboard
npm run dashboard
```

### 4. Access the Dashboard
Open your browser and navigate to:
```
http://localhost:3001/dashboard/frontend.html
```

## Usage

1. **Enter your Discord Server (Guild) ID**
   - Right-click your server icon in Discord
   - Click "Copy Server ID" (requires Developer Mode enabled)
   - Paste into the Server ID field on the dashboard
   - Click "Load"

2. **Navigate Between Tabs**
   - Overview: General statistics and insights
   - Moderation: Manage cases and view user histories
   - Leaderboards: View top users
   - Settings: View server configuration
   - Logs: Browse moderation logs

3. **Search User History**
   - Go to the Moderation tab
   - Enter a Discord User ID
   - Click "Search" to see all cases for that user

## API Endpoints

The dashboard provides a REST API:

### Statistics
- `GET /dashboard/api/stats?guild_id=<id>` - Server statistics
- `GET /dashboard/api/activity?guild_id=<id>` - Recent activity

### Moderation
- `GET /dashboard/api/cases?guild_id=<id>&limit=50` - Mod cases
- `GET /dashboard/api/modlogs?guild_id=<id>&limit=50` - Mod logs
- `GET /dashboard/api/userhistory?user_id=<id>&guild_id=<id>` - User history

### Leaderboards
- `GET /dashboard/api/leaderboard/rep?limit=10` - Rep leaderboard
- `GET /dashboard/api/leaderboard/xp?limit=10` - XP leaderboard
- `GET /dashboard/api/leaderboard/weekly?limit=10` - Weekly XP

### Settings
- `GET /dashboard/api/settings?guild_id=<id>` - Server settings
- `GET /dashboard/api/commands` - Custom commands

### Starboard
- `GET /dashboard/api/starboard?guild_id=<id>&limit=20` - Starboard posts

## Features

### 🎨 Modern UI
- Discord-themed color scheme
- Responsive design (mobile-friendly)
- Smooth animations and transitions
- Dark mode optimized

### 📊 Data Visualization
- Interactive charts for moderation activity
- Progress bars for statistics
- Color-coded badges for action types
- Real-time data updates

### 🔒 Security
- Session-based authentication ready
- Input validation
- Error handling
- Rate limiting ready

### 💾 Local Storage
- Remembers last used Guild ID
- Persistent settings
- Auto-reload on return

## Customization

### Colors
Edit `dashboard/style.css` CSS variables:
```css
:root {
    --bg-primary: #23272A;
    --accent: #5865F2;
    /* ... more variables */
}
```

### API Limits
Edit limits in `dashboard/api.js`:
```javascript
const { limit = 50 } = req.query;
// Change 50 to your preferred default
```

## Development

### File Structure
```
dashboard/
├── server.js       # Express server
├── api.js          # API endpoints
├── frontend.html   # Main HTML
├── frontend.js     # Client-side JavaScript
└── style.css       # Styles
```

### Adding New Features

1. **Add API Endpoint** in `api.js`:
```javascript
router.get('/myendpoint', async (req, res) => {
    // Your code
});
```

2. **Add Frontend Function** in `frontend.js`:
```javascript
async function fetchMyData() {
    const data = await apiRequest('myendpoint');
    // Handle data
}
```

3. **Update HTML** in `frontend.html`:
```html
<div id="my-data"></div>
```

## Troubleshooting

**Dashboard won't load**
- Check if the server is running
- Verify port 3001 is not in use
- Check console for errors

**No data showing**
- Ensure you entered the correct Guild ID
- Check that the bot is in that server
- Verify database connection

**API errors**
- Check database tables exist (run `/setupdb` in Discord)
- Verify Guild ID format (should be all numbers)
- Check server logs for details

## Production Deployment

For production deployment:

1. **Set proper environment variables**
```env
NODE_ENV=production
DASHBOARD_PORT=3001
SESSION_SECRET=<strong-random-secret>
```

2. **Use HTTPS**
- Update `secure: true` in session config
- Set up SSL certificate

3. **Add Authentication**
- Implement Discord OAuth2
- Add role-based access control
- Secure API endpoints

4. **Use Process Manager**
```bash
pm2 start dashboard/server.js --name "statussync-dashboard"
```

## Future Enhancements

- [ ] Discord OAuth2 login
- [ ] Real-time updates via WebSocket
- [ ] Advanced filtering and search
- [ ] Export data to CSV/JSON
- [ ] Customizable themes
- [ ] Mobile app
- [ ] Analytics and insights
- [ ] Automated reports

## Support

For issues or questions:
1. Check the main README.md
2. Review the API documentation
3. Check server logs
4. Open an issue on GitHub

---

Built with ❤️ for the StatusSync Discord Bot

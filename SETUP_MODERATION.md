# Quick Setup Guide - Moderation System

## 🚀 Getting Started

### Step 1: Update Dependencies (if needed)
The moderation system uses the existing discord.js v14 installation. No new packages needed!

### Step 2: Set Up Database Tables
Run this command in your Discord server:
```
/setupdb
```

This creates the necessary database tables:
- `mod_cases` - Stores all moderation cases
- `mod_logs` - Quick access moderation log
- `mod_log_channels` - Stores log channel configuration

### Step 3: Configure Mod Log Channel
Choose a channel for moderation logs (or create a new one like #mod-logs):
```
/setmodlog channel:#mod-logs
```

### Step 4: Grant Bot Permissions
Ensure your bot has these permissions in Discord:
- ✅ Moderate Members
- ✅ Kick Members
- ✅ Ban Members
- ✅ Send Messages
- ✅ Embed Links
- ✅ View Audit Log

### Step 5: (Optional) Enable Discord AutoMod
1. Go to Server Settings → Safety Setup
2. Click on AutoMod
3. Configure rules (Spam, Mentions, Keywords, etc.)
4. The bot will automatically log all AutoMod actions!

## 📋 Available Commands

| Command | Permission | Description |
|---------|------------|-------------|
| `/warn` | Moderate Members | Warn a user |
| `/timeout` | Moderate Members | Timeout a user (1-40320 minutes) |
| `/kick` | Kick Members | Kick a user from server |
| `/ban` | Ban Members | Ban a user permanently |
| `/unban` | Ban Members | Unban a user by ID |
| `/case` | Moderate Members | View a specific case |
| `/cases` | Moderate Members | View all cases for a user |
| `/setmodlog` | Administrator | Set mod log channel |

## 🎯 Quick Examples

**Warn someone:**
```
/warn user:@BadUser reason:Spamming in general chat
```

**Timeout for 1 hour:**
```
/timeout user:@BadUser duration:60 reason:Breaking rule 3
```

**Ban with message deletion:**
```
/ban user:@BadUser delete_messages:7 reason:Severe harassment
```

**Check user's history:**
```
/cases user:@BadUser
```

## 🤖 AutoMod Integration

Once AutoMod is enabled in Discord, the bot will automatically:
- ✅ Log all AutoMod actions
- ✅ Track blocked messages
- ✅ Record timeouts applied by AutoMod
- ✅ Store matched keywords/content
- ✅ Send detailed reports to mod-log channel

**Example AutoMod Log:**
```
🤖 AutoMod Action
━━━━━━━━━━━━━━━━━━
User: @Spammer
Action Type: Block Message
Rule Type: Spam
Matched Content: "BUY NOW!!!"
━━━━━━━━━━━━━━━━━━
```

## 📊 Features

✅ **Works with Discord's built-in moderation** - All actions use Discord's native features  
✅ **Automatic logging** - Tracks actions from Discord UI, other bots, and AutoMod  
✅ **User notifications** - DMs users when they're moderated  
✅ **Role hierarchy protection** - Can't moderate higher-ranked users  
✅ **Case tracking** - Every action gets a unique case number  
✅ **Rich embeds** - Beautiful, color-coded logs  
✅ **Audit log integration** - Syncs with Discord's audit log  

## 🔧 Troubleshooting

**Bot commands not showing up?**
- Restart Discord
- Check bot has "Use Slash Commands" permission
- Re-invite bot with correct permissions

**AutoMod actions not logging?**
- Verify `/setmodlog` is configured
- Check AutoMod rules are enabled in Server Settings
- Ensure bot has "View Audit Log" permission

**Can't moderate certain users?**
- Check role hierarchy (bot role must be higher)
- Verify you have the required permission
- Bot cannot moderate server owner

## 📝 Notes

- Case IDs auto-increment (don't worry about gaps)
- External actions (from Discord UI) are marked as "External"
- DM notifications silently fail if user has DMs disabled
- All timestamps are in your local timezone in embeds
- Database stores everything for future analytics

## 🎨 Customization

The system is ready to use out of the box, but you can customize:
- Log embed colors (edit `index.js` color values)
- Add more action types to the database
- Create custom reports from `mod_cases` table
- Build moderation statistics dashboards

## Need Help?

Check `MODERATION.md` for detailed documentation on all features!

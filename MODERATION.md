# Moderation System - StatusSync Bot

## Overview
StatusSync now includes a comprehensive moderation system that integrates seamlessly with Discord's built-in moderation features. The system tracks all moderation actions, logs them to the database, and can optionally send logs to a designated moderation channel.

## Features

### 1. **Moderation Commands**
All moderation commands require appropriate permissions and will not work on users with higher roles than the moderator.

#### `/warn` - Warn a User
- **Permission Required:** Moderate Members
- **Usage:** `/warn user:<user> reason:<optional>`
- **Description:** Issues a warning to a user. The warning is logged in the database and the user receives a DM notification.
- **Example:** `/warn user:@JohnDoe reason:Spamming in chat`

#### `/timeout` - Timeout a User
- **Permission Required:** Moderate Members
- **Usage:** `/timeout user:<user> duration:<minutes> reason:<optional>`
- **Description:** Times out a user using Discord's native timeout feature. Duration is in minutes (1-40320, max 28 days).
- **Example:** `/timeout user:@JohnDoe duration:60 reason:Breaking rules`
- **Note:** Uses Discord's built-in timeout mechanism, appears in Discord's audit log.

#### `/kick` - Kick a User
- **Permission Required:** Kick Members
- **Usage:** `/kick user:<user> reason:<optional>`
- **Description:** Kicks a user from the server. User can rejoin with a new invite.
- **Example:** `/kick user:@JohnDoe reason:Repeated violations`

#### `/ban` - Ban a User
- **Permission Required:** Ban Members
- **Usage:** `/ban user:<user> reason:<optional> delete_messages:<0-7 days>`
- **Description:** Permanently bans a user from the server. Optionally deletes their messages from the last 0-7 days.
- **Example:** `/ban user:@JohnDoe delete_messages:1 reason:Severe rule violation`

#### `/unban` - Unban a User
- **Permission Required:** Ban Members
- **Usage:** `/unban user_id:<user_id> reason:<optional>`
- **Description:** Removes a ban from a user using their Discord ID.
- **Example:** `/unban user_id:123456789012345678 reason:Appeal approved`

#### `/case` - View a Moderation Case
- **Permission Required:** Moderate Members
- **Usage:** `/case case_id:<number>`
- **Description:** Displays detailed information about a specific moderation case.
- **Example:** `/case case_id:42`

#### `/cases` - View All Cases for a User
- **Permission Required:** Moderate Members
- **Usage:** `/cases user:<user>`
- **Description:** Shows the last 10 moderation cases for a specific user.
- **Example:** `/cases user:@JohnDoe`

#### `/setmodlog` - Set Moderation Log Channel
- **Permission Required:** Administrator
- **Usage:** `/setmodlog channel:<channel>`
- **Description:** Sets the channel where all moderation actions will be logged.
- **Example:** `/setmodlog channel:#mod-logs`

### 2. **Database Structure**

#### `mod_cases` Table
Stores all moderation cases with complete details:
- `case_id` (auto-incrementing)
- `user_id` - The user being moderated
- `moderator_id` - The moderator who took action
- `action` - Type of action (warn, timeout, kick, ban, unban, automod)
- `reason` - Reason for the action
- `created_at` - When the action was taken
- `expires_at` - When the action expires (for timeouts)
- `status` - Case status (open/closed)
- `guild_id` - Server ID

#### `mod_logs` Table
Stores a simplified log of all moderation actions for quick queries.

#### `mod_log_channels` Table
Stores the designated moderation log channel for each server.

### 3. **AutoMod Integration**

The bot now automatically logs Discord's AutoMod actions:

#### AutoMod Action Logging
- Automatically detects when Discord's AutoMod takes action
- Logs the action type (Block Message, Send Alert, Timeout)
- Records the rule that was triggered
- Saves matched content for review
- Posts to the mod log channel with full details

#### External Moderation Action Tracking
The bot also logs moderation actions taken outside of the bot's commands:

- **External Bans:** When someone uses Discord's native ban feature or another bot
- **External Kicks:** When someone kicks a user through Discord or another bot
- These are marked as "External" in the mod log to distinguish them from bot commands

### 4. **Moderation Log Embed Format**

All moderation actions create rich embeds in the log channel:

```
Case #42 | WARN
━━━━━━━━━━━━━━━━━━
User: @JohnDoe (JohnDoe#1234)
Moderator: @ModName
Reason: Spamming in chat
━━━━━━━━━━━━━━━━━━
User ID: 123456789012345678
Timestamp: [Current time]
```

Colors are action-specific:
- 🟠 **Warn:** Orange (#FFA500)
- 🔴 **Timeout:** Light Red (#FF6B6B)
- 🔴 **Kick:** Red (#FF4757)
- ⚫ **Ban:** Dark Red (#FF0000)
- 🟢 **Unban:** Green (#00FF00)
- 🟡 **AutoMod:** Yellow-Orange (#FF9500)

### 5. **User Notifications**

Users receive DM notifications when moderated (if their DMs are open):
- Warns
- Timeouts (with duration)
- Kicks
- Bans

The bot will continue even if the user has DMs disabled.

### 6. **Safety Features**

- **Role Hierarchy:** Moderators cannot moderate users with equal or higher roles
- **Self-Moderation Prevention:** Users cannot moderate themselves
- **Bot Protection:** Bots cannot be moderated through these commands
- **Permission Checks:** All commands verify proper permissions before executing
- **Duplicate Prevention:** External actions are not double-logged if they were initiated by the bot

## Setup Instructions

1. **Enable Required Intents**
   - The bot automatically requests these intents:
     - `GuildModeration` - For tracking Discord moderation events
     - `AutoModerationExecution` - For AutoMod event logging

2. **Set Up Database Tables**
   - Run `/setupdb` to create all necessary tables including:
     - `mod_cases`
     - `mod_logs`
     - `mod_log_channels`

3. **Configure Mod Log Channel**
   - Run `/setmodlog channel:#mod-logs` to set your moderation log channel

4. **Grant Permissions**
   - Ensure the bot has the following permissions:
     - Moderate Members (for timeout/warn)
     - Kick Members (for kick)
     - Ban Members (for ban/unban)
     - Send Messages (for DMs and log channel)
     - Embed Links (for rich embeds)

5. **Enable Discord AutoMod (Optional)**
   - Go to Server Settings → AutoMod
   - Configure your AutoMod rules
   - The bot will automatically log all AutoMod actions

## Best Practices

1. **Always provide reasons** - Helps track why actions were taken
2. **Use `/cases` before taking action** - Review user's moderation history
3. **Set up a dedicated mod-log channel** - Keep all moderation transparent
4. **Combine with Discord's AutoMod** - Let AutoMod handle automated filtering while the bot logs everything
5. **Review AutoMod logs regularly** - Check if rules need adjustment
6. **Use timeouts instead of kicks** - Timeouts are temporary and less severe

## Example Workflow

1. **Setup:**
   ```
   /setupdb
   /setmodlog channel:#mod-logs
   ```

2. **First Offense:**
   ```
   /warn user:@Violator reason:First offense - spamming
   ```

3. **Second Offense:**
   ```
   /timeout user:@Violator duration:60 reason:Second offense - continued spamming
   ```

4. **Check History:**
   ```
   /cases user:@Violator
   ```

5. **Severe Violation:**
   ```
   /ban user:@Violator delete_messages:1 reason:Severe harassment
   ```

## Integration with Discord's Native Features

This moderation system is designed to work **alongside** Discord's built-in moderation:

- **Timeouts:** Uses Discord's native timeout (appears in audit log)
- **Bans/Kicks:** Uses Discord's native ban/kick system
- **AutoMod:** Logs actions from Discord's AutoMod rules
- **Audit Log Sync:** Tracks actions taken through Discord's interface

All actions are centralized in the bot's database for easy review and statistics.

## Troubleshooting

**Q: The bot isn't logging AutoMod actions**
- Ensure the bot has the AutoModerationExecution intent enabled
- Check that AutoMod rules are properly configured in Server Settings
- Verify the mod log channel is set with `/setmodlog`

**Q: Users aren't receiving DM notifications**
- This is normal if users have DMs disabled
- The action still completes successfully

**Q: "Role hierarchy" error when trying to moderate**
- The target user has a role equal to or higher than yours
- Ask someone with a higher role to take the action

**Q: Case IDs are missing or out of order**
- This is normal - the database auto-increments case IDs
- External moderation actions also create cases

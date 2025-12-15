# Stripe Premium Features Setup Guide

This guide will help you set up Stripe payment processing for StatusSync's premium features.

## Overview

StatusSync offers three premium tiers:
- **Basic Premium** ($4.99/month): Custom bot status, XP multipliers, custom colors, priority support
- **Pro Premium** ($9.99/month): All Basic + custom welcome images, auto-moderation, backups, analytics
- **Enterprise** ($19.99/month): All Pro + dedicated support, custom development, SLA, unlimited servers

## Prerequisites

1. A Stripe account (create at https://stripe.com)
2. Access to your Railway/hosting environment variables
3. Your bot already deployed and running

## Step 1: Create Stripe Account

1. Go to https://stripe.com and create an account
2. Complete business verification (required for live payments)
3. For testing, you can use Stripe's test mode

## Step 2: Create Products in Stripe

1. Go to Stripe Dashboard → Products
2. Create three products:

### Basic Premium
- Name: `StatusSync Basic Premium`
- Description: `Custom status, XP multipliers, custom colors, priority support`
- Pricing: `$4.99 USD` recurring monthly
- Copy the **Price ID** (starts with `price_`)

### Pro Premium
- Name: `StatusSync Pro Premium`
- Description: `All Basic features + custom welcome images, auto-mod, backups, analytics`
- Pricing: `$9.99 USD` recurring monthly
- Copy the **Price ID**

### Enterprise
- Name: `StatusSync Enterprise`
- Description: `All Pro features + dedicated support, custom development, SLA`
- Pricing: `$19.99 USD` recurring monthly
- Copy the **Price ID**

## Step 3: Get API Keys

1. Go to Stripe Dashboard → Developers → API Keys
2. Copy your **Publishable key** (starts with `pk_test_` or `pk_live_`)
3. Copy your **Secret key** (starts with `sk_test_` or `sk_live_`)
   - ⚠️ **NEVER** share your secret key publicly!

## Step 4: Set Up Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Set endpoint URL: `https://your-railway-url.railway.app/dashboard/premium/webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Copy the **Signing secret** (starts with `whsec_`)

## Step 5: Configure Environment Variables

Add these variables to your Railway project (or .env file):

```env
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
STRIPE_BASIC_PRICE_ID=price_basic_tier_id_from_step2
STRIPE_PRO_PRICE_ID=price_pro_tier_id_from_step2
STRIPE_ENTERPRISE_PRICE_ID=price_enterprise_tier_id_from_step2
```

### In Railway:
1. Go to your project → Variables
2. Click "New Variable"
3. Add each variable above with your actual values
4. Deploy your changes

## Step 6: Test the Integration

### Using Test Mode (Recommended First)

1. Make sure you're using test keys (`sk_test_` and `pk_test_`)
2. Go to your dashboard: `https://your-url.railway.app/dashboard/frontend.html`
3. Navigate to the "💎 Premium" tab
4. Click "Upgrade" on any tier
5. Use Stripe test card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits
6. Complete the test payment
7. Verify subscription appears in your Stripe Dashboard
8. Check your database: `SELECT * FROM premium_subscriptions;`

### Test Cards for Different Scenarios

- **Successful payment**: `4242 4242 4242 4242`
- **Payment requires authentication**: `4000 0025 0000 3155`
- **Payment declined**: `4000 0000 0000 9995`

## Step 7: Go Live (When Ready)

1. Complete Stripe account verification
2. Switch from test keys to live keys in Railway variables:
   - Replace `sk_test_` with `sk_live_`
   - Replace `pk_test_` with `pk_live_`
   - Update webhook secret for live mode webhook
3. Update price IDs to live product prices
4. Redeploy your bot

## Premium Features Usage

### For Bot Owners

Premium status is checked automatically. Features are gated in the code:

```javascript
const premium = await checkPremium(guildId);
if (premium.premium) {
    // User has premium access
    console.log(`Premium tier: ${premium.tier}`);
}
```

### For Server Administrators

1. Use `/dashboard` command in Discord to get dashboard link
2. Login with Discord OAuth2
3. Select your server
4. Navigate to "💎 Premium" tab
5. Choose a tier and upgrade
6. After payment, premium features activate immediately

## Database Tables

The system automatically creates these tables:

### premium_subscriptions
- `guild_id`: Discord server ID
- `tier`: basic, pro, or enterprise
- `stripe_customer_id`: Stripe customer reference
- `stripe_subscription_id`: Stripe subscription reference
- `status`: active, cancelled, past_due
- `started_at`: Subscription start date
- `expires_at`: Subscription expiry (if cancelled)

### premium_features
- `guild_id`: Discord server ID
- `custom_status`: Custom bot status message
- `xp_multiplier`: XP rate (1.0 = normal, 2.0 = double)
- `embed_color`: Custom embed color (#hex)
- `auto_mod_enabled`: Enable enhanced auto-moderation
- `custom_welcome_enabled`: Enable custom welcome images

## Webhook Events

The bot handles these Stripe webhook events:

- **checkout.session.completed**: Activates premium when payment succeeds
- **customer.subscription.deleted**: Deactivates premium when subscription ends
- **invoice.payment_failed**: Marks subscription as past_due

## Troubleshooting

### "Payment processing not configured" Error
- Ensure `STRIPE_SECRET_KEY` is set in environment variables
- Restart your bot after adding variables

### Webhook Not Working
- Verify webhook URL is correct: `https://your-url.railway.app/dashboard/premium/webhook`
- Check webhook secret matches Railway environment variable
- Look at webhook logs in Stripe Dashboard

### Premium Not Activating
- Check Railway logs for webhook events
- Verify database tables were created
- Check Stripe Dashboard for subscription status

### Test Payments Not Working
- Ensure using test mode keys (`sk_test_`, `pk_test_`)
- Use Stripe test card numbers only
- Check browser console for errors

## Security Notes

⚠️ **Important Security Practices:**

1. **Never commit** `.env` file or expose secret keys
2. Use environment variables for all sensitive data
3. Webhook signatures are verified automatically
4. All payment pages use HTTPS
5. Stripe handles all card data (PCI compliant)
6. OAuth2 ensures only server admins can purchase premium

## Support

If you encounter issues:

1. Check Railway deployment logs
2. Check Stripe Dashboard → Events for webhook delivery
3. Verify all environment variables are set correctly
4. Test with Stripe test mode first before going live

## Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Test Cards](https://stripe.com/docs/testing)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Railway Documentation](https://docs.railway.app)

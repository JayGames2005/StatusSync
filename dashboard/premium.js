// Premium Features & Stripe Integration
const express = require('express');
const router = express.Router();
const db = require('../db');

let stripe = null;
let requireAuth = null;

// Initialize Stripe if API key is provided
router.init = (authMiddleware) => {
    requireAuth = authMiddleware;
    
    if (process.env.STRIPE_SECRET_KEY) {
        stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        console.log('✅ Stripe payment processing enabled');
    }
};

// Premium tier definitions
const PREMIUM_TIERS = {
    basic: {
        name: 'Basic Premium',
        price: 4.99,
        priceId: process.env.STRIPE_BASIC_PRICE_ID,
        features: [
            'Custom bot status messages',
            'Advanced XP multipliers',
            'Custom embed colors',
            'Priority support'
        ]
    },
    pro: {
        name: 'Pro Premium',
        price: 9.99,
        priceId: process.env.STRIPE_PRO_PRICE_ID,
        features: [
            'All Basic features',
            'Custom welcome images',
            'Auto-moderation rules',
            'Backup & restore',
            'Detailed analytics',
            'Custom bot name'
        ]
    },
    enterprise: {
        name: 'Enterprise',
        price: 19.99,
        priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
        features: [
            'All Pro features',
            'Dedicated support',
            'Custom development',
            'SLA guarantee',
            'Unlimited servers',
            'White-label option'
        ]
    }
};

// Database setup for premium tracking
async function ensurePremiumTables() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS premium_subscriptions (
            guild_id VARCHAR(32) PRIMARY KEY,
            tier VARCHAR(16) NOT NULL,
            stripe_customer_id VARCHAR(255),
            stripe_subscription_id VARCHAR(255),
            status VARCHAR(16) DEFAULT 'active',
            started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    await db.query(`
        CREATE TABLE IF NOT EXISTS premium_features (
            guild_id VARCHAR(32) PRIMARY KEY,
            custom_status TEXT,
            xp_multiplier FLOAT DEFAULT 1.0,
            embed_color VARCHAR(7),
            auto_mod_enabled BOOLEAN DEFAULT false,
            custom_welcome_enabled BOOLEAN DEFAULT false
        )
    `);
}

ensurePremiumTables();

// Get premium tiers
router.get('/tiers', (req, res) => {
    const tiers = Object.entries(PREMIUM_TIERS).map(([id, tier]) => ({
        id,
        ...tier,
        stripeEnabled: !!stripe && !!tier.priceId
    }));
    res.json(tiers);
});

// Check premium status for a guild
router.get('/status', requireAuth || ((req, res, next) => next()), async (req, res) => {
    try {
        const { guild_id } = req.query;
        if (!guild_id) {
            return res.status(400).json({ error: 'guild_id required' });
        }
        
        const result = await db.query(
            'SELECT * FROM premium_subscriptions WHERE guild_id = $1',
            [guild_id]
        );
        
        if (result.rows.length === 0) {
            return res.json({ premium: false, tier: null });
        }
        
        const subscription = result.rows[0];
        const isActive = subscription.status === 'active' && 
                        (!subscription.expires_at || new Date(subscription.expires_at) > new Date());
        
        res.json({
            premium: isActive,
            tier: subscription.tier,
            status: subscription.status,
            expires_at: subscription.expires_at,
            features: PREMIUM_TIERS[subscription.tier]?.features || []
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create Stripe checkout session
router.post('/checkout', requireAuth || ((req, res, next) => next()), async (req, res) => {
    try {
        if (!stripe) {
            return res.status(503).json({ error: 'Payment processing not configured' });
        }
        
        const { guild_id, tier } = req.body;
        
        if (!guild_id || !tier || !PREMIUM_TIERS[tier]) {
            return res.status(400).json({ error: 'Invalid guild_id or tier' });
        }
        
        const priceId = PREMIUM_TIERS[tier].priceId;
        if (!priceId) {
            return res.status(400).json({ error: 'Tier not configured for payments' });
        }
        
        // Create or get customer
        let customerId;
        const existing = await db.query(
            'SELECT stripe_customer_id FROM premium_subscriptions WHERE guild_id = $1',
            [guild_id]
        );
        
        if (existing.rows.length > 0 && existing.rows[0].stripe_customer_id) {
            customerId = existing.rows[0].stripe_customer_id;
        } else {
            const customer = await stripe.customers.create({
                metadata: { guild_id }
            });
            customerId = customer.id;
        }
        
        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            line_items: [{
                price: priceId,
                quantity: 1
            }],
            success_url: `${process.env.DASHBOARD_URL || process.env.CALLBACK_URL?.replace('/dashboard/auth/callback', '')}/dashboard/frontend.html?premium=success&guild_id=${guild_id}`,
            cancel_url: `${process.env.DASHBOARD_URL || process.env.CALLBACK_URL?.replace('/dashboard/auth/callback', '')}/dashboard/frontend.html?premium=cancelled&guild_id=${guild_id}`,
            metadata: { guild_id, tier }
        });
        
        res.json({ url: session.url });
    } catch (err) {
        console.error('Stripe checkout error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Stripe webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    if (!stripe) {
        return res.status(503).send('Stripe not configured');
    }
    
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    // Handle the event
    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object;
            const { guild_id, tier } = session.metadata;
            
            await db.query(`
                INSERT INTO premium_subscriptions (guild_id, tier, stripe_customer_id, stripe_subscription_id, status)
                VALUES ($1, $2, $3, $4, 'active')
                ON CONFLICT (guild_id) 
                DO UPDATE SET tier = $2, stripe_subscription_id = $4, status = 'active', started_at = CURRENT_TIMESTAMP
            `, [guild_id, tier, session.customer, session.subscription]);
            
            console.log(`✅ Premium activated for guild ${guild_id} - ${tier}`);
            break;
        }
        
        case 'customer.subscription.deleted': {
            const subscription = event.data.object;
            await db.query(
                `UPDATE premium_subscriptions SET status = 'cancelled', expires_at = CURRENT_TIMESTAMP 
                 WHERE stripe_subscription_id = $1`,
                [subscription.id]
            );
            console.log(`❌ Subscription cancelled: ${subscription.id}`);
            break;
        }
        
        case 'invoice.payment_failed': {
            const invoice = event.data.object;
            await db.query(
                `UPDATE premium_subscriptions SET status = 'past_due' 
                 WHERE stripe_customer_id = $1`,
                [invoice.customer]
            );
            console.log(`⚠️ Payment failed for customer: ${invoice.customer}`);
            break;
        }
    }
    
    res.json({ received: true });
});

// Get premium features for a guild
router.get('/features', requireAuth || ((req, res, next) => next()), async (req, res) => {
    try {
        const { guild_id } = req.query;
        if (!guild_id) {
            return res.status(400).json({ error: 'guild_id required' });
        }
        
        const result = await db.query(
            'SELECT * FROM premium_features WHERE guild_id = $1',
            [guild_id]
        );
        
        if (result.rows.length === 0) {
            return res.json({});
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update premium features
router.post('/features', requireAuth || ((req, res, next) => next()), async (req, res) => {
    try {
        const { guild_id, ...features } = req.body;
        
        if (!guild_id) {
            return res.status(400).json({ error: 'guild_id required' });
        }
        
        // Check if guild has premium
        const premium = await db.query(
            'SELECT * FROM premium_subscriptions WHERE guild_id = $1 AND status = $2',
            [guild_id, 'active']
        );
        
        if (premium.rows.length === 0) {
            return res.status(403).json({ error: 'Premium subscription required' });
        }
        
        // Update features
        const fields = [];
        const values = [guild_id];
        let paramCount = 2;
        
        if (features.custom_status !== undefined) {
            fields.push(`custom_status = $${paramCount++}`);
            values.push(features.custom_status);
        }
        if (features.xp_multiplier !== undefined) {
            fields.push(`xp_multiplier = $${paramCount++}`);
            values.push(features.xp_multiplier);
        }
        if (features.embed_color !== undefined) {
            fields.push(`embed_color = $${paramCount++}`);
            values.push(features.embed_color);
        }
        if (features.auto_mod_enabled !== undefined) {
            fields.push(`auto_mod_enabled = $${paramCount++}`);
            values.push(features.auto_mod_enabled);
        }
        if (features.custom_welcome_enabled !== undefined) {
            fields.push(`custom_welcome_enabled = $${paramCount++}`);
            values.push(features.custom_welcome_enabled);
        }
        
        if (fields.length === 0) {
            return res.status(400).json({ error: 'No features to update' });
        }
        
        await db.query(`
            INSERT INTO premium_features (guild_id, ${fields.map((_, i) => Object.keys(features)[i]).join(', ')})
            VALUES ($1, ${features.custom_status ? '$2' : ''}${features.xp_multiplier ? ', $3' : ''})
            ON CONFLICT (guild_id) DO UPDATE SET ${fields.join(', ')}
        `, values);
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

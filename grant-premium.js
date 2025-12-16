const db = require('./db');

const guildId = process.argv[2] || '1377286041538400337';
const tier = process.argv[3] || 'enterprise';

(async () => {
    try {
        // Ensure tables exist
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
            INSERT INTO premium_subscriptions (guild_id, tier, status, started_at) 
            VALUES ($1, $2, 'active', CURRENT_TIMESTAMP) 
            ON CONFLICT (guild_id) 
            DO UPDATE SET tier = $2, status = 'active', started_at = CURRENT_TIMESTAMP
        `, [guildId, tier]);
        
        console.log(`✅ ${tier.toUpperCase()} premium granted to server ${guildId}`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        console.error(err);
        process.exit(1);
    }
})();

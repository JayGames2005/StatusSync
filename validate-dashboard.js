// Dashboard Startup Validator
// Run this to check if your dashboard is configured correctly

require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('🔍 StatusSync Dashboard Configuration Validator\n');

let errors = 0;
let warnings = 0;

// Check required files
console.log('📁 Checking required files...');
const requiredFiles = [
    'dashboard/frontend.html',
    'dashboard/frontend.js',
    'dashboard/style.css',
    'dashboard/api.js',
    'dashboard/auth.js',
    'dashboard/premium.js',
    'dashboard/server.js',
    'dashboard/logo.svg',
    'index.js',
    'db.js',
    'automod.js',
    'backup.js'
];

requiredFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        console.log(`  ✅ ${file}`);
    } else {
        console.log(`  ❌ ${file} - MISSING!`);
        errors++;
    }
});

// Check environment variables
console.log('\n🔐 Checking environment variables...');
const required = {
    'BOT_TOKEN': 'Discord Bot Token',
    'CLIENT_ID': 'Discord Application ID',
    'CLIENT_SECRET': 'Discord OAuth2 Client Secret',
    'DATABASE_URL': 'PostgreSQL Database URL',
    'SESSION_SECRET': 'Session Secret Key'
};

const optional = {
    'ENABLE_DASHBOARD': 'Dashboard Enable Flag',
    'PORT': 'Server Port',
    'CALLBACK_URL': 'OAuth2 Callback URL',
    'DASHBOARD_URL': 'Dashboard Base URL',
    'ADMIN_KEY': 'Admin Key for Premium Testing',
    'STRIPE_SECRET_KEY': 'Stripe API Secret (for payments)',
    'STRIPE_WEBHOOK_SECRET': 'Stripe Webhook Secret',
    'OPENAI_API_KEY': 'OpenAI API Key (for AI features)'
};

Object.entries(required).forEach(([key, desc]) => {
    if (process.env[key]) {
        const value = process.env[key];
        const masked = value.length > 10 ? value.substring(0, 10) + '...' : value;
        console.log(`  ✅ ${key} (${desc}): ${masked}`);
    } else {
        console.log(`  ❌ ${key} (${desc}): NOT SET - REQUIRED!`);
        errors++;
    }
});

console.log('\n⚠️  Checking optional variables...');
Object.entries(optional).forEach(([key, desc]) => {
    if (process.env[key]) {
        const value = process.env[key];
        const masked = key.includes('KEY') || key.includes('SECRET') 
            ? (value.length > 10 ? value.substring(0, 10) + '...' : value)
            : value;
        console.log(`  ✅ ${key} (${desc}): ${masked}`);
    } else {
        console.log(`  ⚠️  ${key} (${desc}): Not set`);
        warnings++;
    }
});

// Check dashboard enabled
console.log('\n⚙️  Checking dashboard configuration...');
if (process.env.ENABLE_DASHBOARD === 'true') {
    console.log('  ✅ Dashboard is ENABLED');
    
    // Check callback URL format
    const callbackUrl = process.env.CALLBACK_URL;
    if (callbackUrl) {
        if (callbackUrl.includes('/dashboard/auth/callback')) {
            console.log(`  ✅ Callback URL looks correct: ${callbackUrl}`);
        } else {
            console.log(`  ⚠️  Callback URL might be incorrect: ${callbackUrl}`);
            console.log('     Expected format: http://localhost:3000/dashboard/auth/callback');
            warnings++;
        }
    }
    
    // Check session secret strength
    const sessionSecret = process.env.SESSION_SECRET;
    if (sessionSecret) {
        if (sessionSecret.length < 32) {
            console.log('  ⚠️  SESSION_SECRET is too short (should be 32+ characters)');
            warnings++;
        } else {
            console.log('  ✅ SESSION_SECRET length is good');
        }
        
        if (sessionSecret.includes('change') || sessionSecret.includes('secret')) {
            console.log('  ⚠️  SESSION_SECRET looks like a default value - change it!');
            warnings++;
        }
    }
} else {
    console.log('  ℹ️  Dashboard is DISABLED (set ENABLE_DASHBOARD=true to enable)');
}

// Check dependencies
console.log('\n📦 Checking dependencies...');
const packageJson = require('./package.json');
const deps = [
    'discord.js',
    'express',
    'express-session',
    'passport',
    'passport-discord',
    'pg',
    'dotenv'
];

deps.forEach(dep => {
    if (packageJson.dependencies[dep]) {
        console.log(`  ✅ ${dep}: ${packageJson.dependencies[dep]}`);
    } else {
        console.log(`  ❌ ${dep}: NOT INSTALLED!`);
        errors++;
    }
});

// Database connection test
console.log('\n🗄️  Testing database connection...');
if (process.env.DATABASE_URL) {
    try {
        const { Pool } = require('pg');
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        
        pool.query('SELECT NOW()', (err, res) => {
            if (err) {
                console.log('  ❌ Database connection FAILED:', err.message);
                errors++;
            } else {
                console.log('  ✅ Database connection successful!');
                console.log('  ℹ️  Server time:', res.rows[0].now);
            }
            pool.end();
            
            // Print summary
            printSummary();
        });
    } catch (err) {
        console.log('  ❌ Database test error:', err.message);
        errors++;
        printSummary();
    }
} else {
    console.log('  ❌ DATABASE_URL not set, cannot test connection');
    errors++;
    printSummary();
}

function printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 VALIDATION SUMMARY');
    console.log('='.repeat(60));
    
    if (errors === 0 && warnings === 0) {
        console.log('✅ All checks passed! Your dashboard is ready to run!');
        console.log('\nStart the bot with: npm start');
        console.log('Dashboard will be at: http://localhost:' + (process.env.PORT || 3000) + '/dashboard/frontend.html');
    } else if (errors === 0) {
        console.log(`⚠️  ${warnings} warning(s) found, but no critical errors.`);
        console.log('Your dashboard should work, but consider fixing warnings.');
        console.log('\nStart the bot with: npm start');
    } else {
        console.log(`❌ ${errors} error(s) found! Please fix them before running.`);
        if (warnings > 0) {
            console.log(`⚠️  ${warnings} warning(s) also found.`);
        }
        console.log('\n📚 Read DASHBOARD_SETUP.md for detailed setup instructions.');
        process.exit(1);
    }
}

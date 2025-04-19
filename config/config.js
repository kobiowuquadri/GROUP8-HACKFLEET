require('dotenv').config();
const path = require('path');

const config = {
    // Server configuration
    port: process.env.PORT || 5000,
    hostName: process.env.HOST_NAME || 'localhost',
    
    // MongoDB configuration
    db: process.env.MONGODB_URI || 'mongodb://localhost:27017/nodegoat',
    mongoUser: process.env.MONGO_USER || 'admin',
    mongoPass: process.env.MONGO_PASS || 'secure_password',
    
    // Security configuration
    cookieSecret: process.env.COOKIE_SECRET || 'your-secure-cookie-secret',
    cryptoKey: process.env.CRYPTO_KEY || 'your-secure-crypto-key',
    cryptoAlgo: 'aes256',
    
    // Session configuration
    sessionSecret: process.env.SESSION_SECRET || 'your-secure-session-secret',
    sessionMaxAge: 24 * 60 * 60 * 1000, // 24 hours
    
    // Rate limiting configuration
    rateLimitWindow: 15 * 60 * 1000, // 15 minutes
    rateLimitMax: 100,
    authRateLimitWindow: 60 * 60 * 1000, // 1 hour
    authRateLimitMax: 5,
    
    // SSL configuration
    sslKeyPath: process.env.SSL_KEY_PATH || './artifacts/cert/server.key',
    sslCertPath: process.env.SSL_CERT_PATH || './artifacts/cert/server.crt',
    
    // Environment
    nodeEnv: process.env.NODE_ENV || 'development',
    
    // Security headers
    cspDirectives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
    }
};

// Validate required environment variables in production
if (config.nodeEnv === 'production') {
    const requiredEnvVars = [
        'MONGODB_URI',
        'MONGO_USER',
        'MONGO_PASS',
        'COOKIE_SECRET',
        'CRYPTO_KEY',
        'SESSION_SECRET'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
        console.error('Missing required environment variables:', missingVars.join(', '));
        process.exit(1);
    }
}

module.exports = config;

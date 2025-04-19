// default app configuration
const port = process.env.PORT || 4000;
let db = process.env.MONGODB_URI || "mongodb://localhost:27017/nodegoat";

// Generate secure random values for secrets if not provided
const crypto = require('crypto');
const generateSecret = () => crypto.randomBytes(32).toString('hex');

module.exports = {
    port,
    db,
    cookieSecret: process.env.COOKIE_SECRET || generateSecret(),
    cryptoKey: process.env.CRYPTO_KEY || generateSecret(),
    cryptoAlgo: "aes256",
    hostName: process.env.HOST_NAME || "localhost",
    environmentalScripts: []
};


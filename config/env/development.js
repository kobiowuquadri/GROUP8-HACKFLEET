module.exports = {
    port: process.env.PORT || 5000,
    db: process.env.MONGODB_URI || "mongodb://localhost:27017/nodegoat",
    cookieSecret: process.env.COOKIE_SECRET || "development_secret_key",
    cryptoKey: process.env.CRYPTO_KEY || "development_crypto_key",
    cryptoAlgo: "aes256",
    hostName: "localhost",
    environmentalScripts: [],
    logLevel: "debug",
    logFormat: "text"
};

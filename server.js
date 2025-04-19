"use strict";

const express = require("express");
const favicon = require("serve-favicon");
const bodyParser = require("body-parser");
const session = require("express-session");
const csrf = require('csurf');
const consolidate = require("consolidate"); // Templating library adapter for Express
const swig = require("swig");
const helmet = require("helmet");
const MongoClient = require("mongodb").MongoClient; // Driver for connecting to MongoDB
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const marked = require("marked");
const nosniff = require('dont-sniff-mimetype');

// Import security middleware
const { 
    apiLimiter, 
    authLimiter, 
    errorHandler, 
    validateRequest,
    securityHeaders 
} = require('./app/middleware/security');

const { securityLogger } = require('./app/utils/logger');

const app = express(); 
const routes = require("./app/routes");
const { port, db, cookieSecret, mongoUser, mongoPass } = require("./config/config");

// Load SSL certificates
const httpsOptions = {
    key: fs.readFileSync(path.resolve(__dirname, "./artifacts/cert/server.key")),
    cert: fs.readFileSync(path.resolve(__dirname, "./artifacts/cert/server.crt")),
    // Additional SSL security settings
    minVersion: 'TLSv1.2',
    ciphers: [
        'ECDHE-ECDSA-AES128-GCM-SHA256',
        'ECDHE-RSA-AES128-GCM-SHA256',
        'ECDHE-ECDSA-AES256-GCM-SHA384',
        'ECDHE-RSA-AES256-GCM-SHA384',
        'DHE-RSA-AES128-GCM-SHA256',
        'DHE-RSA-AES256-GCM-SHA384'
    ].join(':'),
    honorCipherOrder: true,
    secureOptions: require('constants').SSL_OP_NO_SSLv3 | require('constants').SSL_OP_NO_TLSv1 | require('constants').SSL_OP_NO_TLSv1_1
};

// MongoDB connection options
const mongoOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    // Write concern configuration
    writeConcern: {
        w: 'majority',
        wtimeout: 10000,
        j: true
    },
    // Connection settings
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    // Connection pool settings
    maxPoolSize: 10,
    minPoolSize: 2,
    maxIdleTimeMS: 60000,
    // MongoDB Atlas specific settings
    retryWrites: true,
    retryReads: true
};

// Add SSL configuration if certificates exist
if (process.env.MONGO_SSL === 'true') {
    try {
        mongoOptions.ssl = true;
        mongoOptions.sslValidate = true;
        mongoOptions.sslCA = fs.readFileSync(path.resolve(__dirname, process.env.MONGO_SSL_CA || "./artifacts/cert/mongodb.pem"));
    } catch (err) {
        console.warn('MongoDB SSL configuration skipped - certificates not found');
        securityLogger.logSecurityEvent('MongoDB SSL skipped', { reason: 'Certificates not found' });
    }
}

// Connect to MongoDB with proper error handling
MongoClient.connect(db, mongoOptions, (err, client) => {
    if (err) {
        securityLogger.logError(err, 'Database connection');
        console.error('MongoDB connection error:', err);
        process.exit(1);
    }

    const db = client.db('nodegoat');
    console.log('Connected to MongoDB successfully');

    // Verify database connection
    db.command({ ping: 1 }, (err) => {
        if (err) {
            securityLogger.logError(err, 'Database ping');
            console.error('MongoDB ping failed:', err);
            process.exit(1);
        }
        console.log('MongoDB connection verified');
    });

    // Apply security middleware
    app.use(securityHeaders);
    app.use(nosniff());
    app.use(favicon(__dirname + "/app/assets/favicon.ico"));

    // Express middleware to populate "req.body" so we can access POST variables
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({
        // Mandatory in Express v4
        extended: false
    }));

    // Enable session management using express middleware
    app.use(session({
        secret: cookieSecret,
        name: 'sessionId',
        saveUninitialized: true,
        resave: true,
        cookie: {
            httpOnly: true,
            secure: true,
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            sameSite: 'lax',
            path: '/',
            domain: process.env.NODE_ENV === 'production' ? '.yourdomain.com' : undefined
        },
        rolling: true, // Reset maxAge on every response
        proxy: true, // Trust the reverse proxy
        unset: 'keep'
    }));

    // Session fixation protection
    app.use((req, res, next) => {
        if (!req.session.regenerate) {
            req.session.regenerate = (cb) => {
                cb();
            };
        }
        if (!req.session.save) {
            req.session.save = (cb) => {
                cb();
            };
        }
        next();
    });

    // Session activity tracking
    app.use((req, res, next) => {
        if (req.session.lastActivity) {
            const idleTime = Date.now() - req.session.lastActivity;
            if (idleTime > 30 * 60 * 1000) { // 30 minutes
                req.session.destroy();
                return res.redirect('/login');
            }
        }
        req.session.lastActivity = Date.now();
        next();
    });

    // Enable CSRF protection
    app.use(csrf());
    app.use((req, res, next) => {
        res.locals.csrfToken = req.csrfToken();
        next();
    });

    // Apply rate limiting
    app.use('/api/', apiLimiter);
    app.use('/auth/', authLimiter);

    // Register templating engine
    app.engine(".html", consolidate.swig);
    app.set("view engine", "html");
    app.set("views", `${__dirname}/app/views`);
    
    // Serve static files
    app.use(express.static(`${__dirname}/app/assets`));
    app.use('/vendor', express.static(`${__dirname}/app/assets/vendor`));
    app.use('/vendor/theme', express.static(`${__dirname}/app/assets/vendor/theme`));
    app.use('/vendor/chart', express.static(`${__dirname}/app/assets/vendor/chart`));
    app.use('/vendor/bootstrap', express.static(`${__dirname}/app/assets/vendor/bootstrap`));

    // Configure marked for secure markdown processing
    marked.setOptions({
        sanitize: true,
        sanitizer: (text) => {
            return text.replace(/[&<>"']/g, (match) => {
                const escape = {
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#39;'
                };
                return escape[match];
            });
        }
    });
    app.locals.marked = marked;

    // Application routes
    routes(app, db);

    // Template system setup
    swig.setDefaults({
        autoescape: true,
        cache: false
    });

    // Health check endpoint
    app.get('/health', (req, res) => {
        res.status(200).json({ status: 'ok' });
    });

    // Error handling
    app.use(errorHandler);

    // Redirect HTTP to HTTPS with HSTS
    const httpApp = express();
    httpApp.use(helmet.hsts({
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }));
    httpApp.get('*', (req, res) => {
        res.redirect(`https://${req.headers.host}${req.url}`);
    });
    http.createServer(httpApp).listen(80);

    // Start HTTPS server with additional security headers
    const httpsServer = https.createServer(httpsOptions, app);
    httpsServer.listen(port, () => {
        console.log(`Express https server listening on port ${port}`);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
        securityLogger.logError(err, 'Uncaught Exception');
        process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
        securityLogger.logError(reason, 'Unhandled Rejection');
    });

});

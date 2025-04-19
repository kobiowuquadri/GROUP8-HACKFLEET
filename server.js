"use strict";

const express = require("express");
const favicon = require("serve-favicon");
const bodyParser = require("body-parser");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const csrf = require('csurf');
const consolidate = require("consolidate");
const swig = require("swig");
const helmet = require("helmet");
const { MongoClient } = require("mongodb");
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const marked = require("marked");
const nosniff = require('dont-sniff-mimetype');
const winston = require("winston");

// Import security middleware
const { 
    apiLimiter, 
    authLimiter, 
    errorHandler, 
    validateRequest,
    securityHeaders 
} = require('./app/middleware/security');

const app = express();
const routes = require("./app/routes");
const { port, db, cookieSecret, mongoUser, mongoPass } = require("./config/config");

// Configure logging
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT === 'json' ? 
        winston.format.json() : 
        winston.format.combine(
            winston.format.timestamp(),
            winston.format.printf(({ timestamp, level, message }) => {
                return `${timestamp} [${level}]: ${message}`;
            })
        ),
    transports: [
        new winston.transports.Console()
    ]
});

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
        logger.warn('MongoDB SSL configuration skipped - certificates not found');
    }
}

// Connect to MongoDB with proper error handling
MongoClient.connect(db, mongoOptions, async (err, client) => {
    if (err) {
        logger.error("Error connecting to database", { error: err });
        process.exit(1);
    }

    const database = client.db();
    logger.info("Connected to the database");

    // Security headers
    app.use(helmet());
    app.use(helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"]
        }
    }));
    app.use(nosniff());
    app.use(securityHeaders);

    // Express middleware
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(express.static(path.join(__dirname, 'app/assets')));
    app.use(favicon(path.join(__dirname, 'app/assets/favicon.ico')));

    // Session configuration
    app.use(session({
        secret: cookieSecret,
        store: new MongoStore({
            client,
            dbName: database.databaseName,
            collection: 'sessions',
            ttl: 14 * 24 * 60 * 60, // 14 days
            autoRemove: 'native'
        }),
        name: 'sessionId',
        saveUninitialized: false,
        resave: false,
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            sameSite: 'strict',
            path: '/',
            domain: process.env.NODE_ENV === 'production' ? '.yourdomain.com' : undefined
        },
        rolling: true,
        proxy: true,
        unset: 'destroy'
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

    // Initializing marked library
    marked.setOptions({
        sanitize: true
    });
    app.locals.marked = marked;

    // Application routes
    routes(app, database);

    // Template system setup
    swig.setDefaults({
        cache: false
    });

    // Error handling middleware
    app.use((err, req, res, next) => {
        logger.error("Unhandled error", { error: err });
        res.status(500).json({ error: "Internal server error" });
    });

    // Health check endpoint
    app.get('/health', (req, res) => {
        res.status(200).json({ status: 'ok' });
    });

    // Start server
    http.createServer(app).listen(port, () => {
        logger.info(`Server listening on port ${port}`);
    });
});

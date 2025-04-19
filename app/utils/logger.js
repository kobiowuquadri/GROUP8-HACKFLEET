const winston = require('winston');
const { format } = winston;
const path = require('path');

const logFormat = format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
);

const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: logFormat,
    defaultMeta: { service: 'nodejs-goat' },
    transports: [
        new winston.transports.Console({
            format: format.combine(
                format.colorize(),
                format.simple()
            )
        }),
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/error.log'),
            level: 'error'
        }),
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/combined.log')
        })
    ]
});

const securityLogger = {
    logAuthAttempt: (email, success, ip) => {
        logger.info('Authentication attempt', {
            email,
            success,
            ip,
            timestamp: new Date().toISOString()
        });
    },

    logSecurityEvent: (eventType, details) => {
        logger.warn('Security event', {
            eventType,
            details,
            timestamp: new Date().toISOString()
        });
    },

    logError: (error, context) => {
        logger.error('Application error', {
            error: error.message,
            stack: error.stack,
            context,
            timestamp: new Date().toISOString()
        });
    }
};

module.exports = {
    logger,
    securityLogger
}; 
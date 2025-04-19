const winston = require('winston');

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT === 'json' ? 
        winston.format.json() : 
        winston.format.combine(
            winston.format.timestamp(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
                return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
            })
        ),
    transports: [
        new winston.transports.Console()
    ]
});

// Add request logging middleware
const requestLogger = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info(`${req.method} ${req.url}`, {
            status: res.statusCode,
            duration,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });
    });
    next();
};

// Add error logging middleware
const errorLogger = (err, req, res, next) => {
    logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
    });
    next(err);
};

module.exports = {
    logger,
    requestLogger,
    errorLogger
}; 
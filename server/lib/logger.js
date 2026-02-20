const winston = require('winston');
const path = require('path');

// Determine log level based on environment
const level = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

// Custom format to redact sensitive keys
const redactSensitive = winston.format((info) => {
    const sensitiveKeys = ['password', 'secret', 'key', 'token', 'auth'];
    const traverse = (obj) => {
        for (const key in obj) {
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                traverse(obj[key]);
            } else if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
                obj[key] = '[REDACTED]';
            }
        }
    };

    // Clone to avoid mutation if needed (winston handles immutability, but safer to be explicit in custom format)
    // However, for performance, we might modify in place if we are careful. 
    // Winston format receives a mutable info object.
    traverse(info);
    return info;
});

const logger = winston.createLogger({
    level,
    format: winston.format.combine(
        redactSensitive(),
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
    ),
    defaultMeta: { service: 'nightcafe-companion-server' },
    transports: [
        //
        // - Write all logs with importance level of `error` or less to `error.log`
        // - Write all logs with importance level of `info` or less to `combined.log`
        //
        new winston.transports.File({ filename: path.join(__dirname, '../../logs/error.log'), level: 'error' }),
        new winston.transports.File({ filename: path.join(__dirname, '../../logs/combined.log') }),
    ],
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        ),
    }));
}

module.exports = logger;

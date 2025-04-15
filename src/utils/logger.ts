import winston from 'winston';

// Initialize logger with console transport only
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.printf(({ level, message, timestamp, ...metadata }) => {
          return `${timestamp} ${level}: ${message} ${Object.keys(metadata).length ? JSON.stringify(metadata, null, 2) : ''}`;
        })
      )
    })
  ]
});

export default logger; 
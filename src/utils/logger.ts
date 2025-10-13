import winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'test-results', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level.toUpperCase()}] ${stack || message}`;
  })
);

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // Console transport with colors
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logsDir, 'test-execution.log'),
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // File transport for errors only
    new winston.transports.File({
      filename: path.join(logsDir, 'errors.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // File transport for debug information
    new winston.transports.File({
      filename: path.join(logsDir, 'debug.log'),
      level: 'debug',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Custom stream for HTTP logging (if needed in future)
export const logStream = {
  write: (message: string) => {
    logger.info(message.trim());
  }
};

// Helper methods for different log types
export const logHelper = {
  testStart: (testName: string, browser: string = 'chromium') => {
    logger.info(`🚀 Starting test: ${testName} on ${browser}`);
  },
  
  testPass: (testName: string, duration: number) => {
    logger.info(`✅ Test passed: ${testName} (${duration}ms)`);
  },
  
  testFail: (testName: string, error: string, duration: number) => {
    logger.error(`❌ Test failed: ${testName} - ${error} (${duration}ms)`);
  },
  
  step: (stepName: string) => {
    logger.info(`📝 Step: ${stepName}`);
  },
  
  screenshot: (filename: string) => {
    logger.info(`📸 Screenshot taken: ${filename}`);
  },
  
  warning: (message: string) => {
    logger.warn(`⚠️ ${message}`);
  },
  
  debug: (message: string, data?: any) => {
    if (data) {
      logger.debug(`${message}: ${JSON.stringify(data, null, 2)}`);
    } else {
      logger.debug(message);
    }
  }
};

export default logger;
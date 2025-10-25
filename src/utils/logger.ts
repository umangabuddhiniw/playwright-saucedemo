// src/utils/logger.ts
import winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';

// ✅ UNIVERSAL: Environment detection
const isCI = (): boolean => process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
const isTestEnv = (): boolean => process.env.NODE_ENV === 'test';
const shouldUseFileLogging = (): boolean => !isCI() && process.env.DISABLE_FILE_LOGGING !== 'true';

// ✅ CRITICAL FIX: Always use test-results/logs in project root
const getLogsDirectory = (): string => {
    // Always use project root/test-results/logs regardless of environment
    return path.join(process.cwd(), 'test-results', 'logs');
};

// ✅ BULLETPROOF: Directory creation
const ensureLogsDirectory = (): string => {
    const logsDir = getLogsDirectory();
    
    try {
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
            console.log(`📁 Created logs directory: ${logsDir}`);
        }
        return logsDir;
    } catch (error) {
        console.error(`❌ Failed to create logs directory: ${error}`);
        // Fallback to current directory
        return path.join(process.cwd(), 'test-results', 'logs');
    }
};

const logsDir = ensureLogsDirectory();

// ✅ IMPROVED: Log format
const logFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss.SSS'
    }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack, ...metadata }) => {
        let logMessage = typeof message === 'object' ? JSON.stringify(message, null, 2) : String(message);
        
        if (stack) {
            logMessage = `${logMessage}\n${stack}`;
        }
        
        let metaString = '';
        if (metadata && Object.keys(metadata).length > 0) {
            try {
                const cleanMeta = { ...metadata };
                // Remove symbols that can't be serialized
                Object.getOwnPropertySymbols(cleanMeta).forEach(sym => {
                    delete cleanMeta[sym];
                });
                
                if (Object.keys(cleanMeta).length > 0) {
                    metaString = ` | ${JSON.stringify(cleanMeta, null, 2)}`;
                }
            } catch (error) {
                metaString = ` | [MetadataSerializationError: ${error}]`;
            }
        }
        
        return `${timestamp} [${level.toUpperCase()}] ${logMessage}${metaString}`;
    })
);

// ✅ IMPROVED: Console format
const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, stack }) => {
        const displayMessage = stack ? `${message}\n${stack}` : message;
        return `${timestamp} [${level}] ${displayMessage}`;
    })
);

// ✅ FIXED: Transport creation - ALWAYS create file transports for the exact structure you want
const createTransports = (): winston.transport[] => {
    const transports: winston.transport[] = [
        new winston.transports.Console({
            format: consoleFormat,
            level: process.env.LOG_LEVEL || (isCI() ? 'info' : 'debug'),
            handleExceptions: false,
            handleRejections: false
        })
    ];

    // ✅ CRITICAL: ALWAYS create file transports to ensure your directory structure
    try {
        // 1. test-results/logs/test-execution.log - Main test logs
        transports.push(
            new winston.transports.File({
                filename: path.join(logsDir, 'test-execution.log'),
                format: logFormat,
                level: 'info',
                maxsize: 5 * 1024 * 1024, // 5MB
                maxFiles: 3,
            })
        );

        // 2. test-results/logs/errors.log - Error logs only
        transports.push(
            new winston.transports.File({
                filename: path.join(logsDir, 'errors.log'),
                format: logFormat,
                level: 'error',
                maxsize: 2 * 1024 * 1024, // 2MB
                maxFiles: 2,
            })
        );

        // 3. test-results/logs/debug.log - Debug logs (only if enabled)
        if (process.env.ENABLE_DEBUG_LOGS === 'true' || process.env.LOG_LEVEL === 'debug') {
            transports.push(
                new winston.transports.File({
                    filename: path.join(logsDir, 'debug.log'),
                    format: logFormat,
                    level: 'debug',
                    maxsize: 5 * 1024 * 1024, // 5MB
                    maxFiles: 2,
                })
            );
        }

        console.log(`✅ File transports configured for: ${logsDir}`);

    } catch (error) {
        console.warn('⚠️ File logging setup had issues, but continuing:', error);
    }

    return transports;
};

// ✅ FIXED: Main logger without problematic handlers
export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || (isCI() ? 'info' : 'debug'),
    format: logFormat,
    transports: createTransports(),
    exitOnError: false
});

// ✅ UNIVERSAL: Simple console logger as fallback
export const consoleLogger = {
    info: (message: string, data?: any) => {
        const formattedData = data ? ` | ${typeof data === 'object' ? JSON.stringify(data, null, 2) : data}` : '';
        console.log(`[INFO] ${message}${formattedData}`);
    },
    error: (message: string, data?: any) => {
        const formattedData = data ? ` | ${typeof data === 'object' ? JSON.stringify(data, null, 2) : data}` : '';
        console.error(`[ERROR] ${message}${formattedData}`);
    },
    warn: (message: string, data?: any) => {
        const formattedData = data ? ` | ${typeof data === 'object' ? JSON.stringify(data, null, 2) : data}` : '';
        console.warn(`[WARN] ${message}${formattedData}`);
    },
    debug: (message: string, data?: any) => {
        if (process.env.DEBUG || process.env.LOG_LEVEL === 'debug') {
            const formattedData = data ? ` | ${typeof data === 'object' ? JSON.stringify(data, null, 2) : data}` : '';
            console.log(`[DEBUG] ${message}${formattedData}`);
        }
    }
};

// ✅ SMART: Environment-appropriate logger - Use Winston logger in ALL environments
export const universalLogger = logger; // Always use Winston logger to ensure file logging

// ✅ COMPREHENSIVE: Helper methods
export const logHelper = {
    testStart: (testName: string, browser: string = 'chromium', info?: any) => {
        universalLogger.info(`🚀 START: ${testName} [${browser}]`, info);
    },
    
    testPass: (testName: string, duration: number, metrics?: any) => {
        universalLogger.info(`✅ PASS: ${testName} (${duration}ms)`, metrics);
    },
    
    testFail: (testName: string, error: string | Error, duration?: number, context?: any) => {
        const errorMsg = error instanceof Error ? error.message : error;
        const logContext = {
            duration,
            stack: error instanceof Error ? error.stack : undefined,
            ...context
        };
        universalLogger.error(`❌ FAIL: ${testName} - ${errorMsg}`, logContext);
    },
    
    testSkip: (testName: string, reason: string = 'No reason provided') => {
        universalLogger.warn(`⏭️ SKIP: ${testName} - ${reason}`);
    },

    step: (stepName: string, details?: any) => {
        universalLogger.info(`📝 STEP: ${stepName}`, details);
    },
    
    screenshot: (filename: string, context?: any) => {
        universalLogger.info(`📸 SCREENSHOT: ${filename}`, context);
    },
    
    warning: (message: string, details?: any) => {
        universalLogger.warn(`⚠️ WARNING: ${message}`, details);
    },
    
    debug: (message: string, data?: any) => {
        universalLogger.debug(`🔍 DEBUG: ${message}`, data);
    },

    performance: (operation: string, duration: number, details?: any) => {
        universalLogger.info(`⚡ PERFORMANCE: ${operation} (${duration}ms)`, details);
    },

    network: (url: string, method: string, status?: number, duration?: number) => {
        let message = `${method} ${url}`;
        if (status) message += ` → ${status}`;
        if (duration) message += ` (${duration}ms)`;
        universalLogger.debug(`🌐 NETWORK: ${message}`);
    },

    element: (action: string, selector: string, details?: any) => {
        universalLogger.debug(`🎯 ELEMENT: ${action} -> ${selector}`, details);
    },

    assertion: (description: string, passed: boolean, details?: any) => {
        const icon = passed ? '✓' : '✗';
        const level = passed ? 'info' : 'error';
        universalLogger[level](`${icon} ASSERT: ${description}`, details);
    },

    browser: (action: string, details?: any) => {
        universalLogger.debug(`🌍 BROWSER: ${action}`, details);
    },

    navigation: (url: string, details?: any) => {
        universalLogger.info(`🧭 NAVIGATION: ${url}`, details);
    },

    fixture: (fixtureName: string, details?: any) => {
        universalLogger.info(`🔧 FIXTURE: ${fixtureName}`, details);
    },

    page: (action: string, details?: any) => {
        universalLogger.debug(`📄 PAGE: ${action}`, details);
    },

    // ✅ NEW: Directory structure verification
    verifyLogsDirectory: () => {
        const logsDir = getLogsDirectory();
        const files = ['test-execution.log', 'errors.log', 'debug.log'];
        
        const status = {
            directory: logsDir,
            exists: fs.existsSync(logsDir),
            files: {} as Record<string, boolean>
        };
        
        files.forEach(file => {
            const filePath = path.join(logsDir, file);
            status.files[file] = fs.existsSync(filePath);
        });
        
        universalLogger.info('📁 Logs directory status', status);
        return status;
    }
};

// ✅ COMPATIBLE: HTTP stream
export const logStream = {
    write: (message: string) => {
        const trimmed = message.trim();
        if (trimmed) {
            universalLogger.info(`🌐 HTTP: ${trimmed}`);
        }
    }
};

// ✅ COMPLETE: Enhanced initialization
export const initializeLogger = (): void => {
    const environment = isCI() ? 'CI' : (isTestEnv() ? 'TEST' : 'LOCAL');
    
    // Verify logs directory structure
    const logsStatus = logHelper.verifyLogsDirectory();
    
    universalLogger.info('🔧 Logger initialized', {
        environment,
        nodeEnv: process.env.NODE_ENV || 'development',
        logLevel: process.env.LOG_LEVEL || 'default',
        logsDirectory: logsDir,
        directoryStatus: logsStatus.exists ? 'OK' : 'MISSING',
        filesCreated: Object.values(logsStatus.files).filter(Boolean).length
    });
};

// ✅ COMPLETE: Safe shutdown
export const shutdownLogger = async (): Promise<void> => {
    return new Promise((resolve) => {
        universalLogger.info('🔧 Shutting down logger...');
        
        // Winston logger cleanup
        if ('close' in universalLogger) {
            (universalLogger as any).close(() => {
                console.log('✅ Winston logger shut down gracefully');
                resolve();
            });
        } else {
            console.log('✅ Logger shutdown complete');
            resolve();
        }
    });
};

// ✅ CRITICAL: Global error handlers (only in non-test environments)
if (!isTestEnv()) {
    process.on('uncaughtException', (error) => {
        universalLogger.error('💥 UNCAUGHT EXCEPTION', {
            error: error.message,
            stack: error.stack,
            logsDirectory: logsDir
        });
        // Don't exit in CI - let the test runner handle it
        if (!isCI()) {
            process.exit(1);
        }
    });

    process.on('unhandledRejection', (reason, promise) => {
        universalLogger.error('💥 UNHANDLED REJECTION', {
            reason: reason instanceof Error ? reason.message : String(reason),
            logsDirectory: logsDir
        });
        // Don't exit in CI - let the test runner handle it
        if (!isCI()) {
            process.exit(1);
        }
    });
}

// ✅ CRITICAL: Auto-initialize logger immediately
initializeLogger();

// Log startup confirmation
universalLogger.info('🎯 Logger ready - Files will be created in:', {
    logsDirectory: logsDir,
    expectedFiles: ['test-execution.log', 'errors.log', 'debug.log (if debug enabled)'],
    environment: isCI() ? 'CI' : 'Local'
});

// Export the most appropriate logger as default
export default universalLogger;
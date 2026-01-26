/**
 * Secure Logging Utility
 * 
 * Replaces console.log/error/warn with structured logging
 * that sanitizes sensitive data before logging.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: string;
    context?: Record<string, unknown>;
    error?: Error;
}

/**
 * Sensitive fields that should be redacted from logs
 */
const SENSITIVE_FIELDS = new Set([
    'password',
    'token',
    'secret',
    'key',
    'authorization',
    'auth',
    'cookie',
    'session',
    'jwt',
    'api_key',
    'apikey',
    'access_token',
    'refresh_token',
]);

/**
 * Sanitize object by redacting sensitive fields
 */
function sanitizeObject(obj: unknown, depth = 0): unknown {
    if (depth > 10) {
        return '[Max depth reached]';
    }
    
    if (obj === null || obj === undefined) {
        return obj;
    }
    
    if (typeof obj === 'string') {
        // Check if string looks like a token/secret
        if (obj.length > 50 && /^[A-Za-z0-9_-]+$/.test(obj)) {
            return '[REDACTED_TOKEN]';
        }
        return obj;
    }
    
    if (typeof obj !== 'object') {
        return obj;
    }
    
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item, depth + 1));
    }
    
    const sanitized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        
        // Redact sensitive fields
        if (SENSITIVE_FIELDS.has(lowerKey)) {
            sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeObject(value, depth + 1);
        } else {
            sanitized[key] = value;
        }
    }
    
    return sanitized;
}

/**
 * Format log entry
 */
function formatLogEntry(entry: LogEntry): string {
    const parts: string[] = [
        `[${entry.timestamp}]`,
        `[${entry.level.toUpperCase()}]`,
        entry.message,
    ];
    
    if (entry.context && Object.keys(entry.context).length > 0) {
        parts.push(JSON.stringify(sanitizeObject(entry.context)));
    }
    
    if (entry.error) {
        parts.push(`\nError: ${entry.error.message}`);
        if (entry.error.stack) {
            parts.push(`\nStack: ${entry.error.stack}`);
        }
    }
    
    return parts.join(' ');
}

/**
 * Logger class
 */
class Logger {
    private isDevelopment = process.env.NODE_ENV === 'development';
    
    private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): void {
        const entry: LogEntry = {
            level,
            message,
            timestamp: new Date().toISOString(),
            context: context ? sanitizeObject(context) as Record<string, unknown> : undefined,
            error,
        };
        
        const formatted = formatLogEntry(entry);
        
        // In production, only log errors and warnings
        if (!this.isDevelopment && (level === 'debug' || level === 'info')) {
            return;
        }
        
        // Use appropriate console method
        switch (level) {
            case 'debug':
                if (this.isDevelopment) {
                    console.debug(formatted);
                }
                break;
            case 'info':
                console.info(formatted);
                break;
            case 'warn':
                console.warn(formatted);
                break;
            case 'error':
                console.error(formatted);
                break;
        }
    }
    
    debug(message: string, context?: Record<string, unknown>): void {
        this.log('debug', message, context);
    }
    
    info(message: string, context?: Record<string, unknown>): void {
        this.log('info', message, context);
    }
    
    warn(message: string, context?: Record<string, unknown>): void {
        this.log('warn', message, context);
    }
    
    error(message: string, error?: Error, context?: Record<string, unknown>): void {
        this.log('error', message, context, error);
    }
}

// Export singleton instance
export const logger = new Logger();

// Export for convenience
export default logger;

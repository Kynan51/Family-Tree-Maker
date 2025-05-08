/**
 * Server-side logging utility that ensures logs are properly captured
 * in different environments (development, production, etc.)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogParams {
  message: string;
  data?: any;
  error?: Error;
  context?: string;
}

/**
 * Server logger that ensures logs are properly captured in different environments
 */
export class ServerLogger {
  private context: string;
  
  constructor(context: string) {
    this.context = context;
  }

  /**
   * Log debug information
   */
  debug(params: LogParams | string) {
    this.log('debug', params);
  }

  /**
   * Log general information
   */  
  info(params: LogParams | string) {
    this.log('info', params);
  }

  /**
   * Log warnings
   */  
  warn(params: LogParams | string) {
    this.log('warn', params);
  }

  /**
   * Log errors
   */  
  error(params: LogParams | string) {
    this.log('error', params);
  }

  /**
   * Internal logging method
   */
  private log(level: LogLevel, params: LogParams | string) {
    // Convert string params to object format
    const logParams: LogParams = typeof params === 'string' 
      ? { message: params }
      : params;
    
    // Add context if not provided
    if (!logParams.context) {
      logParams.context = this.context;
    }
    
    // Format log entry
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${logParams.context}]`;
    
    // Choose console method based on level
    let consoleMethod: (message?: any, ...optionalParams: any[]) => void;
    
    switch(level) {
      case 'debug':
        consoleMethod = console.debug;
        break;
      case 'info':
        consoleMethod = console.log;
        break;
      case 'warn':
        consoleMethod = console.warn;
        break;
      case 'error':
        consoleMethod = console.error;
        break;
      default:
        consoleMethod = console.log;
    }
    
    // Log the message and data if available
    if (logParams.data) {
      consoleMethod(`${prefix} ${logParams.message}`, logParams.data);
    } else {
      consoleMethod(`${prefix} ${logParams.message}`);
    }
    
    // If there's an error, log the error separately
    if (logParams.error) {
      consoleMethod(`${prefix} Error:`, logParams.error);
    }
  }
}

/**
 * Create a logger instance for a specific context
 */
export function createLogger(context: string): ServerLogger {
  return new ServerLogger(context);
}

// Export default logger for quick usage
export default {
  debug: (params: LogParams | string) => new ServerLogger('app').debug(params),
  info: (params: LogParams | string) => new ServerLogger('app').info(params),
  warn: (params: LogParams | string) => new ServerLogger('app').warn(params),
  error: (params: LogParams | string) => new ServerLogger('app').error(params),
};
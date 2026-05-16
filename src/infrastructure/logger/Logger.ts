import * as pino from 'pino';
import { ApplicationConfiguration } from '../../shared/index.js';

export class ApplicationLogger {
  private loggerInstance: pino.Logger;
  private static singletonInstance: ApplicationLogger;

  private constructor(loggingConfig?: ApplicationConfiguration['logging']) {
    const loggerOptions: pino.LoggerOptions = {
      level: loggingConfig?.logLevel || 'info',
      name: 'arkts-code-knowledge-graph'
    };
    if (loggingConfig?.prettyPrintLogs) {
      loggerOptions.transport = {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname'
        }
      };
    }
    if (loggingConfig?.logFilePath) {
      loggerOptions.transport = {
        targets: [
          { target: 'pino/file', options: { destination: loggingConfig.logFilePath } },
          loggingConfig.prettyPrintLogs
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  translateTime: 'HH:MM:ss Z',
                  ignore: 'pid,hostname'
                }
              }
            : null
        ].filter(Boolean) as pino.TransportTargetOptions[]
      };
    }
    this.loggerInstance = pino.pino(loggerOptions);
  }

  static getInstance(loggingConfig?: ApplicationConfiguration['logging']): ApplicationLogger {
    if (!ApplicationLogger.singletonInstance) {
      ApplicationLogger.singletonInstance = new ApplicationLogger(loggingConfig);
    }
    return ApplicationLogger.singletonInstance;
  }

  trace(message: string, ...args: unknown[]): void {
    this.loggerInstance.trace(message, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    this.loggerInstance.debug(message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.loggerInstance.info(message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.loggerInstance.warn(message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    this.loggerInstance.error(message, ...args);
  }

  fatal(message: string, ...args: unknown[]): void {
    this.loggerInstance.fatal(message, ...args);
  }

  createChildLogger(bindings: pino.Bindings): ApplicationLogger {
    const child = new ApplicationLogger();
    child.loggerInstance = this.loggerInstance.child(bindings);
    return child;
  }
}

export const applicationLogger = ApplicationLogger.getInstance();

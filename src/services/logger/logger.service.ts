import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';

@Injectable()
export class AppLoggerService implements LoggerService {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.DEBUG_MODE === 'true' ? 'debug' : 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      transports: [new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, context }) => `${timestamp} ${level}${context ? ` [${context}]` : ''} ${message}`),
        ),
      })],
    });
  }

  log(message: string, context?: string) { this.logger.info(message, { context }); }
  error(message: string, trace?: string, context?: string) { this.logger.error(message, { trace, context }); }
  warn(message: string, context?: string) { this.logger.warn(message, { context }); }
  debug(message: string, context?: string) { this.logger.debug(message, { context }); }
  verbose(message: string, context?: string) { this.logger.verbose(message, { context }); }
}

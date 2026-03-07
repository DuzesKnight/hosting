import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
    private readonly logger = new Logger('HTTP');

    use(req: Request, res: Response, next: NextFunction) {
        const requestId = uuidv4().slice(0, 8);
        const startTime = Date.now();
        const { method, originalUrl } = req;
        const ip = (req.headers['cf-connecting-ip'] as string)
            || (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
            || req.ip;

        // Attach requestId to request for downstream correlation
        (req as any).requestId = requestId;

        // Set correlation header on response
        res.setHeader('X-Request-Id', requestId);

        res.on('finish', () => {
            const duration = Date.now() - startTime;
            const { statusCode } = res;
            const contentLength = res.get('Content-Length') || 0;

            const logLine = `${method} ${originalUrl} ${statusCode} ${duration}ms ${contentLength}b [${ip}] rid=${requestId}`;

            if (statusCode >= 500) {
                this.logger.error(logLine);
            } else if (statusCode >= 400) {
                this.logger.warn(logLine);
            } else if (duration > 3000) {
                // Slow request warning
                this.logger.warn(`SLOW ${logLine}`);
            } else {
                this.logger.log(logLine);
            }
        });

        next();
    }
}

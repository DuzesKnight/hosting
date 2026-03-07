import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);
    private client: Redis;

    constructor(private config: ConfigService) {
        const redisUrl = this.config.get<string>('REDIS_URL', 'redis://localhost:6379');
        this.client = new Redis(redisUrl, {
            maxRetriesPerRequest: 3,
            retryStrategy: (times) => Math.min(times * 200, 5000),
            lazyConnect: false,
            enableReadyCheck: true,
        });

        this.client.on('error', (err) => this.logger.error(`Redis error: ${err.message}`));
        this.client.on('connect', () => this.logger.log('Redis connected'));
    }

    getClient(): Redis {
        return this.client;
    }

    async get(key: string): Promise<string | null> {
        return this.client.get(key);
    }

    async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
        if (ttlSeconds) {
            await this.client.set(key, value, 'EX', ttlSeconds);
        } else {
            await this.client.set(key, value);
        }
    }

    async del(key: string): Promise<void> {
        await this.client.del(key);
    }

    async delPattern(pattern: string): Promise<void> {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
            await this.client.del(...keys);
        }
    }

    async exists(key: string): Promise<boolean> {
        return (await this.client.exists(key)) === 1;
    }

    async incr(key: string): Promise<number> {
        return this.client.incr(key);
    }

    async expire(key: string, ttlSeconds: number): Promise<void> {
        await this.client.expire(key, ttlSeconds);
    }

    /** Distributed lock using SET NX EX */
    async acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
        const result = await this.client.set(key, '1', 'EX', ttlSeconds, 'NX');
        return result === 'OK';
    }

    async releaseLock(key: string): Promise<void> {
        await this.client.del(key);
    }

    async onModuleDestroy() {
        await this.client.quit();
        this.logger.log('Redis connection closed');
    }
}

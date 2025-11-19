import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);
    private client: Redis;

    constructor(private configService: ConfigService) { }

    async onModuleInit() {
        const host = this.configService.get<string>('REDIS_HOST', 'localhost');
        const port = this.configService.get<number>('REDIS_PORT', 6379);
        const db = this.configService.get<number>('REDIS_DB', 0);

        this.client = new Redis({
            host,
            port,
            db,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
        });

        this.client.on('connect', () => {
            this.logger.log('Redis connected');
        });

        this.client.on('error', (err) => {
            this.logger.error('Redis error:', err);
        });
    }

    async onModuleDestroy() {
        await this.client.quit();
    }

    getClient(): Redis {
        return this.client;
    }

    async get(key: string): Promise<string | null> {
        return this.client.get(key);
    }

    async set(key: string, value: string, ttl?: number): Promise<void> {
        if (ttl) {
            await this.client.setex(key, ttl, value);
        } else {
            await this.client.set(key, value);
        }
    }

    async del(key: string): Promise<void> {
        await this.client.del(key);
    }

    async hset(key: string, field: string, value: string): Promise<void> {
        await this.client.hset(key, field, value);
    }

    async hget(key: string, field: string): Promise<string | null> {
        return this.client.hget(key, field);
    }

    async hgetall(key: string): Promise<Record<string, string>> {
        return this.client.hgetall(key);
    }
}

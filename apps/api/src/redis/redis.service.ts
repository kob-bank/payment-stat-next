import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);
    private client: Redis;
    private isReady: boolean = false;

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
                // Retry every 5 seconds, max
                return 5000;
            },
            maxRetriesPerRequest: null, // Allow unlimited retries
        });

        this.client.on('connect', () => {
            this.logger.log('Redis connected');
        });

        this.client.on('ready', () => {
            this.isReady = true;
            this.logger.log('Redis ready');
        });

        this.client.on('close', () => {
            this.isReady = false;
            this.logger.warn('Redis connection closed');
        });

        this.client.on('error', (err) => {
            this.isReady = false;
            // Log error but don't crash
            this.logger.error(`Redis error: ${err.message}`);
        });
    }

    async onModuleDestroy() {
        if (this.client) {
            await this.client.quit();
        }
    }

    getClient(): Redis {
        return this.client;
    }

    async get(key: string): Promise<string | null> {
        if (!this.isReady) return null;
        try {
            return await this.client.get(key);
        } catch (e) {
            this.logger.error(`Redis get error: ${e.message}`);
            return null;
        }
    }

    async mget(keys: string[]): Promise<(string | null)[]> {
        if (!this.isReady) return [];
        if (keys.length === 0) return [];
        try {
            return await this.client.mget(keys);
        } catch (e) {
            this.logger.error(`Redis mget error: ${e.message}`);
            return [];
        }
    }

    async set(key: string, value: string, ttl?: number): Promise<void> {
        if (!this.isReady) return;
        try {
            if (ttl) {
                await this.client.setex(key, ttl, value);
            } else {
                await this.client.set(key, value);
            }
        } catch (e) {
            this.logger.error(`Redis set error: ${e.message}`);
        }
    }

    async del(key: string): Promise<void> {
        if (!this.isReady) return;
        try {
            await this.client.del(key);
        } catch (e) {
            this.logger.error(`Redis del error: ${e.message}`);
        }
    }

    async hset(key: string, field: string, value: string): Promise<void> {
        if (!this.isReady) return;
        try {
            await this.client.hset(key, field, value);
        } catch (e) {
            this.logger.error(`Redis hset error: ${e.message}`);
        }
    }

    async hget(key: string, field: string): Promise<string | null> {
        if (!this.isReady) return null;
        try {
            return await this.client.hget(key, field);
        } catch (e) {
            this.logger.error(`Redis hget error: ${e.message}`);
            return null;
        }
    }

    async hgetall(key: string): Promise<Record<string, string>> {
        if (!this.isReady) return {};
        try {
            return await this.client.hgetall(key);
        } catch (e) {
            this.logger.error(`Redis hgetall error: ${e.message}`);
            return {};
        }
    }

    async keys(pattern: string): Promise<string[]> {
        if (!this.isReady) return [];
        try {
            return await this.client.keys(pattern);
        } catch (e) {
            this.logger.error(`Redis keys error: ${e.message}`);
            return [];
        }
    }

    async ttl(key: string): Promise<number> {
        if (!this.isReady) return -1;
        try {
            return await this.client.ttl(key);
        } catch (e) {
            this.logger.error(`Redis ttl error: ${e.message}`);
            return -1;
        }
    }
}

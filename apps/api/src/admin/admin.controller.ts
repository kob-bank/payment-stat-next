import { Controller, Post, Get, Delete, Param, Query } from '@nestjs/common';
import { SyncService } from '../sync/sync.service';
import { RedisService } from '../redis/redis.service';
import { FileConfigService } from '../config/file-config.service';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Controller('api/v1/admin')
export class AdminController {
    constructor(
        private readonly syncService: SyncService,
        private readonly redisService: RedisService,
        private readonly fileConfigService: FileConfigService,
        @InjectConnection() private readonly connection: Connection,
    ) { }

    @Post('sync/current')
    async syncCurrentData() {
        // Run in background to avoid timeout
        this.syncService.syncCurrentData();
        return { message: 'Current data sync triggered' };
    }

    @Post('sync/full')
    async fullSync() {
        // Run in background
        this.syncService.fullSync();
        return { message: 'Full sync triggered' };
    }

    @Post('cache/warm')
    async warmCache() {
        // Run in background
        this.syncService.triggerWarmCache();
        return { message: 'Cache warming triggered' };
    }

    @Get('sync/status')
    async getSyncStatus() {
        return this.syncService.getSyncStatus();
    }

    @Get('cache/keys')
    async getCacheKeys(@Query('pattern') pattern: string = 'stats:*') {
        const keys = await this.redisService.keys(pattern);

        // Get TTL for each key
        const keysWithTtl = await Promise.all(
            keys.map(async (key) => {
                const ttl = await this.redisService.ttl(key);
                return { key, ttl };
            })
        );

        return { keys: keysWithTtl };
    }

    @Delete('cache/keys/:key')
    async deleteCacheKey(@Param('key') key: string) {
        // Decode key in case it contains special characters
        const decodedKey = decodeURIComponent(key);
        await this.redisService.del(decodedKey);
        return { message: `Key ${decodedKey} deleted` };
    }

    @Get('databases')
    async getDatabases() {
        const dbNames = await this.fileConfigService.getDatabases();
        const databases = [];

        for (const name of dbNames) {
            try {
                const db = this.connection.useDb(name);
                const collections = await db.listCollections();
                databases.push({
                    name,
                    collections: collections.map(c => c.name).sort()
                });
            } catch (error) {
                console.error(`Failed to list collections for ${name}:`, error);
                databases.push({ name, collections: [], error: 'Failed to connect' });
            }
        }

        return { databases };
    }
}

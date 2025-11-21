import { Controller, Post, Get, Delete, Param, Query } from '@nestjs/common';
import { SyncService } from '../sync/sync.service';
import { RedisService } from '../redis/redis.service';

@Controller('api/v1/admin')
export class AdminController {
    constructor(
        private readonly syncService: SyncService,
        private readonly redisService: RedisService,
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
        this.syncService.warmCache();
        return { message: 'Cache warming triggered' };
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
}

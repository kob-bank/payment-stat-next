import { Controller, Post, Body, BadRequestException, Get } from '@nestjs/common';
import { SyncService } from './sync.service';

@Controller('api/v1/sync')
export class SyncController {
    constructor(private readonly syncService: SyncService) { }

    @Post('daily')
    async syncDaily(@Body() body: { date: string }) {
        const { date } = body;

        if (!date) {
            throw new BadRequestException('Date is required in format YYYY-MM-DD');
        }

        // Validate date format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
        }

        // Trigger syncs
        await this.syncService.syncDayStats(date);
        await this.syncService.syncDailySummary(date);

        return {
            message: `Daily sync triggered for ${date}`,
            date
        };
    }

    @Get('cache-status')
    async getCacheStatus() {
        const dates = await this.syncService.getCacheStatus();
        return {
            cachedDates: dates
        };
    }

    @Post('bulk')
    async syncBulk(@Body() body: { dates: string[] }) {
        const { dates } = body;

        if (!dates || !Array.isArray(dates) || dates.length === 0) {
            throw new BadRequestException('Dates array is required and cannot be empty');
        }

        // Validate format
        const invalidDate = dates.find(d => !/^\d{4}-\d{2}-\d{2}$/.test(d));
        if (invalidDate) {
            throw new BadRequestException(`Invalid date format for ${invalidDate}. Use YYYY-MM-DD`);
        }

        // Trigger sync
        const result = await this.syncService.syncBulk(dates);

        return result;
    }
}

import { Controller, Get, Query, Param } from '@nestjs/common';
import { StatsService } from './stats.service';

@Controller('api/v1/stats')
export class StatsController {
    constructor(private readonly statsService: StatsService) { }

    @Get('hourly')
    async getHourlyStats(@Query('date') date: string) {
        if (!date) {
            return { error: 'Date parameter is required' };
        }

        const stats = await this.statsService.getHourlyStats(date);
        if (!stats) {
            return { error: 'No data found for the specified date' };
        }

        return stats;
    }

    @Get('provider/:id')
    async getProviderStats(@Param('id') providerId: string) {
        const stats = await this.statsService.getProviderStats(providerId);
        if (!stats) {
            return { error: 'No data found for the specified provider' };
        }

        return stats;
    }

    @Get('summary')
    async getSummaryStats(
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        if (!startDate || !endDate) {
            return { error: 'Both startDate and endDate parameters are required' };
        }

        const stats = await this.statsService.getSummaryStats(startDate, endDate);
        if (!stats) {
            return { error: 'No data found for the specified date range' };
        }

        return stats;
    }
}

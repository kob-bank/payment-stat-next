import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { SyncService } from '../sync/sync.service';

export interface HourlyStats {
    hour: number;
    transactions: StatusBreakdown;
    withdrawals: StatusBreakdown;
}

export interface StatusBreakdown {
    success: { count: number; amount: number };
    failed: { count: number; amount: number };
    pending: { count: number; amount: number };
    total: { count: number; amount: number };
}

export interface DailyStats {
    date: string;
    hourly: HourlyStats[];
}

export interface AmountDistribution {
    range: string;
    count: number;
    amount: number;
    providers?: Record<string, { count: number; amount: number }>;
}

export interface SiteStats {
    total: StatusBreakdown;
    providers: Record<string, StatusBreakdown>;
    hourly: Record<string, StatusBreakdown>;
    amountDistribution: Record<string, AmountDistribution>;
    hourlyDistribution: Record<string, Record<string, { count: number; providers?: Record<string, { count: number }> }>>; // hour -> range -> { count, providers }
}

export interface DailySummary {
    date: string;
    transactions: StatusBreakdown;
    withdrawals: StatusBreakdown;
    providers: Record<string, StatusBreakdown>;
    sites: Record<string, SiteStats>;
    timestamp: string;
}

export interface WeeklyStats {
    startDate: string;
    endDate: string;
    daily: DailySummary[];
    timestamp: string;
}

export interface ProviderStats {
    provider: string;
    period: string;
    transactions: StatusBreakdown;
    withdrawals: StatusBreakdown;
    lastUpdated: string;
}

@Injectable()
export class StatsService {
    private readonly logger = new Logger(StatsService.name);

    constructor(
        private readonly redisService: RedisService,
        private readonly syncService: SyncService
    ) { }

    /**
     * Get hourly stats for a specific date
     */
    async getHourlyStats(date: string): Promise<DailyStats | null> {
        try {
            const key = `stats:hourly:${date}`;
            const data = await this.redisService.get(key);

            if (!data) {
                this.logger.warn(`No hourly stats found in Redis for date: ${date}. Fetching from DB...`);
                // Fallback to DB
                return await this.syncService.syncDayStats(date);
            }

            return JSON.parse(data);
        } catch (error) {
            this.logger.error(`Failed to get hourly stats for ${date}:`, error);
            throw error;
        }
    }

    /**
     * Get daily summary
     */
    async getDailySummary(date: string): Promise<DailySummary | null> {
        try {
            const key = `stats:daily:${date}`;
            const data = await this.redisService.get(key);

            if (!data) {
                this.logger.warn(`No daily summary found in Redis for date: ${date}. Fetching from DB...`);
                // Fallback to DB
                return await this.syncService.syncDailySummary(date);
            }

            return JSON.parse(data);
        } catch (error) {
            this.logger.error(`Failed to get daily summary for ${date}:`, error);
            throw error;
        }
    }

    /**
     * Get weekly stats
     */
    async getWeeklyStats(startDate: string, endDate: string): Promise<WeeklyStats | null> {
        try {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const dailySummaries: DailySummary[] = [];

            // Iterate through each day in the range
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                const key = `stats:daily:${dateStr}`;
                const data = await this.redisService.get(key);

                if (data) {
                    dailySummaries.push(JSON.parse(data));
                }
            }

            if (dailySummaries.length === 0) {
                this.logger.warn(`No daily stats found for range ${startDate} to ${endDate}`);
                return null;
            }

            return {
                startDate,
                endDate,
                daily: dailySummaries,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            this.logger.error(`Failed to get weekly stats:`, error);
            throw error;
        }
    }

    /**
     * Get provider stats
     */
    async getProviderStats(providerId: string): Promise<ProviderStats | null> {
        try {
            const key = `stats:provider:${providerId}`;
            const data = await this.redisService.get(key);

            if (!data) {
                this.logger.warn(`No stats found for provider: ${providerId}`);
                return null;
            }

            return JSON.parse(data);
        } catch (error) {
            this.logger.error(`Failed to get provider stats for ${providerId}:`, error);
            throw error;
        }
    }

    /**
     * Get all providers
     */
    async getAllProviders(): Promise<string[]> {
        try {
            const client = this.redisService.getClient();
            const keys = await client.keys('stats:provider:*');

            return keys.map(key => key.replace('stats:provider:', ''));
        } catch (error) {
            this.logger.error('Failed to get all providers:', error);
            throw error;
        }
    }

    /**
     * Get date range summary (multiple days)
     */
    async getDateRangeSummary(startDate: string, endDate: string): Promise<DailySummary[]> {
        try {
            const summaries: DailySummary[] = [];
            const start = new Date(startDate);
            const end = new Date(endDate);

            const current = new Date(start);
            while (current <= end) {
                const dateStr = current.toISOString().split('T')[0];
                const summary = await this.getDailySummary(dateStr);

                if (summary) {
                    summaries.push(summary);
                }

                current.setDate(current.getDate() + 1);
            }

            return summaries;
        } catch (error) {
            this.logger.error('Failed to get date range summary:', error);
            throw error;
        }
    }
}

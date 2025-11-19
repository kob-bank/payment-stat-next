import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

export interface HourlyStats {
    hour: number;
    transactions: { count: number; amount: number };
    withdrawals: { count: number; amount: number };
}

export interface DailyStats {
    date: string;
    hourly: HourlyStats[];
}

@Injectable()
export class StatsService {
    private readonly logger = new Logger(StatsService.name);

    constructor(private readonly redisService: RedisService) { }

    /**
     * Get hourly stats for a specific date
     * Redis Key: stats:hourly:{YYYY-MM-DD}
     */
    async getHourlyStats(date: string): Promise<DailyStats | null> {
        try {
            const key = `stats:hourly:${date}`;
            const data = await this.redisService.get(key);

            if (!data) {
                this.logger.warn(`No stats found for date: ${date}`);
                return null;
            }

            return JSON.parse(data);
        } catch (error) {
            this.logger.error(`Failed to get hourly stats for ${date}:`, error);
            throw error;
        }
    }

    /**
     * Get provider stats
     * Redis Key: stats:provider:{providerId}
     */
    async getProviderStats(providerId: string): Promise<any> {
        try {
            const key = `stats:provider:${providerId}`;
            const data = await this.redisService.hgetall(key);

            if (!data || Object.keys(data).length === 0) {
                this.logger.warn(`No stats found for provider: ${providerId}`);
                return null;
            }

            return {
                providerId,
                totalTransactions: parseInt(data.totalTransactions || '0'),
                totalWithdrawals: parseInt(data.totalWithdrawals || '0'),
                totalAmount: parseFloat(data.totalAmount || '0'),
            };
        } catch (error) {
            this.logger.error(`Failed to get provider stats for ${providerId}:`, error);
            throw error;
        }
    }

    /**
     * Get summary stats for a date range
     */
    async getSummaryStats(startDate: string, endDate: string): Promise<any> {
        try {
            const key = `stats:summary:${startDate}:${endDate}`;
            const data = await this.redisService.get(key);

            if (!data) {
                return null;
            }

            return JSON.parse(data);
        } catch (error) {
            this.logger.error(`Failed to get summary stats:`, error);
            throw error;
        }
    }
}

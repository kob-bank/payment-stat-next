import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Transaction, TransactionDocument } from '../database/schemas/transaction.schema';
import { Withdrawal, WithdrawalDocument } from '../database/schemas/withdrawal.schema';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class SyncService {
    private readonly logger = new Logger(SyncService.name);

    constructor(
        @InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
        @InjectModel(Withdrawal.name) private withdrawalModel: Model<WithdrawalDocument>,
        private readonly redisService: RedisService,
    ) { }

    /**
     * Sync hourly stats from MongoDB to Redis
     * Runs every minute
     */
    @Cron(CronExpression.EVERY_MINUTE)
    async syncHourlyStats() {
        try {
            this.logger.log('Starting hourly stats sync...');

            // Get current date
            const now = new Date();
            const date = now.toISOString().split('T')[0]; // YYYY-MM-DD

            await this.syncDayStats(date);

            this.logger.log('Hourly stats sync completed');
        } catch (error) {
            this.logger.error('Failed to sync hourly stats:', error);
        }
    }

    /**
     * Sync a specific day's stats
     */
    async syncDayStats(date: string) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const hourlyStats = [];

        for (let hour = 0; hour < 24; hour++) {
            const hourStart = new Date(startOfDay);
            hourStart.setHours(hour);

            const hourEnd = new Date(startOfDay);
            hourEnd.setHours(hour + 1);

            // Aggregate transactions
            const transactionStats = await this.transactionModel.aggregate([
                {
                    $match: {
                        timestamp: { $gte: hourStart, $lt: hourEnd },
                        status: 'SUCCESS'
                    },
                },
                {
                    $group: {
                        _id: null,
                        count: { $sum: 1 },
                        amount: { $sum: '$amount' },
                    },
                },
            ]);

            // Aggregate withdrawals
            const withdrawalStats = await this.withdrawalModel.aggregate([
                {
                    $match: {
                        timestamp: { $gte: hourStart, $lt: hourEnd },
                        status: 'SUCCESS'
                    },
                },
                {
                    $group: {
                        _id: null,
                        count: { $sum: 1 },
                        amount: { $sum: '$amount' },
                    },
                },
            ]);

            hourlyStats.push({
                hour,
                transactions: {
                    count: transactionStats[0]?.count || 0,
                    amount: transactionStats[0]?.amount || 0,
                },
                withdrawals: {
                    count: withdrawalStats[0]?.count || 0,
                    amount: withdrawalStats[0]?.amount || 0,
                },
            });
        }

        // Store in Redis
        const key = `stats:hourly:${date}`;
        const data = { date, hourly: hourlyStats };
        await this.redisService.set(key, JSON.stringify(data), 60 * 60 * 24 * 30); // 30 days TTL

        this.logger.log(`Synced stats for ${date}`);
    }

    /**
     * Full sync - sync all historical data
     */
    async fullSync() {
        this.logger.log('Starting full sync...');

        // Sync last 30 days
        const now = new Date();
        for (let i = 0; i < 30; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            await this.syncDayStats(dateStr);
        }

        this.logger.log('Full sync completed');
    }
}

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
     * Main sync cron - runs every minute
     * Syncs current day stats and hot data
     */
    @Cron(CronExpression.EVERY_MINUTE)
    async syncCurrentData() {
        try {
            this.logger.log('Starting incremental sync...');

            const now = new Date();
            const date = now.toISOString().split('T')[0];

            // Sync current day
            await this.syncDayStats(date);
            await this.syncDailySummary(date);

            // Sync provider stats (last 7 days)
            await this.syncProviderStats(7);

            this.logger.log('Incremental sync completed');
        } catch (error) {
            this.logger.error('Failed to sync current data:', error);
        }
    }

    /**
     * Weekly aggregation - runs every day at 1 AM
     */
    @Cron('0 1 * * *')
    async syncWeeklyStats() {
        try {
            this.logger.log('Starting weekly stats sync...');

            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 7);

            await this.aggregateWeeklyStats(startDate, endDate);

            this.logger.log('Weekly stats sync completed');
        } catch (error) {
            this.logger.error('Failed to sync weekly stats:', error);
        }
    }

    /**
     * Cache warming - preload frequently accessed data
     * Runs every 5 minutes
     */
    @Cron('*/5 * * * *')
    async warmCache() {
        try {
            this.logger.log('Starting cache warming...');

            // Warm last 7 days
            const now = new Date();
            for (let i = 0; i < 7; i++) {
                const date = new Date(now);
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];

                await this.syncDayStats(dateStr);
                await this.syncDailySummary(dateStr);
            }

            this.logger.log('Cache warming completed');
        } catch (error) {
            this.logger.error('Failed to warm cache:', error);
        }
    }

    /**
     * Sync hourly stats for a specific day
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

            // Aggregate transactions with status breakdown
            const transactionStats = await this.transactionModel.aggregate([
                {
                    $match: {
                        timestamp: { $gte: hourStart, $lt: hourEnd },
                    },
                },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                        amount: { $sum: '$amount' },
                    },
                },
            ]);

            // Aggregate withdrawals with status breakdown
            const withdrawalStats = await this.withdrawalModel.aggregate([
                {
                    $match: {
                        timestamp: { $gte: hourStart, $lt: hourEnd },
                    },
                },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                        amount: { $sum: '$amount' },
                    },
                },
            ]);

            // Calculate totals and breakdown
            const transactionData = this.calculateStatusBreakdown(transactionStats);
            const withdrawalData = this.calculateStatusBreakdown(withdrawalStats);

            hourlyStats.push({
                hour,
                transactions: transactionData,
                withdrawals: withdrawalData,
            });
        }

        // Store in Redis
        const key = `stats:hourly:${date}`;
        const data = { date, hourly: hourlyStats };
        await this.redisService.set(key, JSON.stringify(data), 60 * 60 * 24 * 30); // 30 days TTL

        this.logger.debug(`Synced hourly stats for ${date}`);
    }

    /**
     * Sync daily summary (aggregated from 24 hours)
     */
    async syncDailySummary(date: string) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        // Aggregate all transactions for the day
        const transactionStats = await this.transactionModel.aggregate([
            {
                $match: {
                    timestamp: { $gte: startOfDay, $lt: endOfDay },
                },
            },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    amount: { $sum: '$amount' },
                },
            },
        ]);

        // Aggregate all withdrawals for the day
        const withdrawalStats = await this.withdrawalModel.aggregate([
            {
                $match: {
                    timestamp: { $gte: startOfDay, $lt: endOfDay },
                },
            },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    amount: { $sum: '$amount' },
                },
            },
        ]);

        const summary = {
            date,
            transactions: this.calculateStatusBreakdown(transactionStats),
            withdrawals: this.calculateStatusBreakdown(withdrawalStats),
            timestamp: new Date().toISOString(),
        };

        // Store in Redis
        const key = `stats:daily:${date}`;
        await this.redisService.set(key, JSON.stringify(summary), 60 * 60 * 24 * 60); // 60 days TTL

        this.logger.debug(`Synced daily summary for ${date}`);
    }

    /**
     * Sync provider statistics
     */
    async syncProviderStats(days: number = 7) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Get all unique providers
        const transactionProviders = await this.transactionModel.distinct('provider', {
            timestamp: { $gte: startDate, $lt: endDate },
        });

        const withdrawalProviders = await this.withdrawalModel.distinct('provider', {
            timestamp: { $gte: startDate, $lt: endDate },
        });

        const allProviders = [...new Set([...transactionProviders, ...withdrawalProviders])];

        for (const provider of allProviders) {
            // Aggregate transaction stats by provider
            const transactionStats = await this.transactionModel.aggregate([
                {
                    $match: {
                        provider,
                        timestamp: { $gte: startDate, $lt: endDate },
                    },
                },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                        amount: { $sum: '$amount' },
                    },
                },
            ]);

            // Aggregate withdrawal stats by provider
            const withdrawalStats = await this.withdrawalModel.aggregate([
                {
                    $match: {
                        provider,
                        timestamp: { $gte: startDate, $lt: endDate },
                    },
                },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                        amount: { $sum: '$amount' },
                    },
                },
            ]);

            const providerData = {
                provider,
                period: `${days}days`,
                transactions: this.calculateStatusBreakdown(transactionStats),
                withdrawals: this.calculateStatusBreakdown(withdrawalStats),
                lastUpdated: new Date().toISOString(),
            };

            // Store in Redis
            const key = `stats:provider:${provider}`;
            await this.redisService.set(key, JSON.stringify(providerData), 60 * 60 * 24 * 7); // 7 days TTL

            this.logger.debug(`Synced provider stats for ${provider}`);
        }
    }

    /**
     * Aggregate weekly stats
     */
    async aggregateWeeklyStats(startDate: Date, endDate: Date) {
        const weekKey = `${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}`;

        // Daily breakdown for the week
        const dailyStats = [];
        const current = new Date(startDate);

        while (current <= endDate) {
            const dateStr = current.toISOString().split('T')[0];
            const dayStart = new Date(current);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(current);
            dayEnd.setHours(23, 59, 59, 999);

            const transactionStats = await this.transactionModel.aggregate([
                {
                    $match: {
                        timestamp: { $gte: dayStart, $lt: dayEnd },
                    },
                },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                        amount: { $sum: '$amount' },
                    },
                },
            ]);

            const withdrawalStats = await this.withdrawalModel.aggregate([
                {
                    $match: {
                        timestamp: { $gte: dayStart, $lt: dayEnd },
                    },
                },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                        amount: { $sum: '$amount' },
                    },
                },
            ]);

            dailyStats.push({
                date: dateStr,
                transactions: this.calculateStatusBreakdown(transactionStats),
                withdrawals: this.calculateStatusBreakdown(withdrawalStats),
            });

            current.setDate(current.getDate() + 1);
        }

        const weeklyData = {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            daily: dailyStats,
            timestamp: new Date().toISOString(),
        };

        // Store in Redis
        const key = `stats:weekly:${weekKey}`;
        await this.redisService.set(key, JSON.stringify(weeklyData), 60 * 60 * 24 * 90); // 90 days TTL

        this.logger.debug(`Synced weekly stats for ${weekKey}`);
    }

    /**
     * Calculate status breakdown from aggregation results
     */
    private calculateStatusBreakdown(stats: any[]) {
        const breakdown = {
            success: { count: 0, amount: 0 },
            failed: { count: 0, amount: 0 },
            pending: { count: 0, amount: 0 },
            total: { count: 0, amount: 0 },
        };

        stats.forEach((stat) => {
            const status = stat._id?.toLowerCase() || 'unknown';
            const count = stat.count || 0;
            const amount = stat.amount || 0;

            if (status === 'success') {
                breakdown.success.count = count;
                breakdown.success.amount = amount;
            } else if (status === 'failed') {
                breakdown.failed.count = count;
                breakdown.failed.amount = amount;
            } else if (status === 'pending') {
                breakdown.pending.count = count;
                breakdown.pending.amount = amount;
            }

            breakdown.total.count += count;
            breakdown.total.amount += amount;
        });

        return breakdown;
    }

    /**
     * Full sync - sync all historical data
     */
    async fullSync() {
        this.logger.log('Starting full sync...');

        // Sync last 30 days hourly + daily
        const now = new Date();
        for (let i = 0; i < 30; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            await this.syncDayStats(dateStr);
            await this.syncDailySummary(dateStr);
        }

        // Sync provider stats (last 30 days)
        await this.syncProviderStats(30);

        // Sync weekly stats (last 12 weeks)
        for (let i = 0; i < 12; i++) {
            const endDate = new Date(now);
            endDate.setDate(endDate.getDate() - (i * 7));
            const startDate = new Date(endDate);
            startDate.setDate(startDate.getDate() - 7);

            await this.aggregateWeeklyStats(startDate, endDate);
        }

        this.logger.log('Full sync completed');
    }
}

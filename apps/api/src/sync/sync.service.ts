import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Transaction, TransactionDocument } from '../database/schemas/transaction.schema';
import { Withdrawal, WithdrawalDocument } from '../database/schemas/withdrawal.schema';
import { RedisService } from '../redis/redis.service';
import { FileConfigService } from '../config/file-config.service';
import { TransactionSchema } from '../database/schemas/transaction.schema';
import { WithdrawalSchema } from '../database/schemas/withdrawal.schema';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pLimit = require('p-limit');

// Interface definition locally to avoid circular dep or move to shared lib
export interface AmountDistribution {
    range: string;
    count: number;
    amount: number;
    providers?: Record<string, { count: number; amount: number }>;
}

@Injectable()
export class SyncService {
    private readonly logger = new Logger(SyncService.name);

    private syncStatus = {
        status: 'idle', // idle, running, completed, failed
        message: 'Ready',
        progress: 0,
        lastUpdated: new Date()
    };

    constructor(
        private readonly redisService: RedisService,
        private readonly fileConfigService: FileConfigService,
        @InjectConnection() private readonly connection: Connection,
    ) { }

    getSyncStatus() {
        return this.syncStatus;
    }

    private updateSyncStatus(status: string, message: string, progress: number) {
        this.syncStatus = {
            status,
            message,
            progress,
            lastUpdated: new Date()
        };
    }

    private getModelsForDb(dbName: string) {
        const db = this.connection.useDb(dbName);
        // All known production databases use 'withdraws' collection
        const withdrawalCollection = 'withdraws';

        return {
            Transaction: db.model(Transaction.name, TransactionSchema),
            Withdrawal: db.model(Withdrawal.name, WithdrawalSchema, withdrawalCollection),
        };
    }

    /**
     * Main sync cron - runs every minute
     * Syncs current day stats and hot data
     */
    @Cron(CronExpression.EVERY_MINUTE)
    async syncCurrentData() {
        if (this.syncStatus.status === 'running') {
            this.logger.warn('Sync already running, skipping...');
            return;
        }

        try {
            this.updateSyncStatus('running', 'Starting incremental sync...', 0);
            this.logger.log('Starting incremental sync...');

            const now = new Date();
            const date = now.toISOString().split('T')[0];

            // Sync current day
            this.updateSyncStatus('running', `Syncing stats for ${date}...`, 20);
            await this.syncDayStats(date);

            this.updateSyncStatus('running', `Generating daily summary for ${date}...`, 50);
            await this.syncDailySummary(date);

            // Sync provider stats (last 7 days)
            this.updateSyncStatus('running', 'Syncing provider stats (last 7 days)...', 80);
            await this.syncProviderStats(7);

            this.updateSyncStatus('completed', 'Incremental sync completed', 100);
            this.logger.log('Incremental sync completed');

            // Reset to idle after a delay
            setTimeout(() => {
                if (this.syncStatus.status === 'completed') {
                    this.updateSyncStatus('idle', 'Ready', 0);
                }
            }, 5000);

        } catch (error) {
            this.updateSyncStatus('failed', `Sync failed: ${error.message}`, 0);
            this.logger.error('Failed to sync current data:', error);
        }
    }

    /**
     * Weekly aggregation - runs every day at 1 AM
     */
    /**
     * Full sync - manually triggered
     * Syncs last 30 days
     */
    async fullSync() {
        if (this.syncStatus.status === 'running') {
            this.logger.warn('Sync already running, skipping...');
            return;
        }

        try {
            this.updateSyncStatus('running', 'Starting full sync (last 30 days)...', 0);
            this.logger.log('Starting full sync...');

            const now = new Date();
            const days = 30;

            for (let i = 0; i < days; i++) {
                const date = new Date(now);
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];

                const progress = Math.round((i / days) * 100);
                this.updateSyncStatus('running', `Syncing data for ${dateStr} (${i + 1}/${days})...`, progress);

                await this.syncDayStats(dateStr);
                await this.syncDailySummary(dateStr);
            }

            this.updateSyncStatus('running', 'Syncing provider stats...', 90);
            await this.syncProviderStats(30);

            this.updateSyncStatus('completed', 'Full sync completed', 100);
            this.logger.log('Full sync completed');

            setTimeout(() => {
                if (this.syncStatus.status === 'completed') {
                    this.updateSyncStatus('idle', 'Ready', 0);
                }
            }, 5000);

        } catch (error) {
            this.updateSyncStatus('failed', `Full sync failed: ${error.message}`, 0);
            this.logger.error('Failed to sync full data:', error);
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
        // Only track status if manually triggered (we can infer this if status is 'running' and message is 'Warming cache...')
        // But for cron, we might not want to overwrite status if a manual sync is running.
        // Let's only update status if idle.
        if (this.syncStatus.status === 'running') {
            // If manual sync is running, don't interfere.
            // If it's just cron, we proceed but maybe don't update global status to avoid UI flicker?
            // For now, let's assume manual triggers are primary for UI.
            return;
        }

        try {
            // We won't update global status for background cron jobs to avoid confusing the user
            // unless we want to show background activity.
            // Let's update it but check if we should.
            // Actually, user wants to see progression.

            // For manual trigger via controller, we will set status.
            // The controller calls this method.
            // We can add a parameter `isManual`?
            // Or just check if status is idle.

            // Let's make warmCache accept an optional argument.
        } catch (error) {
            this.logger.error('Failed to warm cache:', error);
        }
    }

    // Overloaded warmCache for manual trigger
    async triggerWarmCache() {
        if (this.syncStatus.status === 'running') {
            return;
        }

        try {
            this.updateSyncStatus('running', 'Warming cache (last 7 days)...', 0);
            this.logger.log('Starting cache warming...');

            const now = new Date();
            for (let i = 0; i < 7; i++) {
                const date = new Date(now);
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];

                const progress = Math.round((i / 7) * 100);
                this.updateSyncStatus('running', `Warming cache for ${dateStr}...`, progress);

                await this.syncDayStats(dateStr);
                await this.syncDailySummary(dateStr);
            }

            this.updateSyncStatus('completed', 'Cache warming completed', 100);
            this.logger.log('Cache warming completed');

            setTimeout(() => {
                if (this.syncStatus.status === 'completed') {
                    this.updateSyncStatus('idle', 'Ready', 0);
                }
            }, 5000);
        } catch (error) {
            this.updateSyncStatus('failed', `Cache warming failed: ${error.message}`, 0);
            this.logger.error('Failed to warm cache:', error);
        }
    }



    async syncBulk(dates: string[]) {
        if (this.syncStatus.status === 'running') {
            this.logger.warn('Sync already running, skipping bulk sync...');
            return { message: 'Sync already running', processed: 0 };
        }

        try {
            this.updateSyncStatus('running', `Bulk syncing ${dates.length} dates...`, 0);
            this.logger.log(`Starting bulk sync for ${dates.length} dates (concurrency: 10)...`);

            const limit = pLimit(10);
            let processedCount = 0;

            const tasks = dates.map(date => {
                return limit(async () => {
                    try {
                        this.logger.log(`Processing ${date}...`);
                        await this.syncDayStats(date);
                        await this.syncDailySummary(date);
                        processedCount++;
                        const progress = Math.round((processedCount / dates.length) * 100);
                        this.updateSyncStatus('running', `Bulk syncing... (${processedCount}/${dates.length})`, progress);
                    } catch (error) {
                        this.logger.error(`Failed to sync date ${date}:`, error);
                    }
                });
            });

            await Promise.all(tasks);

            this.updateSyncStatus('completed', 'Bulk sync completed', 100);
            this.logger.log('Bulk sync completed');

            setTimeout(() => {
                if (this.syncStatus.status === 'completed') {
                    this.updateSyncStatus('idle', 'Ready', 0);
                }
            }, 5000);

            return { message: 'Bulk sync completed', processed: processedCount };

        } catch (error) {
            this.updateSyncStatus('failed', `Bulk sync failed: ${error.message}`, 0);
            this.logger.error('Failed to execute bulk sync:', error);
            throw error;
        }
    }

    /**
     * Get list of dates that have cached daily stats with actual data
     */
    async getCacheStatus() {
        const keys = await this.redisService.keys('stats:daily:*');

        if (keys.length === 0) {
            return [];
        }

        const values = await this.redisService.mget(keys);
        const datesWithData: string[] = [];

        keys.forEach((key, index) => {
            const value = values[index];
            if (value) {
                try {
                    const data = JSON.parse(value);
                    const txCount = data.transactions?.total?.count || 0;
                    const wdCount = data.withdrawals?.total?.count || 0;

                    if (txCount > 0 || wdCount > 0) {
                        datesWithData.push(key.replace('stats:daily:', ''));
                    }
                } catch (error) {
                    this.logger.warn(`Failed to parse cache for key ${key}`);
                }
            }
        });

        return datesWithData.sort();
    }

    /**
     * Sync hourly stats for a specific day
     */
    async syncDayStats(date: string) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        this.logger.log(`[Debug] Syncing hourly stats for ${date}. Range: ${startOfDay.toISOString()} - ${endOfDay.toISOString()}`);

        const dbNames = await this.fileConfigService.getDatabases();
        const hourlyStatsMap = new Map<number, { transactions: any, withdrawals: any }>();

        // Initialize map for 24 hours
        for (let h = 0; h < 24; h++) {
            hourlyStatsMap.set(h, {
                transactions: this.createEmptyBreakdown(),
                withdrawals: this.createEmptyBreakdown()
            });
        }

        for (const dbName of dbNames) {
            try {
                const { Transaction: TxModel, Withdrawal: WdModel } = this.getModelsForDb(dbName);

                // Fetch ALL data for the day in one go
                const [txStats, wdStats] = await Promise.all([
                    TxModel.aggregate([
                        { $match: { createdAt: { $gte: startOfDay, $lt: endOfDay } } },
                        {
                            $group: {
                                _id: {
                                    hour: { $hour: '$createdAt' },
                                    status: '$status'
                                },
                                count: { $sum: 1 },
                                amount: { $sum: '$amount' }
                            }
                        }
                    ]),
                    WdModel.aggregate([
                        { $match: { createdAt: { $gte: startOfDay, $lt: endOfDay } } },
                        {
                            $group: {
                                _id: {
                                    hour: { $hour: '$createdAt' },
                                    status: '$status'
                                },
                                count: { $sum: 1 },
                                amount: { $sum: '$amount' }
                            }
                        }
                    ])
                ]);

                this.logger.log(`[Debug] [${dbName}] Fetched day stats. Tx groups: ${txStats.length}, Wd groups: ${wdStats.length}`);

                // Process Transactions
                for (const stat of txStats) {
                    const hour = stat._id.hour;
                    // Adjust hour if needed (MongoDB aggregates in UTC usually, need to check timezone handling)
                    // Assuming server and DB are aligned or we handle UTC. 
                    // For now, let's assume the hour returned is correct for the requested day.

                    if (hourlyStatsMap.has(hour)) {
                        const current = hourlyStatsMap.get(hour);
                        const rawStatus = stat._id.status || 'unknown';
                        const status = this.normalizeStatus(rawStatus);
                        const count = stat.count || 0;
                        const amount = stat.amount || 0;

                        if (status === 'success') {
                            current.transactions.success.count += count;
                            current.transactions.success.amount += amount;
                        } else if (status === 'failed') {
                            current.transactions.failed.count += count;
                            current.transactions.failed.amount += amount;
                        } else if (status === 'pending') {
                            current.transactions.pending.count += count;
                            current.transactions.pending.amount += amount;
                        }
                        current.transactions.total.count += count;
                        current.transactions.total.amount += amount;
                    }
                }

                // Process Withdrawals
                for (const stat of wdStats) {
                    const hour = stat._id.hour;
                    if (hourlyStatsMap.has(hour)) {
                        const current = hourlyStatsMap.get(hour);
                        const rawStatus = stat._id.status || 'unknown';
                        const status = this.normalizeStatus(rawStatus);
                        const count = stat.count || 0;
                        const amount = stat.amount || 0;

                        if (status === 'success') {
                            current.withdrawals.success.count += count;
                            current.withdrawals.success.amount += amount;
                        } else if (status === 'failed') {
                            current.withdrawals.failed.count += count;
                            current.withdrawals.failed.amount += amount;
                        } else if (status === 'pending') {
                            current.withdrawals.pending.count += count;
                            current.withdrawals.pending.amount += amount;
                        }
                        current.withdrawals.total.count += count;
                        current.withdrawals.total.amount += amount;
                    }
                }

            } catch (error) {
                this.logger.error(`Failed to sync hourly stats from ${dbName}:`, error);
            }
        }

        const hourlyStats = Array.from(hourlyStatsMap.entries()).map(([hour, data]) => ({
            hour,
            transactions: data.transactions,
            withdrawals: data.withdrawals
        }));

        // Store in Redis
        const key = `stats:hourly:${date}`;
        await this.redisService.set(key, JSON.stringify({ date, hourly: hourlyStats }), 60 * 60 * 24 * 30); // 30 days TTL

        this.logger.debug(`Synced hourly stats for ${date}`);

        return { date, hourly: hourlyStats };
    }

    /**
     * Sync daily summary (aggregated from 24 hours)
     */
    async syncDailySummary(date: string) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        this.logger.log(`[Debug] Syncing daily summary for ${date}`);

        const dbNames = await this.fileConfigService.getDatabases();
        const totalTxBreakdown = this.createEmptyBreakdown();
        const totalWdBreakdown = this.createEmptyBreakdown();
        const providersMap: Record<string, any> = {};
        const sitesMap: Record<string, any> = {};
        const globalAmountDistribution: Record<string, AmountDistribution> = {};
        const globalHourlyDistribution: Record<string, Record<string, { count: number; providers?: Record<string, { count: number }> }>> = {};

        for (const dbName of dbNames) {
            try {
                const { Transaction: TxModel, Withdrawal: WdModel } = this.getModelsForDb(dbName);

                const [txStats, wdStats, txSiteStats, wdSiteStats, txSiteHourlyStats, txSiteAmountStats, txSiteHourlyHeatmapStats] = await Promise.all([
                    // Overall stats
                    TxModel.aggregate([
                        { $match: { createdAt: { $gte: startOfDay, $lt: endOfDay } } },
                        { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } }
                    ]),
                    WdModel.aggregate([
                        { $match: { createdAt: { $gte: startOfDay, $lt: endOfDay } } },
                        { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } }
                    ]),
                    // Site stats (Total & Provider breakdown)
                    TxModel.aggregate([
                        { $match: { createdAt: { $gte: startOfDay, $lt: endOfDay } } },
                        {
                            $group: {
                                _id: {
                                    site: { $ifNull: ['$site', '$metadata.site'] },
                                    status: '$status'
                                },
                                count: { $sum: 1 },
                                amount: { $sum: '$amount' }
                            }
                        }
                    ]),
                    WdModel.aggregate([
                        { $match: { createdAt: { $gte: startOfDay, $lt: endOfDay } } },
                        {
                            $group: {
                                _id: {
                                    site: { $ifNull: ['$site', '$metadata.site'] },
                                    status: '$status'
                                },
                                count: { $sum: 1 },
                                amount: { $sum: '$amount' }
                            }
                        }
                    ]),
                    // Site Hourly stats (Transactions only for now for trends)
                    TxModel.aggregate([
                        { $match: { createdAt: { $gte: startOfDay, $lt: endOfDay } } },
                        {
                            $group: {
                                _id: {
                                    site: '$site',
                                    status: '$status',
                                    hour: { $hour: { date: '$createdAt', timezone: 'Asia/Bangkok' } } // Assuming Asia/Bangkok or UTC? Let's use UTC for consistency or server time. 
                                    // If server is UTC, $hour returns UTC hour. Frontend converts.
                                    // Actually, let's stick to UTC from date object to be safe.
                                },
                                count: { $sum: 1 },
                                amount: { $sum: '$amount' }
                            }
                        }
                    ]),
                    // Amount Distribution (Tx only)
                    TxModel.aggregate([
                        { $match: { createdAt: { $gte: startOfDay, $lt: endOfDay } } },
                        {
                            $project: {
                                site: { $ifNull: ['$site', '$metadata.site'] },
                                provider: 1,
                                status: 1,
                                amount: 1,
                                range: {
                                    $switch: {
                                        branches: [
                                            { case: { $lte: ['$amount', 100] }, then: '0-100' },
                                            { case: { $lte: ['$amount', 500] }, then: '101-500' },
                                            { case: { $lte: ['$amount', 1000] }, then: '501-1000' },
                                            { case: { $lte: ['$amount', 5000] }, then: '1001-5000' },
                                            { case: { $lte: ['$amount', 10000] }, then: '5001-10000' },
                                            { case: { $lte: ['$amount', 50000] }, then: '10001-50000' },
                                        ],
                                        default: '>50000'
                                    }
                                }
                            }
                        },
                        {
                            $group: {
                                _id: { site: '$site', provider: '$provider', status: '$status', range: '$range' },
                                count: { $sum: 1 },
                                amount: { $sum: '$amount' }
                            }
                        }
                    ]),
                    // Hourly Heatmap (Tx only: Hour x Range 50 THB intervals)
                    TxModel.aggregate([
                        { $match: { createdAt: { $gte: startOfDay, $lt: endOfDay } } },
                        {
                            $project: {
                                site: { $ifNull: ['$site', '$metadata.site'] },
                                provider: 1,
                                status: 1,
                                hour: { $hour: { date: '$createdAt', timezone: 'Asia/Bangkok' } },
                                range: {
                                    $let: {
                                        vars: {
                                            lower: { $multiply: [{ $floor: { $divide: ['$amount', 50] } }, 50] }
                                        },
                                        in: {
                                            $concat: [
                                                { $toString: '$$lower' },
                                                '-',
                                                { $toString: { $add: ['$$lower', 50] } }
                                            ]
                                        }
                                    }
                                }
                            }
                        },
                        {
                            $group: {
                                _id: { site: '$site', provider: '$provider', status: '$status', hour: '$hour', range: '$range' },
                                count: { $sum: 1 }
                            }
                        }
                    ])
                ]);

                // this.logger.log(`[Debug][${ dbName }] Daily Summary Raw - Tx: ${ JSON.stringify(txStats) }, Wd: ${ JSON.stringify(wdStats) }`); // Removed temp log

                this.mergeBreakdown(totalTxBreakdown, this.calculateStatusBreakdown(txStats));
                this.mergeBreakdown(totalWdBreakdown, this.calculateStatusBreakdown(wdStats));

                // Process Provider Stats
                const providerName = dbName.replace('-production', '');

                if (!providersMap[providerName]) {
                    providersMap[providerName] = this.createEmptyBreakdown();
                }
                this.mergeBreakdown(providersMap[providerName], this.calculateStatusBreakdown(txStats));
                this.mergeBreakdown(providersMap[providerName], this.calculateStatusBreakdown(wdStats));

                // Process Site Stats
                // Helper to ensure site entry exists
                const ensureSite = (site: string) => {
                    if (!sitesMap[site]) {
                        sitesMap[site] = {
                            total: this.createEmptyBreakdown(),
                            transactions: this.createEmptyBreakdown(), // Separate Tx
                            withdrawals: this.createEmptyBreakdown(),  // Separate Wd
                            providers: {},
                            hourly: {},
                            amountDistribution: {},
                            hourlyDistribution: {}
                        };
                    }
                };

                // Transactions by Site
                for (const stat of txSiteStats) {
                    const site = stat._id.site || 'unknown';
                    const rawStatus = stat._id.status || 'unknown';
                    const status = this.normalizeStatus(rawStatus);
                    const count = stat.count || 0;
                    const amount = stat.amount || 0;

                    ensureSite(site);

                    // Update Total
                    this.addStats(sitesMap[site].total, status, count, amount);
                    this.addStats(sitesMap[site].transactions, status, count, amount); // Add to Tx stats

                    // Update Provider breakdown for this site
                    if (!sitesMap[site].providers[providerName]) {
                        sitesMap[site].providers[providerName] = this.createEmptyBreakdown();
                    }
                    this.addStats(sitesMap[site].providers[providerName], status, count, amount);
                }

                // Withdrawals by Site
                for (const stat of wdSiteStats) {
                    const site = stat._id.site || 'unknown';
                    const rawStatus = stat._id.status || 'unknown';
                    const status = this.normalizeStatus(rawStatus);
                    const count = stat.count || 0;
                    const amount = stat.amount || 0;

                    ensureSite(site);

                    // Update Total (Include Wd in total? Usually yes for "Activity")
                    this.addStats(sitesMap[site].total, status, count, amount);
                    this.addStats(sitesMap[site].withdrawals, status, count, amount); // Add to Wd stats

                    // Update Provider breakdown
                    if (!sitesMap[site].providers[providerName]) {
                        sitesMap[site].providers[providerName] = this.createEmptyBreakdown();
                    }
                    this.addStats(sitesMap[site].providers[providerName], status, count, amount);
                }

                // Hourly Stats by Site
                for (const stat of txSiteHourlyStats) {
                    const site = stat._id.site || 'unknown';
                    const hour = String(stat._id.hour).padStart(2, '0'); // "00", "01", ...
                    const rawStatus = stat._id.status || 'unknown';
                    const status = this.normalizeStatus(rawStatus);
                    const count = stat.count || 0;
                    const amount = stat.amount || 0;

                    ensureSite(site);

                    if (!sitesMap[site].hourly[hour]) {
                        sitesMap[site].hourly[hour] = this.createEmptyBreakdown();
                    }
                    this.addStats(sitesMap[site].hourly[hour], status, count, amount);
                }

                // Process Amount Distribution by Site
                for (const stat of txSiteAmountStats) {
                    const site = stat._id.site || 'unknown';
                    const provider = providerName; // Use providerName from loop

                    const range = stat._id.range || 'unknown';
                    const rawStatus = stat._id.status || 'unknown';
                    const status = this.normalizeStatus(rawStatus);
                    const count = stat.count || 0;
                    const amount = stat.amount || 0;

                    ensureSite(site);

                    if (!sitesMap[site].amountDistribution[range]) {
                        sitesMap[site].amountDistribution[range] = {
                            range: range,
                            count: 0,
                            amount: 0,
                            providers: {}
                        };
                    }
                    sitesMap[site].amountDistribution[range].count += count;
                    sitesMap[site].amountDistribution[range].amount += amount;

                    // Provider breakdown
                    if (!sitesMap[site].amountDistribution[range].providers[provider]) {
                        sitesMap[site].amountDistribution[range].providers[provider] = { count: 0, amount: 0 };
                    }
                    sitesMap[site].amountDistribution[range].providers[provider].count += count;
                    sitesMap[site].amountDistribution[range].providers[provider].amount += amount;

                    // Global Amount Distribution
                    if (!globalAmountDistribution[range]) {
                        globalAmountDistribution[range] = {
                            range: range,
                            count: 0,
                            amount: 0,
                            providers: {}
                        };
                    }
                    globalAmountDistribution[range].count += count;
                    globalAmountDistribution[range].amount += amount;

                    if (!globalAmountDistribution[range].providers[provider]) {
                        globalAmountDistribution[range].providers[provider] = { count: 0, amount: 0 };
                    }
                    globalAmountDistribution[range].providers[provider].count += count;
                    globalAmountDistribution[range].providers[provider].amount += amount;
                }

                // Process Hourly Heatmap by Site
                for (const stat of txSiteHourlyHeatmapStats) {
                    const site = stat._id.site || 'unknown';
                    const provider = providerName; // Use providerName from loop
                    const hour = String(stat._id.hour).padStart(2, '0'); // "00", "01", ...
                    const range = stat._id.range || 'unknown';
                    const rawStatus = stat._id.status || 'unknown';
                    const status = this.normalizeStatus(rawStatus);
                    const count = stat.count || 0;

                    ensureSite(site);

                    if (!sitesMap[site].hourlyDistribution[hour]) {
                        sitesMap[site].hourlyDistribution[hour] = {};
                    }
                    if (!sitesMap[site].hourlyDistribution[hour][range]) {
                        sitesMap[site].hourlyDistribution[hour][range] = { count: 0, providers: {} };
                    }
                    sitesMap[site].hourlyDistribution[hour][range].count += count;

                    // Provider breakdown
                    if (!sitesMap[site].hourlyDistribution[hour][range].providers) {
                        sitesMap[site].hourlyDistribution[hour][range].providers = {};
                    }
                    if (!sitesMap[site].hourlyDistribution[hour][range].providers[provider]) {
                        sitesMap[site].hourlyDistribution[hour][range].providers[provider] = { count: 0 };
                    }
                    sitesMap[site].hourlyDistribution[hour][range].providers[provider].count += count;

                    // Global Hourly Heatmap
                    if (!globalHourlyDistribution[hour]) {
                        globalHourlyDistribution[hour] = {};
                    }
                    if (!globalHourlyDistribution[hour][range]) {
                        globalHourlyDistribution[hour][range] = { count: 0, providers: {} };
                    }
                    globalHourlyDistribution[hour][range].count += count;

                    if (!globalHourlyDistribution[hour][range].providers) {
                        globalHourlyDistribution[hour][range].providers = {};
                    }
                    if (!globalHourlyDistribution[hour][range].providers[provider]) {
                        globalHourlyDistribution[hour][range].providers[provider] = { count: 0 };
                    }
                    globalHourlyDistribution[hour][range].providers[provider].count += count;
                }


            } catch (error) {
                this.logger.error(`Failed to sync daily summary from ${dbName}: `, error);
            }
        }

        const summary = {
            date,
            transactions: totalTxBreakdown,
            withdrawals: totalWdBreakdown,
            providers: providersMap,
            sites: sitesMap,
            amountDistribution: globalAmountDistribution,
            hourlyDistribution: globalHourlyDistribution,
            timestamp: new Date().toISOString(),
        };

        // Store in Redis
        const key = `stats:daily:${date}`;
        this.logger.log(`[Debug] Saving daily summary to Redis: ${key}.Keys: ${Object.keys(summary).join(', ')}`);
        await this.redisService.set(key, JSON.stringify(summary), 60 * 60 * 24 * 60); // 60 days TTL
        this.logger.log(`[Debug] Saved daily summary to Redis: ${key}`);

        this.logger.debug(`Synced daily summary for ${date}`);

        return summary;
    }

    /**
     * Sync provider statistics
     */
    async syncProviderStats(days: number = 7) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const dbNames = await this.fileConfigService.getDatabases();
        const providerStatsMap = new Map<string, { transactions: any, withdrawals: any }>();

        for (const dbName of dbNames) {
            try {
                const { Transaction: TxModel, Withdrawal: WdModel } = this.getModelsForDb(dbName);

                // Get all unique providers
                const [txProviders, wdProviders] = await Promise.all([
                    TxModel.distinct('provider', { createdAt: { $gte: startDate, $lt: endDate } }),
                    WdModel.distinct('provider', { createdAt: { $gte: startDate, $lt: endDate } })
                ]);

                const allProviders = [...new Set([...txProviders, ...wdProviders])];
                this.logger.log(`[Debug][${dbName}] Syncing providers.Found ${allProviders.length} providers: ${allProviders.join(', ')} `);

                for (const provider of allProviders) {
                    const [txStats, wdStats] = await Promise.all([
                        TxModel.aggregate([
                            { $match: { provider, createdAt: { $gte: startDate, $lt: endDate } } },
                            { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } }
                        ]),
                        WdModel.aggregate([
                            { $match: { provider, createdAt: { $gte: startDate, $lt: endDate } } },
                            { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } }
                        ])
                    ]);

                    if (!providerStatsMap.has(provider)) {
                        providerStatsMap.set(provider, {
                            transactions: this.createEmptyBreakdown(),
                            withdrawals: this.createEmptyBreakdown()
                        });
                    }

                    const current = providerStatsMap.get(provider);
                    this.mergeBreakdown(current.transactions, this.calculateStatusBreakdown(txStats));
                    this.mergeBreakdown(current.withdrawals, this.calculateStatusBreakdown(wdStats));
                }
            } catch (error) {
                this.logger.error(`Failed to sync provider stats from ${dbName}: `, error);
            }
        }

        for (const [provider, stats] of providerStatsMap.entries()) {
            const providerData = {
                provider,
                period: `${days} days`,
                transactions: stats.transactions,
                withdrawals: stats.withdrawals,
                lastUpdated: new Date().toISOString(),
            };

            // Store in Redis
            const key = `stats: provider:${provider} `;
            await this.redisService.set(key, JSON.stringify(providerData), 60 * 60 * 24 * 7); // 7 days TTL

            this.logger.debug(`Synced provider stats for ${provider}`);
        }
    }

    /**
     * Aggregate weekly stats
     */
    async aggregateWeeklyStats(startDate: Date, endDate: Date) {
        const weekKey = `${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]} `;
        const dbNames = await this.fileConfigService.getDatabases();

        // Daily breakdown for the week
        const dailyStats = [];
        const current = new Date(startDate);

        while (current <= endDate) {
            const dateStr = current.toISOString().split('T')[0];
            const dayStart = new Date(current);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(current);
            dayEnd.setHours(23, 59, 59, 999);

            const totalTxBreakdown = this.createEmptyBreakdown();
            const totalWdBreakdown = this.createEmptyBreakdown();

            for (const dbName of dbNames) {
                try {
                    const { Transaction: TxModel, Withdrawal: WdModel } = this.getModelsForDb(dbName);

                    const [txStats, wdStats] = await Promise.all([
                        TxModel.aggregate([
                            { $match: { createdAt: { $gte: dayStart, $lt: dayEnd } } },
                            { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } }
                        ]),
                        WdModel.aggregate([
                            { $match: { createdAt: { $gte: dayStart, $lt: dayEnd } } },
                            { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } }
                        ])
                    ]);

                    this.mergeBreakdown(totalTxBreakdown, this.calculateStatusBreakdown(txStats));
                    this.mergeBreakdown(totalWdBreakdown, this.calculateStatusBreakdown(wdStats));
                } catch (error) {
                    this.logger.error(`Failed to sync weekly stats from ${dbName}: `, error);
                }
            }

            dailyStats.push({
                date: dateStr,
                transactions: totalTxBreakdown,
                withdrawals: totalWdBreakdown,
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
        const key = `stats: weekly:${weekKey} `;
        await this.redisService.set(key, JSON.stringify(weeklyData), 60 * 60 * 24 * 90); // 90 days TTL

        this.logger.debug(`Synced weekly stats for ${weekKey}`);
    }

    private createEmptyBreakdown() {
        return {
            success: { count: 0, amount: 0 },
            failed: { count: 0, amount: 0 },
            pending: { count: 0, amount: 0 },
            total: { count: 0, amount: 0 },
        };
    }

    private addStats(breakdown: any, status: string, count: number, amount: number) {
        if (status === 'success') {
            breakdown.success.count += count;
            breakdown.success.amount += amount;
        } else if (status === 'failed') {
            breakdown.failed.count += count;
            breakdown.failed.amount += amount;
        } else if (status === 'pending') {
            breakdown.pending.count += count;
            breakdown.pending.amount += amount;
        }
        breakdown.total.count += count;
        breakdown.total.amount += amount;
    }

    private mergeBreakdown(target: any, source: any) {
        target.success.count += source.success.count;
        target.success.amount += source.success.amount;
        target.failed.count += source.failed.count;
        target.failed.amount += source.failed.amount;
        target.pending.count += source.pending.count;
        target.pending.amount += source.pending.amount;
        target.total.count += source.total.count;
        target.total.amount += source.total.amount;
    }

    /**
     * Normalize status to standard types
     */
    private normalizeStatus(rawStatus: string): 'success' | 'failed' | 'pending' | 'unknown' {
        const status = rawStatus?.toLowerCase() || 'unknown';

        if (['success', 'successed', 'sended', 'completed'].includes(status)) {
            return 'success';
        }

        if (['failed', 'create_failed', 'error', 'rejected', 'cancelled'].includes(status)) {
            return 'failed';
        }

        if (['pending', 'created', 'processing', 'waiting'].includes(status)) {
            return 'pending';
        }

        return 'unknown';
    }

    /**
     * Calculate status breakdown from aggregation results
     */
    private calculateStatusBreakdown(stats: any[]) {
        const breakdown = this.createEmptyBreakdown();

        stats.forEach((stat) => {
            const rawStatus = stat._id || 'unknown';
            const status = this.normalizeStatus(rawStatus);
            const count = stat.count || 0;
            const amount = stat.amount || 0;

            if (status === 'success') {
                breakdown.success.count += count;
                breakdown.success.amount += amount;
            } else if (status === 'failed') {
                breakdown.failed.count += count;
                breakdown.failed.amount += amount;
            } else if (status === 'pending') {
                breakdown.pending.count += count;
                breakdown.pending.amount += amount;
            }

            breakdown.total.count += count;
            breakdown.total.amount += amount;
        });

        return breakdown;
    }

    /**
     * Full sync - sync all historical data
     */

}

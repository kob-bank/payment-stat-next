import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Schema } from 'mongoose';
import { FileConfigService } from '../config/file-config.service';

// MongoDB document interface with all fields we need
interface RawTransaction {
    _id: string;
    site: string;
    amount: number;
    status: string;
    customerId?: string;
    createdAt: Date;
    updatedAt: Date;
    [key: string]: any;
}

export interface TransactionReportData {
    amount: number;
    status: string;
    customerId: string;
    timestamp: string;
}

export interface ReportOptions {
    startDate?: Date;
    endDate?: Date;
    output?: string;
}

@Injectable()
export class ReportsService {
    private readonly logger = new Logger(ReportsService.name);

    constructor(
        @InjectConnection() private readonly connection: Connection,
        private readonly fileConfigService: FileConfigService,
    ) { }

    private getTransactionModel(dbName: string) {
        const db = this.connection.useDb(dbName);
        // Create a flexible schema that accepts any fields
        const transactionSchema = new Schema({}, {
            strict: false,
            timestamps: true,
            collection: 'transactions'
        });
        return db.model<RawTransaction>('Transaction', transactionSchema);
    }

    /**
     * Find the earliest transaction date for a given site
     */
    async findEarliestTransactionDate(site: string): Promise<Date | null> {
        const databases = await this.fileConfigService.getDatabases();
        let earliestDate: Date | null = null;

        for (const dbName of databases) {
            try {
                const TxModel = this.getTransactionModel(dbName);
                const result = await TxModel
                    .findOne({ site } as any)
                    .sort({ createdAt: 1 })
                    .lean()
                    .exec();

                if (result && result.createdAt && (!earliestDate || result.createdAt < earliestDate)) {
                    earliestDate = result.createdAt;
                }
            } catch (error: any) {
                this.logger.warn(`Failed to query ${dbName}: ${error.message}`);
            }
        }

        return earliestDate;
    }

    /**
     * Count total transactions for a site
     */
    async countTransactions(site: string, startDate?: Date, endDate?: Date): Promise<number> {
        const databases = await this.fileConfigService.getDatabases();
        let totalCount = 0;

        for (const dbName of databases) {
            try {
                const TxModel = this.getTransactionModel(dbName);
                const query: any = { site };
                if (startDate || endDate) {
                    query.createdAt = {};
                    if (startDate) query.createdAt.$gte = startDate;
                    if (endDate) query.createdAt.$lte = endDate;
                }

                const count = await TxModel.countDocuments(query).exec();
                totalCount += count;
            } catch (error: any) {
                this.logger.warn(`Failed to count in ${dbName}: ${error.message}`);
            }
        }

        return totalCount;
    }

    /**
     * Stream transactions for a site (async generator for memory efficiency)
     */
    async *streamTransactions(
        site: string,
        startDate?: Date,
        endDate?: Date,
        onProgress?: (current: number, total: number) => void
    ): AsyncGenerator<TransactionReportData[]> {
        const databases = await this.fileConfigService.getDatabases();
        let globalProcessed = 0;

        // First, get total count for progress tracking
        const total = await this.countTransactions(site, startDate, endDate);

        for (const dbName of databases) {
            try {
                const TxModel = this.getTransactionModel(dbName);

                const query: any = { site };
                if (startDate || endDate) {
                    query.createdAt = {};
                    if (startDate) query.createdAt.$gte = startDate;
                    if (endDate) query.createdAt.$lte = endDate;
                }

                const batchSize = 1000;
                let skip = 0;
                let hasMore = true;

                while (hasMore) {
                    const batch: RawTransaction[] = await TxModel
                        .find(query)
                        .sort({ createdAt: 1 })
                        .skip(skip)
                        .limit(batchSize)
                        .lean()
                        .exec();

                    if (batch.length === 0) {
                        hasMore = false;
                        break;
                    }

                    // Transform to report format
                    const transformed: TransactionReportData[] = batch
                        .filter((tx: RawTransaction) => tx.customerId) // Only include transactions with customerId
                        .map((tx: RawTransaction) => ({
                            amount: tx.amount,
                            status: tx.status,
                            customerId: tx.customerId!,
                            timestamp: tx.createdAt.toISOString(),
                        }));

                    if (transformed.length > 0) {
                        yield transformed;
                    }

                    globalProcessed += batch.length;
                    if (onProgress) {
                        onProgress(globalProcessed, total);
                    }

                    skip += batch.length;
                    hasMore = batch.length === batchSize;
                }
            } catch (error: any) {
                this.logger.warn(`Failed to stream from ${dbName}: ${error.message}`);
            }
        }
    }
}

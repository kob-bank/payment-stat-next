import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { ReportsService } from '../reports/reports.service';
import { TOMLWriter } from '../reports/toml-writer';

interface CLIOptions {
    site: string;
    startDate?: string;
    endDate?: string;
    output?: string;
}

function parseArgs(): CLIOptions {
    const args = process.argv.slice(2);
    const options: CLIOptions = {
        site: 'uni168',
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith('--site=')) {
            options.site = arg.split('=')[1];
        } else if (arg.startsWith('--startDate=')) {
            options.startDate = arg.split('=')[1];
        } else if (arg.startsWith('--endDate=')) {
            options.endDate = arg.split('=')[1];
        } else if (arg.startsWith('--output=')) {
            options.output = arg.split('=')[1];
        }
    }

    return options;
}

async function main() {
    const logger = new Logger('GenerateTOMLReport');
    const options = parseArgs();

    logger.log(`Starting TOML report generation for site: ${options.site}`);

    // Create NestJS application context
    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: ['log', 'error', 'warn'],
    });

    const reportsService = app.get(ReportsService);

    try {
        // Find earliest transaction date if not specified
        let startDate: Date | undefined;
        let endDate: Date | undefined;

        if (options.startDate) {
            startDate = new Date(options.startDate);
        } else {
            logger.log('Finding earliest transaction date...');
            startDate = await reportsService.findEarliestTransactionDate(options.site);
            if (startDate) {
                logger.log(`Earliest transaction found: ${startDate.toISOString()}`);
            } else {
                logger.warn(`No transactions found for site: ${options.site}`);
                await app.close();
                process.exit(1);
            }
        }

        if (options.endDate) {
            endDate = new Date(options.endDate);
        }

        // Count total transactions
        logger.log('Counting total transactions...');
        const total = await reportsService.countTransactions(options.site, startDate, endDate);
        logger.log(`Total transactions to process: ${total}`);

        if (total === 0) {
            logger.warn('No transactions to export');
            await app.close();
            process.exit(0);
        }

        // Create TOML writer
        const writer = new TOMLWriter({
            site: options.site,
            output: options.output,
            startDate,
            endDate,
        });

        await writer.initialize();
        logger.log(`Writing report to: ${writer.getFilePath()}`);

        // Stream transactions and write to file
        let lastProgressUpdate = Date.now();
        const transactionStream = reportsService.streamTransactions(
            options.site,
            startDate,
            endDate,
            (current, total) => {
                const now = Date.now();
                // Update progress every 2 seconds
                if (now - lastProgressUpdate > 2000) {
                    const percentage = ((current / total) * 100).toFixed(2);
                    logger.log(`Progress: ${current}/${total} (${percentage}%)`);
                    lastProgressUpdate = now;
                }
            }
        );

        for await (const batch of transactionStream) {
            await writer.writeTransactions(batch);
        }

        await writer.finalize();

        logger.log(`Report generation complete!`);
        logger.log(`Total transactions written: ${writer.getCount()}`);
        logger.log(`Output file: ${writer.getFilePath()}`);

    } catch (error) {
        logger.error(`Failed to generate report: ${error.message}`, error.stack);
        process.exit(1);
    } finally {
        await app.close();
    }

    process.exit(0);
}

main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});

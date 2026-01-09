import * as fs from 'fs/promises';
import * as path from 'path';
import { TransactionReportData } from './reports.service';

export interface TOMLWriterOptions {
    site: string;
    output?: string;
    startDate?: Date;
    endDate?: Date;
}

export class TOMLWriter {
    private filePath: string;
    private writeStream: any;
    private count = 0;

    constructor(private options: TOMLWriterOptions) {
        this.filePath = options.output || this.getDefaultOutputPath(options.site);
    }

    private getDefaultOutputPath(site: string): string {
        const reportsDir = path.join(process.cwd(), 'reports', site);
        const timestamp = new Date().toISOString().split('T')[0];
        return path.join(reportsDir, `${site}-deposits-${timestamp}.toml`);
    }

    async initialize(): Promise<void> {
        // Ensure directory exists
        const dir = path.dirname(this.filePath);
        await fs.mkdir(dir, { recursive: true });

        // Create write stream
        this.writeStream = await fs.open(this.filePath, 'w');

        // Write header
        const header = this.generateHeader();
        await this.writeStream.writeFile(header);
    }

    private generateHeader(): string {
        const lines = [
            '# TOML Deposit Report',
            `# Site: ${this.options.site}`,
            `# Generated: ${new Date().toISOString()}`,
        ];

        if (this.options.startDate) {
            lines.push(`# Date Range: ${this.options.startDate.toISOString()} to ${this.options.endDate?.toISOString() || 'present'}`);
        }

        lines.push('', '');
        return lines.join('\n');
    }

    async writeTransactions(transactions: TransactionReportData[]): Promise<void> {
        for (const tx of transactions) {
            const block = this.formatTransaction(tx);
            await this.writeStream.appendFile(block);
            this.count++;
        }
    }

    private formatTransaction(tx: TransactionReportData): string {
        const lines = [
            '[[transactions]]',
            `amount = ${tx.amount}`,
            `status = "${this.escapeString(tx.status)}"`,
            `customerId = "${this.escapeString(tx.customerId)}"`,
            `timestamp = "${tx.timestamp}"`,
            '',
        ];
        return lines.join('\n');
    }

    private escapeString(value: string): string {
        // Escape special characters for TOML strings
        return value
            .replace(/\\/g, '\\\\')  // Backslash
            .replace(/"/g, '\\"')    // Double quote
            .replace(/\n/g, '\\n')   // Newline
            .replace(/\r/g, '\\r')   // Carriage return
            .replace(/\t/g, '\\t');  // Tab
    }

    async finalize(): Promise<void> {
        // Add summary at the end
        const summary = [
            '',
            '# Summary',
            `# Total transactions: ${this.count}`,
            `# Report saved to: ${this.filePath}`,
        ].join('\n');

        await this.writeStream.appendFile(summary);
        await this.writeStream.close();
    }

    getFilePath(): string {
        return this.filePath;
    }

    getCount(): number {
        return this.count;
    }
}

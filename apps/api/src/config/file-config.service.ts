import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { IConfigService } from './config.interface';

@Injectable()
export class FileConfigService implements IConfigService, OnModuleInit {
    private readonly logger = new Logger(FileConfigService.name);
    private readonly configDir: string;
    private readonly dbConfigFile: string;

    constructor(private configService: ConfigService) {
        this.configDir = this.configService.get<string>('CONFIG_DIR', '/app/config');
        this.dbConfigFile = path.join(this.configDir, 'databases.json');
    }

    async onModuleInit() {
        await this.ensureConfigDir();
        await this.ensureConfigFile();
    }

    private async ensureConfigDir() {
        try {
            await fs.access(this.configDir);
        } catch {
            this.logger.log(`Creating config directory: ${this.configDir}`);
            await fs.mkdir(this.configDir, { recursive: true });
        }
    }

    private async ensureConfigFile() {
        try {
            await fs.access(this.dbConfigFile);
        } catch {
            this.logger.log(`Creating default database config file: ${this.dbConfigFile}`);
            await this.saveDatabases([]);
        }
    }

    async getDatabases(): Promise<string[]> {
        try {
            const content = await fs.readFile(this.dbConfigFile, 'utf-8');
            const data = JSON.parse(content);
            return data.databases || [];
        } catch (error) {
            this.logger.error(`Failed to read databases config: ${error.message}`);
            return [];
        }
    }

    async saveDatabases(databases: string[]): Promise<void> {
        const tempFile = `${this.dbConfigFile}.tmp`;
        const data = { databases, updatedAt: new Date().toISOString() };

        try {
            await fs.writeFile(tempFile, JSON.stringify(data, null, 2));
            await fs.rename(tempFile, this.dbConfigFile);
            this.logger.log(`Updated databases config: ${databases.length} databases`);
        } catch (error) {
            this.logger.error(`Failed to save databases config: ${error.message}`);
            throw error;
        }
    }
}

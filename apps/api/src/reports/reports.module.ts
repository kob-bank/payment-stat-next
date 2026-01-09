import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ConfigModule } from '../config/config.module';
import { DatabaseModule } from '../database/database.module';

@Module({
    imports: [ConfigModule, DatabaseModule],
    providers: [ReportsService],
    exports: [ReportsService],
})
export class ReportsModule { }

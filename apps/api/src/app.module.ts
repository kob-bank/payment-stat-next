import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { StatsModule } from './stats/stats.module';
import { SyncModule } from './sync/sync.module';
import { AdminModule } from './admin/admin.module';

@Module({
    imports: [
        ConfigModule,
        DatabaseModule,
        RedisModule,
        StatsModule,
        SyncModule,
        AdminModule,
        ScheduleModule.forRoot(),
    ],
    controllers: [],
    providers: [],
})
export class AppModule { }

import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { StatsModule } from './stats/stats.module';
import { SyncModule } from './sync/sync.module';

@Module({
    imports: [
        NestConfigModule.forRoot({ isGlobal: true }),
        ConfigModule,
        DatabaseModule,
        RedisModule,
        StatsModule,
        SyncModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule { }

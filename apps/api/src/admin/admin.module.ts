import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { SyncModule } from '../sync/sync.module';
import { RedisModule } from '../redis/redis.module';
import { ConfigModule } from '../config/config.module';

@Module({
    imports: [SyncModule, RedisModule, ConfigModule],
    controllers: [AdminController],
})
export class AdminModule { }

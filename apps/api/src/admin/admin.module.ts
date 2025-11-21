import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { SyncModule } from '../sync/sync.module';
import { RedisModule } from '../redis/redis.module';

@Module({
    imports: [SyncModule, RedisModule],
    controllers: [AdminController],
})
export class AdminModule { }

import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { StatsService } from './stats.service';
import { StatsController } from './stats.controller';

@Module({
    imports: [RedisModule],
    controllers: [StatsController],
    providers: [StatsService],
    exports: [StatsService],
})
export class StatsModule { }

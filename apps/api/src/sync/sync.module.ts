import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
import { RedisModule } from '../redis/redis.module';
import { Transaction, TransactionSchema } from '../database/schemas/transaction.schema';
import { Withdrawal, WithdrawalSchema } from '../database/schemas/withdrawal.schema';
import { SyncService } from './sync.service';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        MongooseModule.forFeature([
            { name: Transaction.name, schema: TransactionSchema },
            { name: Withdrawal.name, schema: WithdrawalSchema },
        ]),
        RedisModule,
    ],
    providers: [SyncService],
    exports: [SyncService],
})
export class SyncModule { }

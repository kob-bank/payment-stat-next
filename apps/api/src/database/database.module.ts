import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Transaction, TransactionSchema } from './schemas/transaction.schema';
import { Withdrawal, WithdrawalSchema } from './schemas/withdrawal.schema';

@Module({
    imports: [
        MongooseModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                uri: configService.get<string>('MONGODB_URI', 'mongodb://localhost:27017/payment-stats'),
            }),
            inject: [ConfigService],
        }),
        MongooseModule.forFeature([
            { name: Transaction.name, schema: TransactionSchema },
            { name: Withdrawal.name, schema: WithdrawalSchema },
        ]),
    ],
    exports: [MongooseModule],
})
export class DatabaseModule { }

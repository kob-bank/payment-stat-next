import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WithdrawalDocument = Withdrawal & Document;

@Schema({ collection: 'withdrawals', timestamps: true })
export class Withdrawal {
    @Prop({ required: true })
    withdrawalId: string;

    @Prop({ required: true })
    amount: number;

    @Prop({ required: true })
    currency: string;

    @Prop({ required: true })
    status: string;

    @Prop({ required: true })
    provider: string;

    @Prop({ required: true })
    timestamp: Date;

    @Prop({ type: Object })
    metadata: Record<string, any>;
}

export const WithdrawalSchema = SchemaFactory.createForClass(Withdrawal);

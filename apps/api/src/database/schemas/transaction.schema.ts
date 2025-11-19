import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TransactionDocument = Transaction & Document;

@Schema({ collection: 'transactions', timestamps: true })
export class Transaction {
    @Prop({ required: true })
    transactionId: string;

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

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

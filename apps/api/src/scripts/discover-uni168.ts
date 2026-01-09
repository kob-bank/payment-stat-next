import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/payment-stats';

async function discoverUni168Structure() {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);

    // Get all database names from config
    const databases = [
        'suzakupay-production',
        'fdpay-production',
        'bitzpay-production',
        'compay-production',
        'chypay-production'
    ];

    console.log('\n=== Searching for uni168 transactions ===\n');

    for (const dbName of databases) {
        try {
            const db = mongoose.connection.useDb(dbName);
            const collections = await db.db.listCollections().toArray();
            const txCollectionName = 'transactions';

            if (collections.some(c => c.name === txCollectionName)) {
                const Transaction = db.model<TransactionDocument>('Transaction', new mongoose.Schema({}, {
                    collection: txCollectionName,
                    strict: false,
                    timestamps: true
                }));

                const sample = await Transaction.findOne({ site: 'uni168' }).lean();

                if (sample) {
                    console.log(`\n✓ Found uni168 transactions in: ${dbName}`);
                    console.log('\n--- Sample Transaction Structure ---');
                    console.log(JSON.stringify(sample, null, 2));

                    // Count total
                    const count = await Transaction.countDocuments({ site: 'uni168' });
                    console.log(`\nTotal uni168 transactions: ${count}`);

                    // Find earliest
                    const earliest = await Transaction.findOne({ site: 'uni168' })
                        .sort({ createdAt: 1 })
                        .lean();
                    console.log(`Earliest transaction: ${earliest?.createdAt}`);

                    // Find latest
                    const latest = await Transaction.findOne({ site: 'uni168' })
                        .sort({ createdAt: -1 })
                        .lean();
                    console.log(`Latest transaction: ${latest?.createdAt}`);

                    // Get unique statuses
                    const statuses = await Transaction.distinct('status', { site: 'uni168' });
                    console.log(`\nStatuses: ${statuses.join(', ')}`);

                    // Check for customerId field
                    const hasCustomerId = await Transaction.findOne({
                        site: 'uni168',
                        customerId: { $exists: true }
                    }).lean();
                    console.log(`\nHas customerId field: ${!!hasCustomerId}`);

                    process.exit(0);
                }
            }
        } catch (error) {
            console.log(`✗ Error checking ${dbName}: ${error.message}`);
        }
    }

    console.log('\n✗ No uni168 transactions found in any database');
    process.exit(1);
}

interface TransactionDocument {
    transactionId: string;
    amount: number;
    currency: string;
    status: string;
    provider: string;
    site: string;
    timestamp: Date;
    metadata?: Record<string, any>;
    customerId?: string;
    createdAt: Date;
    updatedAt: Date;
    [key: string]: any;
}

discoverUni168Structure().catch(console.error);

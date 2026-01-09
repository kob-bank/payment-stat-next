import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/payment-stats';

async function checkAllDatabases() {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);

    const databases = [
        'suzakupay-production',
        'fdpay-production',
        'bitzpay-production',
        'compay-production',
        'chypay-production'
    ];

    const siteVariants = ['uni168', 'uni678', 'UNI168', 'UNI678'];

    console.log('\n=== Checking all databases for uni168/uni678 ===\n');

    for (const dbName of databases) {
        try {
            const db = mongoose.connection.useDb(dbName);
            const collections = await db.db.listCollections().toArray();

            console.log(`\n--- ${dbName} ---`);
            console.log(`Collections: ${collections.map(c => c.name).join(', ')}`);

            // Check transactions collection
            if (collections.some(c => c.name === 'transactions')) {
                for (const site of siteVariants) {
                    const count = await db.collection('transactions').countDocuments({ site });
                    if (count > 0) {
                        console.log(`  ✓ site="${site}": ${count} transactions`);

                        // Get sample
                        const sample = await db.collection('transactions').findOne({ site });
                        console.log(`    Sample customerId: ${sample?.customerId}`);
                        console.log(`    Sample createdAt: ${sample?.createdAt}`);
                    }
                }
            } else {
                console.log(`  No 'transactions' collection`);
            }
        } catch (error: any) {
            console.log(`  ✗ Error: ${error.message}`);
        }
    }

    await mongoose.disconnect();
}

checkAllDatabases().catch(console.error);

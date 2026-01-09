import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/payment-stats';

async function checkCustomerIds() {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);

    const databases = [
        'suzakupay-production',
        'fdpay-production',
        'bitzpay-production',
        'compay-production',
        'chypay-production'
    ];

    console.log('\n=== Checking uni168 transactions with customerId ===\n');

    let totalWithCustomerId = 0;
    let totalAll = 0;

    for (const dbName of databases) {
        try {
            const db = mongoose.connection.useDb(dbName);

            const allCount = await db.collection('transactions').countDocuments({ site: 'uni168' });
            const withCustomerIdCount = await db.collection('transactions').countDocuments({
                site: 'uni168',
                customerId: { $exists: true, $ne: null, $ne: '' }
            });

            if (allCount > 0) {
                console.log(`${dbName}:`);
                console.log(`  All transactions: ${allCount}`);
                console.log(`  With customerId: ${withCustomerIdCount}`);
                console.log(`  Without customerId: ${allCount - withCustomerIdCount}`);

                totalWithCustomerId += withCustomerIdCount;
                totalAll += allCount;
            }
        } catch (error: any) {
            console.log(`${dbName}: Error - ${error.message}`);
        }
    }

    console.log(`\n=== TOTAL ===`);
    console.log(`All transactions: ${totalAll}`);
    console.log(`With customerId: ${totalWithCustomerId}`);
    console.log(`Without customerId: ${totalAll - totalWithCustomerId}`);

    await mongoose.disconnect();
}

checkCustomerIds().catch(console.error);

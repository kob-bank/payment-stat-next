'use client';

import { useState, useEffect } from 'react';
import { apiClient, DailySummary } from '@/lib/api';
import DateSelector from '@/components/dashboard/DateSelector';
import StatsCards from '@/components/dashboard/StatsCards';
import { HourlyStatsChart } from '@/components/charts/HourlyStatsChart';
import { Loader2, AlertCircle } from 'lucide-react';

export default function DashboardPage() {
    const [selectedDate, setSelectedDate] = useState<string>(() => {
        return new Date().toISOString().split('T')[0] || '';
    });

    const [data, setData] = useState<DailySummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                setError(null);
                const result = await apiClient.getDailySummary(selectedDate);
                setData(result);
            } catch (err) {
                console.error('Failed to fetch daily summary:', err);
                setError('Failed to load dashboard data. Please try again.');
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [selectedDate]);


    // Transform DailySummary to StatsSummary
    const getStatsSummary = (summary: DailySummary) => {
        const totalTransactions = summary.transactions.total.count;
        const totalWithdrawals = summary.withdrawals.total.count;
        const totalTransactionAmount = summary.transactions.total.amount;
        const totalWithdrawalAmount = summary.withdrawals.total.amount;

        // Calculate overall success rate
        const totalOps = totalTransactions + totalWithdrawals;
        const successOps = summary.transactions.success.count + summary.withdrawals.success.count;
        const overallSuccessRate = totalOps > 0 ? (successOps / totalOps) * 100 : 0;

        return {
            total_transactions: totalTransactions,
            total_withdrawals: totalWithdrawals,
            total_transaction_amount: totalTransactionAmount,
            total_withdrawal_amount: totalWithdrawalAmount,
            overall_success_rate: overallSuccessRate
        };
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto px-4 py-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                        <p className="text-gray-500 dark:text-gray-400">Daily transaction overview</p>
                    </div>
                    <DateSelector
                        selectedDate={selectedDate}
                        onDateChange={setSelectedDate}
                    />
                </div>

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl mb-8 flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2" />
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                ) : data ? (
                    <div className="space-y-8">
                        {/* Key Metrics */}
                        <StatsCards
                            data={getStatsSummary(data)}
                            isLoading={loading}
                        />

                        {/* Hourly Chart (if available in daily summary, otherwise fetch separately or use what's there) */}
                        {/* Note: DailySummary might not have hourly breakdown depending on API. 
                Let's check type. DailySummary has transactions/withdrawals totals. 
                To get hourly chart, we might need getHourlyStats if DailySummary doesn't include it.
                Wait, DailyStats has hourly. DailySummary has totals.
                Let's fetch HourlyStats as well for the chart.
            */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Hourly Trends</h2>
                            <HourlyStatsChartWrapper date={selectedDate} />
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}

function HourlyStatsChartWrapper({ date }: { date: string }) {
    const [hourlyData, setHourlyData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiClient.getHourlyStats(date)
            .then(data => setHourlyData(data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [date]);

    if (loading) return <div className="h-[400px] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
    if (!hourlyData) return null;

    return <HourlyStatsChart data={hourlyData} />;
}

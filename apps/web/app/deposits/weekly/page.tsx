'use client';

import { useState, useEffect } from 'react';
import { apiClient, WeeklyStats } from '@/lib/api';
import WeeklyDepositComparisonChart from '@/components/charts/WeeklyDepositComparisonChart';
import { Loader2, AlertCircle, Calendar } from 'lucide-react';
import { getWeekRange } from '@/lib/utils';

export default function WeeklyDepositsPage() {
    const [dateRange, setDateRange] = useState(() => getWeekRange());
    const [data, setData] = useState<WeeklyStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                setError(null);
                const result = await apiClient.getWeeklyStats(dateRange.start, dateRange.end);
                setData(result);
            } catch (err) {
                console.error('Failed to fetch weekly stats:', err);
                setError('Failed to load deposit data. Please try again.');
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [dateRange]);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto px-4 py-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Weekly Deposits</h1>
                        <p className="text-gray-500 dark:text-gray-400">Deposit volume comparison</p>
                    </div>

                    <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                        <Calendar className="w-5 h-5 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {dateRange.start} - {dateRange.end}
                        </span>
                    </div>
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
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Deposit Volume Trend</h2>
                        <WeeklyDepositComparisonChart
                            data={{
                                period: 'Weekly',
                                dateRange: {
                                    startDate: dateRange.start,
                                    endDate: dateRange.end
                                },
                                daily_comparison: data.daily.map((day, index) => {
                                    const prevDay = index > 0 ? data.daily[index - 1] : null;
                                    const countChange = prevDay && prevDay.transactions.total.count > 0
                                        ? ((day.transactions.total.count - prevDay.transactions.total.count) / prevDay.transactions.total.count) * 100
                                        : 0;
                                    const amountChange = prevDay && prevDay.transactions.total.amount > 0
                                        ? ((day.transactions.total.amount - prevDay.transactions.total.amount) / prevDay.transactions.total.amount) * 100
                                        : 0;

                                    return {
                                        date: day.date,
                                        deposits: {
                                            count: day.transactions.total.count,
                                            amount: day.transactions.total.amount,
                                            success_rate: day.transactions.total.count > 0
                                                ? (day.transactions.success.count / day.transactions.total.count) * 100
                                                : 0
                                        },
                                        change_from_previous: {
                                            count_change: countChange,
                                            amount_change: amountChange,
                                            trend: countChange > 0 ? 'up' : countChange < 0 ? 'down' : 'stable'
                                        }
                                    };
                                }),
                                week_summary: {
                                    total_deposits: data.daily.reduce((sum, d) => sum + d.transactions.total.count, 0),
                                    total_amount: data.daily.reduce((sum, d) => sum + d.transactions.total.amount, 0),
                                    avg_daily_deposits: data.daily.reduce((sum, d) => sum + d.transactions.total.count, 0) / data.daily.length,
                                    best_day: data.daily.reduce((best, current) =>
                                        current.transactions.total.amount > best.transactions.total.amount ? current : best
                                    ).date,
                                    growth_rate: 0 // Placeholder
                                },
                                generated_at: new Date().toISOString()
                            }}
                        />
                    </div>
                ) : null}
            </div>
        </div>
    );
}

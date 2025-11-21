'use client';

import { useState, useEffect } from 'react';
import { apiClient, DailySummary } from '@/lib/api';
import { WeeklyHourlyHeatmap } from '@/components/charts/WeeklyHourlyHeatmap';
import SuccessRatePieChart from '@/components/charts/SuccessRatePieChart';
import GatewayPerformanceChart from '@/components/charts/GatewayPerformanceChart';
import { Loader2, AlertCircle, Calendar } from 'lucide-react';
import { getWeekRange } from '@/lib/utils';

export default function InsightsPage() {
    const [dateRange, setDateRange] = useState(() => getWeekRange());
    const [data, setData] = useState<DailySummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                setError(null);
                const result = await apiClient.getWeeklyStats(dateRange.start, dateRange.end);
                setData(result || []);
            } catch (err) {
                console.error('Failed to fetch weekly stats:', err);
                setError('Failed to load insights data. Please try again.');
                setData([]);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [dateRange]);

    // Helper to aggregate data for charts
    const getAggregatedStats = () => {
        if (!data || data.length === 0) return null;

        let totalSuccess = 0;
        let totalFailed = 0;
        let totalPending = 0;
        let totalCount = 0;

        data.forEach(day => {
            totalSuccess += day.transactions.success.count + day.withdrawals.success.count;
            totalFailed += day.transactions.failed.count + day.withdrawals.failed.count;
            totalPending += day.transactions.pending.count + day.withdrawals.pending.count;
            totalCount += day.transactions.total.count + day.withdrawals.total.count;
        });

        // Construct SuccessRateData
        const successRateData = {
            summary: {
                total_transactions: data.reduce((sum, d) => sum + d.transactions.total.count, 0),
                total_withdrawals: data.reduce((sum, d) => sum + d.withdrawals.total.count, 0),
                overall_success_rate: totalCount > 0 ? (totalSuccess / totalCount) * 100 : 0
            },
            by_database: {
                'All': {
                    transactions: {
                        total_count: data.reduce((sum, d) => sum + d.transactions.total.count, 0),
                        success_count: data.reduce((sum, d) => sum + d.transactions.success.count, 0),
                        failed_count: data.reduce((sum, d) => sum + d.transactions.failed.count, 0)
                    },
                    withdrawals: {
                        total_count: data.reduce((sum, d) => sum + d.withdrawals.total.count, 0),
                        success_count: data.reduce((sum, d) => sum + d.withdrawals.success.count, 0),
                        failed_count: data.reduce((sum, d) => sum + d.withdrawals.failed.count, 0)
                    }
                }
            }
        };

        return { successRateData };
    };

    const stats = getAggregatedStats();

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto px-4 py-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Insights & Trends</h1>
                        <p className="text-gray-500 dark:text-gray-400">Weekly performance analytics</p>
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
                ) : data && data.length > 0 && stats ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Heatmap - Temporarily disabled as API doesn't return hourly data in weekly stats yet */}
                        {/* 
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Activity Heatmap</h2>
              <WeeklyHourlyHeatmap weekData={data} />
            </div>
            */}

                        {/* Success Rate */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Transaction Status</h2>
                            <SuccessRatePieChart
                                data={stats.successRateData}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center">
                        <p className="text-gray-500 dark:text-gray-400">No data available for the selected period.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

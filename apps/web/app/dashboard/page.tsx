'use client';

import { useState, useEffect } from 'react';
import { apiClient, DailySummary } from '@/lib/api';
import DateSelector from '@/components/dashboard/DateSelector';
import StatsCards from '@/components/dashboard/StatsCards';
import { ProviderDistributionChart } from '@/components/charts/ProviderDistributionChart';
import { Loader2, AlertCircle, LayoutGrid, BarChart2 } from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import SuccessRatePieChart from '@/components/charts/SuccessRatePieChart';

export default function DashboardPage() {
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [mounted, setMounted] = useState(false);
    const [data, setData] = useState<DailySummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showPercentage, setShowPercentage] = useState(false);

    // Set default date only on client side to avoid hydration mismatch
    useEffect(() => {
        setSelectedDate(new Date().toISOString().split('T')[0] ?? '');
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!selectedDate) return; // Don't fetch until date is set

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

    // Transform DailySummary to SuccessRateData
    const getSuccessRateData = (summary: DailySummary) => {
        return {
            summary: {
                total_transactions: summary.transactions.total.count,
                total_withdrawals: summary.withdrawals.total.count,
                overall_success_rate: 0
            },
            by_database: {
                'All': {
                    transactions: {
                        total_count: summary.transactions.total.count,
                        success_count: summary.transactions.success.count,
                        failed_count: summary.transactions.failed.count
                    },
                    withdrawals: {
                        total_count: summary.withdrawals.total.count,
                        success_count: summary.withdrawals.success.count,
                        failed_count: summary.withdrawals.failed.count
                    }
                }
            }
        };
    };

    if (!mounted) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

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

                        {/* Success Rate Charts */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <SuccessRatePieChart
                                data={getSuccessRateData(data)}
                                type="transactions"
                                isLoading={loading}
                            />
                            <SuccessRatePieChart
                                data={getSuccessRateData(data)}
                                type="withdrawals"
                                isLoading={loading}
                            />
                        </div>

                        {/* Provider Distribution Chart */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <ProviderDistributionChart data={data.providers} />
                        </div>
                    </div>
                ) : null}

                {data && (
                    <div className="space-y-8 mt-8">
                        {/* Global Provider Distribution Heatmap */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                            <h3 className="text-lg font-semibold mb-4 flex items-center">
                                <LayoutGrid className="w-5 h-5 mr-2 text-purple-500" />
                                Provider Distribution (Provider vs Amount Range)
                            </h3>
                            <div className="h-80 w-full min-h-[320px] overflow-x-auto">
                                {(() => {
                                    const providers = Object.keys(data.providers || {});
                                    const ranges = ['>50000', '10001-50000', '5001-10000', '1001-5000', '501-1000', '101-500', '0-100'];

                                    // Calculate max count for intensity
                                    const maxCount = Math.max(1, ...Object.values(data.amountDistribution || {})
                                        .flatMap((dist: any) => Object.values(dist.providers || {}).map((p: any) => p.count || 0)));

                                    return (
                                        <div className="min-w-[600px] h-full">
                                            <div className="grid grid-cols-[auto_1fr] gap-4 h-full">
                                                {/* Y-Axis Labels (Ranges) */}
                                                <div className="flex flex-col justify-between py-6 text-xs text-gray-500 font-medium">
                                                    {ranges.map(range => (
                                                        <div key={range} className="h-12 flex items-center justify-end pr-2">{range}</div>
                                                    ))}
                                                </div>

                                                {/* Heatmap Grid */}
                                                <div className="flex flex-col h-full">
                                                    <div className={`flex-1 grid gap-1`} style={{ gridTemplateColumns: `repeat(${providers.length}, 1fr)` }}>
                                                        {providers.map(provider => (
                                                            <div key={provider} className="flex flex-col justify-between h-full gap-1">
                                                                {ranges.map(range => {
                                                                    const count = data.amountDistribution?.[range]?.providers?.[provider]?.count || 0;
                                                                    const intensity = count / maxCount;

                                                                    return (
                                                                        <div
                                                                            key={`${provider}-${range}`}
                                                                            className="h-12 rounded-sm transition-all hover:ring-2 ring-purple-500 relative group flex items-center justify-center"
                                                                            style={{
                                                                                backgroundColor: count > 0 ? `rgba(168, 85, 247, ${Math.max(0.1, intensity)})` : '#f3f4f6'
                                                                            }}
                                                                        >
                                                                            <span className={`text-xs font-medium ${count > 0 ? 'text-purple-900' : 'text-gray-300'}`}>
                                                                                {count > 0 ? count : '-'}
                                                                            </span>
                                                                            {/* Tooltip */}
                                                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 min-w-[140px]">
                                                                                <div className="bg-gray-900 text-white text-xs rounded py-2 px-3 shadow-xl">
                                                                                    <div className="font-bold mb-1 capitalize">{provider}</div>
                                                                                    <div className="text-gray-400 text-[10px] mb-1">{range}</div>
                                                                                    <div className="flex justify-between">
                                                                                        <span>Count:</span>
                                                                                        <span className="font-bold">{count}</span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {/* X-Axis Labels (Providers) */}
                                                    <div className={`grid gap-1 mt-2`} style={{ gridTemplateColumns: `repeat(${providers.length}, 1fr)` }}>
                                                        {providers.map(provider => (
                                                            <div key={provider} className="text-[10px] text-gray-400 text-center capitalize truncate">
                                                                {provider}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* Global Amount Distribution Chart */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                            <h3 className="text-lg font-semibold mb-4 flex items-center">
                                <BarChart2 className="w-5 h-5 mr-2 text-indigo-500" />
                                Amount Distribution
                            </h3>
                            <div className="h-80 w-full min-h-[320px] overflow-x-auto">
                                {Object.keys(data.amountDistribution || {}).length > 0 ? (
                                    (() => {
                                        const chartData = Object.values(data.amountDistribution || {})
                                            .sort((a, b) => {
                                                const getMin = (r: string) => {
                                                    if (!r) return 0;
                                                    return parseInt(r.split('-')[0].replace('>', ''));
                                                };
                                                return getMin(a.range) - getMin(b.range);
                                            });
                                        const uniqueProviders = Array.from(new Set(chartData.flatMap(d => Object.keys(d.providers || {}))));
                                        const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

                                        return (
                                            <ResponsiveContainer width="100%" height="100%" debounce={200}>
                                                <BarChart
                                                    data={chartData.map(d => ({
                                                        ...d,
                                                        ...Object.entries(d.providers || {}).reduce((acc, [p, v]) => ({ ...acc, [p]: v.count }), {})
                                                    }))}
                                                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                                    layout="horizontal"
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                    <XAxis dataKey="range" fontSize={12} />
                                                    <YAxis fontSize={12} />
                                                    <Tooltip
                                                        cursor={{ fill: 'transparent' }}
                                                        content={({ active, payload, label }) => {
                                                            if (active && payload && payload.length) {
                                                                return (
                                                                    <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                                                                        <p className="font-medium text-gray-900 dark:text-white mb-2">{label}</p>
                                                                        {payload.map((entry: any, index: number) => (
                                                                            <div key={index} className="flex items-center justify-between gap-4 text-sm">
                                                                                <span className="flex items-center gap-2">
                                                                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                                                                    <span className="text-gray-600 dark:text-gray-300 capitalize">{entry.name}</span>
                                                                                </span>
                                                                                <span className="font-medium text-gray-900 dark:text-white">{entry.value}</span>
                                                                            </div>
                                                                        ))}
                                                                        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between gap-4 text-sm font-bold">
                                                                            <span className="text-gray-900 dark:text-white">Total</span>
                                                                            <span className="text-gray-900 dark:text-white">
                                                                                {payload.reduce((sum: number, entry: any) => sum + (entry.value as number), 0)}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }
                                                            return null;
                                                        }}
                                                    />
                                                    <Legend />
                                                    {uniqueProviders.map((provider, index) => (
                                                        <Bar
                                                            key={provider}
                                                            dataKey={provider}
                                                            stackId="a"
                                                            fill={COLORS[index % COLORS.length]}
                                                            radius={[0, 0, 0, 0]}
                                                            barSize={30}
                                                        />
                                                    ))}
                                                </BarChart>
                                            </ResponsiveContainer>
                                        );
                                    })()
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-500">
                                        No amount distribution data available
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Global Hourly Distribution (Table) */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold flex items-center">
                                    <LayoutGrid className="w-5 h-5 mr-2 text-orange-500" />
                                    Hourly Distribution (Table)
                                </h3>
                                <div className="flex items-center space-x-2">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">Show %</span>
                                    <button
                                        onClick={() => setShowPercentage(!showPercentage)}
                                        className={`
                                            relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2
                                            ${showPercentage ? 'bg-orange-500' : 'bg-gray-200 dark:bg-gray-700'}
                                        `}
                                    >
                                        <span
                                            className={`
                                                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                                                ${showPercentage ? 'translate-x-6' : 'translate-x-1'}
                                            `}
                                        />
                                    </button>
                                </div>
                            </div>
                            <div className="h-[600px] w-full flex flex-col">
                                {(() => {
                                    // Extract and sort ranges
                                    const allRanges = new Set<string>();
                                    const hourlyDist = data.hourlyDistribution || {};
                                    Object.values(hourlyDist).forEach((hourData: any) => {
                                        Object.keys(hourData).forEach(r => allRanges.add(r));
                                    });

                                    // Sort ranges numerically ascending (0-50, 50-100, ...)
                                    const sortedRanges = Array.from(allRanges).sort((a, b) => {
                                        const lowerA = parseInt(a.split('-')[0] || '0');
                                        const lowerB = parseInt(b.split('-')[0] || '0');
                                        return lowerA - lowerB;
                                    });

                                    const maxCount = Math.max(1, ...Object.values(hourlyDist)
                                        .flatMap((h: any) => Object.values(h).map((r: any) => r.count || 0)));

                                    if (sortedRanges.length === 0) {
                                        return (
                                            <div className="flex items-center justify-center h-full text-gray-500">
                                                No hourly distribution data available
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="flex-1 overflow-auto custom-scrollbar relative border border-gray-200 dark:border-gray-700 rounded-lg">
                                            <table className="min-w-full text-xs text-left border-collapse">
                                                <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-20">
                                                    <tr>
                                                        <th className="p-2 border-b border-r border-gray-200 dark:border-gray-700 font-medium text-gray-500 sticky left-0 bg-gray-50 dark:bg-gray-900 z-30 w-16 text-center">
                                                            Hour
                                                        </th>
                                                        {sortedRanges.map(range => (
                                                            <th key={range} className="p-2 border-b border-gray-200 dark:border-gray-700 font-medium text-gray-500 min-w-[80px] text-center whitespace-nowrap">
                                                                {range}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                                    {Array.from({ length: 24 }).map((_, hourIndex) => {
                                                        const hour = String(hourIndex).padStart(2, '0');

                                                        // Calculate row total for percentage
                                                        const rowTotal = sortedRanges.reduce((sum, range) => {
                                                            return sum + (hourlyDist[hour]?.[range]?.count || 0);
                                                        }, 0);

                                                        return (
                                                            <tr key={hour} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                                <td className="p-2 border-r border-gray-200 dark:border-gray-700 font-medium text-gray-900 dark:text-gray-300 sticky left-0 bg-white dark:bg-gray-800 z-10 text-center">
                                                                    {hour}:00
                                                                </td>
                                                                {sortedRanges.map(range => {
                                                                    const count = hourlyDist[hour]?.[range]?.count || 0;
                                                                    const intensity = count / maxCount;
                                                                    const percentage = rowTotal > 0 ? (count / rowTotal) * 100 : 0;

                                                                    return (
                                                                        <td key={`${hour}-${range}`} className="p-1 text-center border-r border-gray-100 dark:border-gray-800 last:border-r-0">
                                                                            <div
                                                                                className={`
                                                                                    w-full h-8 flex items-center justify-center rounded text-[10px]
                                                                                    ${count > 0 ? 'text-orange-900 font-semibold' : 'text-gray-300'}
                                                                                `}
                                                                                style={{
                                                                                    backgroundColor: count > 0 ? `rgba(249, 115, 22, ${Math.max(0.1, intensity)})` : 'transparent'
                                                                                }}
                                                                                title={`Count: ${count}\nPercentage: ${percentage.toFixed(1)}%`}
                                                                            >
                                                                                {count > 0
                                                                                    ? (showPercentage ? `${percentage.toFixed(0)}%` : count)
                                                                                    : '-'}
                                                                            </div>
                                                                        </td>
                                                                    );
                                                                })}
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

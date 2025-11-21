'use client';

import { useState, useEffect } from 'react';
import { apiClient, DailyStats } from '@/lib/api';
import DateSelector from '@/components/dashboard/DateSelector';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function DetailsPage() {
    const [selectedDate, setSelectedDate] = useState<string>(() => {
        return new Date().toISOString().split('T')[0] || '';
    });

    const [data, setData] = useState<DailyStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                setError(null);
                const result = await apiClient.getHourlyStats(selectedDate);
                setData(result);
            } catch (err) {
                console.error('Failed to fetch hourly stats:', err);
                setError('Failed to load details data. Please try again.');
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [selectedDate]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('th-TH', {
            style: 'currency',
            currency: 'THB',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('en-US').format(num);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto px-4 py-8">
                <div className="mb-6">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Back to Dashboard
                    </Link>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Hourly Details</h1>
                        <p className="text-gray-500 dark:text-gray-400">Detailed breakdown by hour</p>
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
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                    <tr>
                                        <th className="px-6 py-3">Hour</th>
                                        <th className="px-6 py-3 text-center" colSpan={3}>Transactions</th>
                                        <th className="px-6 py-3 text-center" colSpan={3}>Withdrawals</th>
                                        <th className="px-6 py-3 text-right">Success Rate</th>
                                    </tr>
                                    <tr>
                                        <th className="px-6 py-3"></th>
                                        <th className="px-4 py-2 text-right">Count</th>
                                        <th className="px-4 py-2 text-right">Amount</th>
                                        <th className="px-4 py-2 text-right">Success</th>
                                        <th className="px-4 py-2 text-right">Count</th>
                                        <th className="px-4 py-2 text-right">Amount</th>
                                        <th className="px-4 py-2 text-right">Success</th>
                                        <th className="px-6 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {data.hourly.map((hourData) => {
                                        const txTotal = hourData.transactions.total.count;
                                        const txSuccess = hourData.transactions.success.count;
                                        const wdTotal = hourData.withdrawals.total.count;
                                        const wdSuccess = hourData.withdrawals.success.count;

                                        const totalOps = txTotal + wdTotal;
                                        const totalSuccess = txSuccess + wdSuccess;
                                        const successRate = totalOps > 0 ? (totalSuccess / totalOps) * 100 : 0;

                                        return (
                                            <tr key={hourData.hour} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                                    {hourData.hour.toString().padStart(2, '0')}:00
                                                </td>

                                                {/* Transactions */}
                                                <td className="px-4 py-4 text-right text-gray-600 dark:text-gray-300">
                                                    {formatNumber(txTotal)}
                                                </td>
                                                <td className="px-4 py-4 text-right text-gray-600 dark:text-gray-300">
                                                    {formatCurrency(hourData.transactions.total.amount)}
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${txTotal > 0 && (txSuccess / txTotal) >= 0.9 ? 'bg-green-100 text-green-800' :
                                                            txTotal > 0 && (txSuccess / txTotal) >= 0.5 ? 'bg-yellow-100 text-yellow-800' :
                                                                txTotal === 0 ? 'bg-gray-100 text-gray-800' : 'bg-red-100 text-red-800'
                                                        }`}>
                                                        {txTotal > 0 ? formatNumber(txSuccess) : '-'}
                                                    </span>
                                                </td>

                                                {/* Withdrawals */}
                                                <td className="px-4 py-4 text-right text-gray-600 dark:text-gray-300">
                                                    {formatNumber(wdTotal)}
                                                </td>
                                                <td className="px-4 py-4 text-right text-gray-600 dark:text-gray-300">
                                                    {formatCurrency(hourData.withdrawals.total.amount)}
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${wdTotal > 0 && (wdSuccess / wdTotal) >= 0.9 ? 'bg-green-100 text-green-800' :
                                                            wdTotal > 0 && (wdSuccess / wdTotal) >= 0.5 ? 'bg-yellow-100 text-yellow-800' :
                                                                wdTotal === 0 ? 'bg-gray-100 text-gray-800' : 'bg-red-100 text-red-800'
                                                        }`}>
                                                        {wdTotal > 0 ? formatNumber(wdSuccess) : '-'}
                                                    </span>
                                                </td>

                                                {/* Overall Rate */}
                                                <td className="px-6 py-4 text-right">
                                                    <span className={`font-medium ${successRate >= 95 ? 'text-green-600' :
                                                            successRate >= 90 ? 'text-yellow-600' :
                                                                totalOps === 0 ? 'text-gray-400' : 'text-red-600'
                                                        }`}>
                                                        {totalOps > 0 ? `${successRate.toFixed(1)}%` : '-'}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {/* Summary Row */}
                                    <tr className="bg-gray-50 dark:bg-gray-700 font-semibold">
                                        <td className="px-6 py-4 text-gray-900 dark:text-white">Total</td>
                                        <td className="px-4 py-4 text-right">
                                            {formatNumber(data.hourly.reduce((sum, h) => sum + h.transactions.total.count, 0))}
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            {formatCurrency(data.hourly.reduce((sum, h) => sum + h.transactions.total.amount, 0))}
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            {formatNumber(data.hourly.reduce((sum, h) => sum + h.transactions.success.count, 0))}
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            {formatNumber(data.hourly.reduce((sum, h) => sum + h.withdrawals.total.count, 0))}
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            {formatCurrency(data.hourly.reduce((sum, h) => sum + h.withdrawals.total.amount, 0))}
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            {formatNumber(data.hourly.reduce((sum, h) => sum + h.withdrawals.success.count, 0))}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {/* Overall Average */}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}

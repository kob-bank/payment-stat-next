'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { HourlyStatsChart } from '@/components/charts/HourlyStatsChart';

export default function HourlyStatsPage() {
  const [selectedDate, setSelectedDate] = useState(() => {
    // Default to yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  });

  const [hourlyData, setHourlyData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metric, setMetric] = useState<'count' | 'amount'>('count');

  useEffect(() => {
    const fetchHourlyStats = async () => {
      if (!selectedDate) return;

      setLoading(true);
      setError(null);

      try {
        const data = await apiClient.getHourlyStats(selectedDate);
        setHourlyData(data);
      } catch (err) {
        console.error('Failed to fetch hourly stats:', err);
        setError(err instanceof Error ? err.message : 'Failed to load hourly stats');
      } finally {
        setLoading(false);
      }
    };

    fetchHourlyStats();
  }, [selectedDate]);

  const peakHour = hourlyData?.summary?.peak_hour;

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Hourly Statistics</h1>
        <p className="text-gray-600 dark:text-gray-400">
          24-hour breakdown of transactions and withdrawals
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Date Picker */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-2">
              Select Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date(Date.now() - 86400000).toISOString().split('T')[0]} // Yesterday
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          {/* Metric Selector */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-2">
              Metric
            </label>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as 'count' | 'amount')}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="count">Transaction Count</option>
              <option value="amount">Amount (THB)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Summary Cards */}
      {hourlyData && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow p-6">
            <div className="text-sm opacity-90 mb-1">Total Transactions</div>
            <div className="text-3xl font-bold">
              {hourlyData.summary.total_transactions.toLocaleString()}
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg shadow p-6">
            <div className="text-sm opacity-90 mb-1">Total Withdrawals</div>
            <div className="text-3xl font-bold">
              {hourlyData.summary.total_withdrawals.toLocaleString()}
            </div>
          </div>

          {peakHour && (
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg shadow p-6">
              <div className="text-sm opacity-90 mb-1">Peak Hour</div>
              <div className="text-3xl font-bold">
                {peakHour.hour.toString().padStart(2, '0')}:00
              </div>
              <div className="text-sm opacity-75 mt-1">
                {(peakHour.transactions + peakHour.withdrawals).toLocaleString()} operations
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        {loading && (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Loading hourly stats...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-96">
            <div className="text-center text-red-600">
              <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="font-medium">Error loading data</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && hourlyData && (
          <div>
            <div className="mb-4">
              <h2 className="text-xl font-semibold">
                Hourly Breakdown - {selectedDate}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {hourlyData.cached ? (
                  <span className="text-green-600 dark:text-green-400">
                    ✓ Cached data (fast)
                  </span>
                ) : (
                  <span className="text-orange-600 dark:text-orange-400">
                    ⚠ Live data (slower)
                  </span>
                )}
              </p>
            </div>

            <HourlyStatsChart
              data={hourlyData.hourly}
              metric={metric}
              showTransactions={true}
              showWithdrawals={true}
              height={500}
            />
          </div>
        )}

        {!loading && !error && !hourlyData && (
          <div className="flex items-center justify-center h-96 text-gray-500">
            Select a date to view hourly statistics
          </div>
        )}
      </div>

      {/* Data Table */}
      {hourlyData && !loading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mt-6 overflow-x-auto">
          <h3 className="text-lg font-semibold mb-4">Detailed Hourly Data</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="text-left p-2">Hour</th>
                <th className="text-right p-2">TX Count</th>
                <th className="text-right p-2">TX Amount</th>
                <th className="text-right p-2">TX Success</th>
                <th className="text-right p-2">WD Count</th>
                <th className="text-right p-2">WD Amount</th>
                <th className="text-right p-2">WD Success</th>
              </tr>
            </thead>
            <tbody>
              {hourlyData.hourly.map((hour: any) => (
                <tr key={hour.hour} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="p-2 font-medium">{hour.hour_label}</td>
                  <td className="text-right p-2">{hour.transactions.count.toLocaleString()}</td>
                  <td className="text-right p-2">{hour.transactions.amount.toLocaleString()} THB</td>
                  <td className="text-right p-2 text-green-600">
                    {hour.transactions.count > 0
                      ? `${((hour.transactions.success / hour.transactions.count) * 100).toFixed(1)}%`
                      : 'N/A'}
                  </td>
                  <td className="text-right p-2">{hour.withdrawals.count.toLocaleString()}</td>
                  <td className="text-right p-2">{hour.withdrawals.amount.toLocaleString()} THB</td>
                  <td className="text-right p-2 text-green-600">
                    {hour.withdrawals.count > 0
                      ? `${((hour.withdrawals.success / hour.withdrawals.count) * 100).toFixed(1)}%`
                      : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

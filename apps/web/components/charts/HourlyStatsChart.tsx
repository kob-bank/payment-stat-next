'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';

interface HourlyData {
  hour: number;
  hour_label: string;
  transactions: {
    count: number;
    amount: number;
    success: number;
    failed: number;
  };
  withdrawals: {
    count: number;
    amount: number;
    success: number;
    failed: number;
  };
}

interface HourlyStatsChartProps {
  data: HourlyData[];
  metric?: 'count' | 'amount';
  showTransactions?: boolean;
  showWithdrawals?: boolean;
  height?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <p className="font-semibold mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600 dark:text-gray-400">
              {entry.name}:
            </span>
            <span className="font-medium">
              {entry.value?.toLocaleString()}
              {entry.dataKey?.includes('amount') ? ' THB' : ''}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function HourlyStatsChart({
  data,
  metric = 'count',
  showTransactions = true,
  showWithdrawals = true,
  height = 400,
}: HourlyStatsChartProps) {
  const chartData = useMemo(() => {
    return data.map((item) => ({
      hour: item.hour_label,
      transactions: metric === 'count' ? item.transactions.count : item.transactions.amount,
      withdrawals: metric === 'count' ? item.withdrawals.count : item.withdrawals.amount,
      tx_success: metric === 'count' ? item.transactions.success : 0,
      tx_failed: metric === 'count' ? item.transactions.failed : 0,
      wd_success: metric === 'count' ? item.withdrawals.success : 0,
      wd_failed: metric === 'count' ? item.withdrawals.failed : 0,
    }));
  }, [data, metric]);

  const maxValue = useMemo(() => {
    return Math.max(
      ...chartData.map((d) => {
        const values: number[] = [];
        if (showTransactions) values.push(d.transactions || 0);
        if (showWithdrawals) values.push(d.withdrawals || 0);
        return Math.max(...values);
      })
    );
  }, [chartData, showTransactions, showWithdrawals]);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No hourly data available
      </div>
    );
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis
            dataKey="hour"
            tick={{ fontSize: 12 }}
            interval={1}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            domain={[0, maxValue * 1.1]}
            tickFormatter={(value) =>
              metric === 'amount'
                ? `${(value / 1000).toFixed(0)}k`
                : value.toLocaleString()
            }
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {showTransactions && (
            <Bar
              dataKey="transactions"
              name="Transactions"
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
            />
          )}
          {showWithdrawals && (
            <Bar
              dataKey="withdrawals"
              name="Withdrawals"
              fill="#10b981"
              radius={[4, 4, 0, 0]}
            />
          )}
        </BarChart>
      </ResponsiveContainer>

      {/* Summary Stats */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        {showTransactions && (
          <>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <div className="text-blue-600 dark:text-blue-400 font-medium">
                Total Transactions
              </div>
              <div className="text-lg font-bold mt-1">
                {chartData.reduce((sum, d) => sum + (d.transactions || 0), 0).toLocaleString()}
                {metric === 'amount' && <span className="text-sm ml-1">THB</span>}
              </div>
            </div>
            {metric === 'count' && (
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                <div className="text-green-600 dark:text-green-400 font-medium">
                  Success Rate (TX)
                </div>
                <div className="text-lg font-bold mt-1">
                  {(() => {
                    const total = chartData.reduce((sum, d) => sum + (d.tx_success || 0) + (d.tx_failed || 0), 0);
                    const success = chartData.reduce((sum, d) => sum + (d.tx_success || 0), 0);
                    return total > 0 ? `${((success / total) * 100).toFixed(1)}%` : 'N/A';
                  })()}
                </div>
              </div>
            )}
          </>
        )}
        {showWithdrawals && (
          <>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg">
              <div className="text-emerald-600 dark:text-emerald-400 font-medium">
                Total Withdrawals
              </div>
              <div className="text-lg font-bold mt-1">
                {chartData.reduce((sum, d) => sum + (d.withdrawals || 0), 0).toLocaleString()}
                {metric === 'amount' && <span className="text-sm ml-1">THB</span>}
              </div>
            </div>
            {metric === 'count' && (
              <div className="bg-teal-50 dark:bg-teal-900/20 p-3 rounded-lg">
                <div className="text-teal-600 dark:text-teal-400 font-medium">
                  Success Rate (WD)
                </div>
                <div className="text-lg font-bold mt-1">
                  {(() => {
                    const total = chartData.reduce((sum, d) => sum + (d.wd_success || 0) + (d.wd_failed || 0), 0);
                    const success = chartData.reduce((sum, d) => sum + (d.wd_success || 0), 0);
                    return total > 0 ? `${((success / total) * 100).toFixed(1)}%` : 'N/A';
                  })()}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

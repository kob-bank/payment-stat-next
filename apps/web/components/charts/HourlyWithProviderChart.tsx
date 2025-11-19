'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Clock, Activity } from 'lucide-react';

interface HourlyData {
  hour: number;
  hour_label: string;
  transactions: { count: number; amount: number; by_provider?: Record<string, number> };
  withdrawals: { count: number; amount: number; by_provider?: Record<string, number> };
  total_count: number;
  total_amount: number;
}

interface HourlyWithProviderChartProps {
  data: HourlyData[];
  title?: string;
  isLoading?: boolean;
}

// Predefined colors for providers
const PROVIDER_COLORS = [
  '#ef4444', // red
  '#10b981', // green  
  '#3b82f6', // blue
  '#f59e0b', // yellow
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#6366f1', // indigo
];

export default function HourlyWithProviderChart({ 
  data, 
  title = "สรุปรายชั่วโมง (แยกตาม Provider)", 
  isLoading = false 
}: HourlyWithProviderChartProps) {
  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center space-x-2 mb-4">
          <Clock className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center space-x-2 mb-4">
          <Clock className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="text-center py-8">
          <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">ไม่มีข้อมูลในช่วงเวลานี้</p>
        </div>
      </div>
    );
  }

  // Get all unique providers from the data
  const allProviders = new Set<string>();
  data.forEach(item => {
    if (item.transactions.by_provider) {
      Object.keys(item.transactions.by_provider).forEach(provider => allProviders.add(provider));
    }
    if (item.withdrawals.by_provider) {
      Object.keys(item.withdrawals.by_provider).forEach(provider => allProviders.add(provider));
    }
  });
  const providers = Array.from(allProviders).sort();

  // Transform data for stacked chart
  const chartData = data.map(item => {
    const chartItem: any = {
      hour_label: item.hour_label,
      hour: item.hour,
      total: item.total_count,
      total_amount: item.total_amount,
    };

    // Add provider-specific data
    providers.forEach(provider => {
      const txCount = item.transactions.by_provider?.[provider] || 0;
      const wdCount = item.withdrawals.by_provider?.[provider] || 0;
      chartItem[`${provider}_tx`] = txCount;
      chartItem[`${provider}_wd`] = wdCount;
      chartItem[`${provider}_total`] = txCount + wdCount;
    });

    return chartItem;
  });

  // Find peak hour
  const peakHour = data.reduce((max, current) => 
    current.total_count > max.total_count ? current : max
  );

  // Calculate total stats
  const totalTransactions = data.reduce((sum, item) => sum + item.transactions.count, 0);
  const totalWithdrawals = data.reduce((sum, item) => sum + item.withdrawals.count, 0);
  const totalAmount = data.reduce((sum, item) => sum + item.total_amount, 0);

  // Calculate provider distribution
  const providerStats = providers.map((provider, index) => {
    const totalTx = data.reduce((sum, item) => sum + (item.transactions.by_provider?.[provider] || 0), 0);
    const totalWd = data.reduce((sum, item) => sum + (item.withdrawals.by_provider?.[provider] || 0), 0);
    const totalOps = totalTx + totalWd;
    return {
      name: provider,
      transactions: totalTx,
      withdrawals: totalWd,
      total: totalOps,
      color: PROVIDER_COLORS[index % PROVIDER_COLORS.length],
      percentage: (totalTransactions + totalWithdrawals) > 0 ? (totalOps / (totalTransactions + totalWithdrawals) * 100) : 0
    };
  }).sort((a, b) => b.total - a.total);

  const formatTooltipValue = (value: number, name: string) => {
    if (name.includes('amount')) {
      return new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    }
    return value.toLocaleString();
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-600">Peak Hour</div>
          <div className="text-lg font-semibold text-blue-600">{peakHour.hour_label}</div>
          <div className="text-xs text-gray-500">{peakHour.total_count.toLocaleString()} operations</div>
        </div>
      </div>

      {/* Provider Legend */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Provider Distribution:</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {providerStats.map((provider) => (
            <div key={provider.name} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: provider.color }}
              ></div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{provider.name}</div>
                <div className="text-xs text-gray-500">
                  {provider.total.toLocaleString()} ({provider.percentage.toFixed(1)}%)
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-sm text-blue-600 font-medium">Total Transactions</div>
          <div className="text-xl font-bold text-blue-900">{totalTransactions.toLocaleString()}</div>
        </div>
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <div className="text-sm text-purple-600 font-medium">Total Withdrawals</div>
          <div className="text-xl font-bold text-purple-900">{totalWithdrawals.toLocaleString()}</div>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-sm text-green-600 font-medium">Total Amount</div>
          <div className="text-lg font-bold text-green-900">
            {new Intl.NumberFormat('th-TH', {
              style: 'currency',
              currency: 'THB',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(totalAmount)}
          </div>
        </div>
      </div>

      {/* Stacked Chart */}
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="hour_label" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip 
              formatter={formatTooltipValue}
              labelFormatter={(label) => `เวลา: ${label}`}
              labelStyle={{ color: '#374151' }}
              contentStyle={{ 
                backgroundColor: '#f9fafb', 
                border: '1px solid #d1d5db',
                borderRadius: '6px'
              }}
            />
            <Legend />
            
            {/* Render stacked bars for each provider */}
            {providerStats.map((provider) => (
              <Bar 
                key={`${provider.name}_total`}
                dataKey={`${provider.name}_total`} 
                stackId="provider"
                fill={provider.color}
                name={provider.name}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Additional Info */}
      <div className="mt-4 text-xs text-gray-500 text-center">
        แสดงข้อมูลการทำงานแยกตามชั่วโมงและ Provider (เวลาไทย UTC+7) • Peak: {peakHour.hour_label}
      </div>
    </div>
  );
}

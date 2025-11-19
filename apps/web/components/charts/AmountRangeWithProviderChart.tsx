'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, BarChart3 } from 'lucide-react';

interface AmountRangeData {
  bucket_index: number;
  min_amount: number;
  max_amount: number;
  range_label: string;
  transactions: { count: number; by_provider?: Record<string, number> };
  withdrawals: { count: number; by_provider?: Record<string, number> };
  total_count: number;
}

interface AmountRangeWithProviderChartProps {
  data: AmountRangeData[];
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

export default function AmountRangeWithProviderChart({ 
  data, 
  title = "สรุปตามช่วงยอดเงิน (แยกตาม Provider)", 
  isLoading = false 
}: AmountRangeWithProviderChartProps) {
  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center space-x-2 mb-4">
          <DollarSign className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center space-x-2 mb-4">
          <DollarSign className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="text-center py-8">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
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

  // Transform data for stacked chart - limit to first 20 buckets for better visibility
  const chartData = data.slice(0, 20).map(item => {
    const chartItem: any = {
      range_label: item.range_label,
      range_short: `${item.min_amount}-${item.max_amount}`,
      total: item.total_count,
    };

    // Add provider-specific data for transactions
    providers.forEach(provider => {
      const txCount = item.transactions.by_provider?.[provider] || 0;
      const wdCount = item.withdrawals.by_provider?.[provider] || 0;
      chartItem[`${provider}_tx`] = txCount;
      chartItem[`${provider}_wd`] = wdCount;
      chartItem[`${provider}_total`] = txCount + wdCount;
    });

    return chartItem;
  });

  // Find most popular range
  const popularRange = data.reduce((max, current) => 
    current.total_count > max.total_count ? current : max
  );

  // Calculate total stats
  const totalOperations = data.reduce((sum, item) => sum + item.total_count, 0);
  const totalTransactions = data.reduce((sum, item) => sum + item.transactions.count, 0);
  const totalWithdrawals = data.reduce((sum, item) => sum + item.withdrawals.count, 0);

  // Calculate provider distribution
  const providerStats = providers.map((provider, index) => {
    const totalTx = data.reduce((sum, item) => sum + (item.transactions.by_provider?.[provider] || 0), 0);
    const totalWd = data.reduce((sum, item) => sum + (item.withdrawals.by_provider?.[provider] || 0), 0);
    return {
      name: provider,
      transactions: totalTx,
      withdrawals: totalWd,
      total: totalTx + totalWd,
      color: PROVIDER_COLORS[index % PROVIDER_COLORS.length],
      percentage: totalOperations > 0 ? ((totalTx + totalWd) / totalOperations * 100) : 0
    };
  }).sort((a, b) => b.total - a.total);

  const formatTooltipValue = (value: number) => {
    return value.toLocaleString();
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <DollarSign className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-600">Popular Range</div>
          <div className="text-lg font-semibold text-green-600">{popularRange.range_label}</div>
          <div className="text-xs text-gray-500">{popularRange.total_count.toLocaleString()} operations</div>
        </div>
      </div>

      {/* Provider Legend */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Provider Distribution:</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {providerStats.map((provider, index) => (
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
          <div className="text-sm text-blue-600 font-medium">Total Operations</div>
          <div className="text-xl font-bold text-blue-900">{totalOperations.toLocaleString()}</div>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-sm text-green-600 font-medium">Transactions</div>
          <div className="text-xl font-bold text-green-900">{totalTransactions.toLocaleString()}</div>
        </div>
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <div className="text-sm text-purple-600 font-medium">Withdrawals</div>
          <div className="text-xl font-bold text-purple-900">{totalWithdrawals.toLocaleString()}</div>
        </div>
      </div>

      {/* Stacked Chart */}
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="range_short" 
              tick={{ fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip 
              formatter={formatTooltipValue}
              labelFormatter={(label) => `ช่วงยอดเงิน: ${label} บาท`}
              labelStyle={{ color: '#374151' }}
              contentStyle={{ 
                backgroundColor: '#f9fafb', 
                border: '1px solid #d1d5db',
                borderRadius: '6px'
              }}
            />
            <Legend />
            
            {/* Render bars for each provider */}
            {providerStats.map((provider, index) => (
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

      {/* Range Distribution Info */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="text-sm">
          <div className="font-medium text-gray-700 mb-2">ช่วงยอดเงินที่พบ:</div>
          <div className="text-gray-600">
            {data.length > 20 ? (
              <>แสดง 20 ช่วงแรก จากทั้งหมด {data.length} ช่วง</>
            ) : (
              <>ทั้งหมด {data.length} ช่วงยอดเงิน</>
            )}
          </div>
        </div>
        <div className="text-sm">
          <div className="font-medium text-gray-700 mb-2">Provider หลัก:</div>
          <div className="text-gray-600">
            {providerStats[0]?.name} ({providerStats[0]?.percentage.toFixed(1)}%)
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="mt-4 text-xs text-gray-500 text-center">
        แสดงการกระจายตัวของยอดเงินแยกตาม Provider • Popular: {popularRange.range_label}
      </div>
    </div>
  );
}

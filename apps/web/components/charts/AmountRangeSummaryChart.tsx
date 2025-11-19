'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, BarChart3 } from 'lucide-react';

interface AmountRangeData {
  bucket_index: number;
  min_amount: number;
  max_amount: number;
  range_label: string;
  transactions: { count: number };
  withdrawals: { count: number };
  total_count: number;
}

interface AmountRangeSummaryChartProps {
  data: AmountRangeData[];
  title?: string;
  isLoading?: boolean;
}

export default function AmountRangeSummaryChart({ 
  data, 
  title = "สรุปตามช่วงยอดเงิน (ทีละ 20 บาท)", 
  isLoading = false 
}: AmountRangeSummaryChartProps) {
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

  // Transform data for chart - limit to first 20 buckets for better visibility
  const chartData = data.slice(0, 20).map(item => ({
    range_label: item.range_label,
    range_short: `${item.min_amount}-${item.max_amount}`,
    'Transactions': item.transactions.count,
    'Withdrawals': item.withdrawals.count,
    'Total': item.total_count,
  }));

  // Find most popular range
  const popularRange = data.reduce((max, current) => 
    current.total_count > max.total_count ? current : max
  );

  // Calculate distribution stats
  const totalOperations = data.reduce((sum, item) => sum + item.total_count, 0);
  const totalTransactions = data.reduce((sum, item) => sum + item.transactions.count, 0);
  const totalWithdrawals = data.reduce((sum, item) => sum + item.withdrawals.count, 0);

  // Calculate average amount (approximate from bucket data)
  const weightedSum = data.reduce((sum, item) => {
    const avgBucketAmount = (item.min_amount + item.max_amount) / 2;
    return sum + (avgBucketAmount * item.total_count);
  }, 0);
  const avgAmount = totalOperations > 0 ? weightedSum / totalOperations : 0;

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

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
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
        <div className="text-center p-3 bg-yellow-50 rounded-lg">
          <div className="text-sm text-yellow-600 font-medium">Avg Amount</div>
          <div className="text-lg font-bold text-yellow-900">
            {new Intl.NumberFormat('th-TH', {
              style: 'currency',
              currency: 'THB',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(avgAmount)}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80">
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
            <Bar dataKey="Transactions" fill="#10b981" name="Transactions" />
            <Bar dataKey="Withdrawals" fill="#8b5cf6" name="Withdrawals" />
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
          <div className="font-medium text-gray-700 mb-2">สถิติการกระจาย:</div>
          <div className="text-gray-600">
            Min: {data[0]?.range_label} • Max: {data[data.length - 1]?.range_label}
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="mt-4 text-xs text-gray-500 text-center">
        แสดงการกระจายตัวของยอดเงินในช่วง 20 บาท • Popular: {popularRange.range_label}
      </div>
    </div>
  );
}

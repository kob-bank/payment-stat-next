'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Clock, Activity } from 'lucide-react';

interface HourlyData {
  hour: number;
  hour_label: string;
  transactions: { count: number; amount: number };
  withdrawals: { count: number; amount: number };
  total_count: number;
  total_amount: number;
}

interface HourlySummaryChartProps {
  data: HourlyData[];
  title?: string;
  isLoading?: boolean;
}

export default function HourlySummaryChart({ data, title = "สรุปรายชั่วโมง", isLoading = false }: HourlySummaryChartProps) {
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

  // Transform data for chart
  const chartData = data.map(item => ({
    hour_label: item.hour_label,
    'Transactions': item.transactions.count,
    'Withdrawals': item.withdrawals.count,
    'Total Amount': item.total_amount,
    'TX Amount': item.transactions.amount,
    'WD Amount': item.withdrawals.amount,
  }));

  // Find peak hour
  const peakHour = data.reduce((max, current) => 
    current.total_count > max.total_count ? current : max
  );

  // Calculate total stats
  const totalTransactions = data.reduce((sum, item) => sum + item.transactions.count, 0);
  const totalWithdrawals = data.reduce((sum, item) => sum + item.withdrawals.count, 0);
  const totalAmount = data.reduce((sum, item) => sum + item.total_amount, 0);

  const formatTooltipValue = (value: number, name: string) => {
    if (name.includes('Amount')) {
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

      {/* Chart */}
      <div className="h-80">
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
              labelStyle={{ color: '#374151' }}
              contentStyle={{ 
                backgroundColor: '#f9fafb', 
                border: '1px solid #d1d5db',
                borderRadius: '6px'
              }}
              />
              <Legend />
            <Bar dataKey="Transactions" fill="#3b82f6" name="Transactions" />
            <Bar dataKey="Withdrawals" fill="#8b5cf6" name="Withdrawals" />
            </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Additional Info */}
      <div className="mt-4 text-xs text-gray-500 text-center">
        แสดงข้อมูลการทำงานแยกตามชั่วโมง (เวลาไทย UTC+7) • Peak: {peakHour.hour_label}
      </div>
    </div>
  );
}

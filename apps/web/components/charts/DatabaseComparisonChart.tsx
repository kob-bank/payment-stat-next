'use client';

import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Database, TrendingUp, TrendingDown } from 'lucide-react';

interface DatabaseStats {
  database: string;
  transactions?: {
    total_count: number;
    total_amount: number;
    success_count: number;
    failed_count: number;
    by_gateway: Record<string, { count: number; amount: number }>;
    by_site: Record<string, { count: number; amount: number }>;
  };
  withdrawals?: {
    total_count: number;
    total_amount: number;
    success_count: number;
    failed_count: number;
    by_gateway: Record<string, { count: number; amount: number }>;
    by_site: Record<string, { count: number; amount: number }>;
  };
}

interface DatabaseComparisonChartProps {
  data: Record<string, DatabaseStats>;
  selectedDatabases: string[];
  isLoading?: boolean;
}

export default function DatabaseComparisonChart({ 
  data, 
  selectedDatabases, 
  isLoading = false 
}: DatabaseComparisonChartProps) {
  const [metric, setMetric] = useState<'count' | 'amount'>('count');
  const [dataType, setDataType] = useState<'transactions' | 'withdrawals' | 'both'>('both');

  // Transform data for bar chart
  const chartData = selectedDatabases.map(dbName => {
    const dbStats = data[dbName];
    
    if (!dbStats) {
      return {
        database: dbName,
        transactions: 0,
        withdrawals: 0,
        total: 0,
      };
    }

    const transactionValue = metric === 'count' 
      ? (dbStats.transactions?.total_count || 0)
      : (dbStats.transactions?.total_amount || 0);
    
    const withdrawalValue = metric === 'count'
      ? (dbStats.withdrawals?.total_count || 0) 
      : (dbStats.withdrawals?.total_amount || 0);

    return {
      database: dbName,
      transactions: transactionValue,
      withdrawals: withdrawalValue,
      total: transactionValue + withdrawalValue,
    };
  });

  const formatValue = (value: number) => {
    if (metric === 'amount') {
      return new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    }
    return new Intl.NumberFormat('en-US').format(value);
  };

  const getMetricLabel = () => {
    switch (metric) {
      case 'count': return 'Transaction Count';
      case 'amount': return 'Transaction Amount';
      default: return 'Transactions';
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatValue(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (selectedDatabases.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="text-center py-12">
          <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Databases Selected</h3>
          <p className="text-gray-500">Please select databases to view comparison data</p>
        </div>
      </div>
    );
  }

  // Check if all data is zero
  const hasData = chartData.some(item => item.total > 0);
  if (!hasData) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="text-center py-12">
          <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
          <p className="text-gray-500">
            No {metric === 'count' ? 'transactions' : 'transaction amounts'} found for the selected databases and time range.
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Try adjusting your date range or check if the databases contain data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Database Comparison - {getMetricLabel()}
          </h3>
          <p className="text-sm text-gray-500">
            Comparing {selectedDatabases.length} selected database{selectedDatabases.length > 1 ? 's' : ''}
          </p>
        </div>
        
        <div className="flex space-x-2">
          {/* Metric Selector */}
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as any)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="count">Count</option>
            <option value="amount">Amount</option>
          </select>
          
          {/* Data Type Selector */}
          <select
            value={dataType}
            onChange={(e) => setDataType(e.target.value as any)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="both">Both</option>
            <option value="transactions">Transactions Only</option>
            <option value="withdrawals">Withdrawals Only</option>
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">
            {formatValue(chartData.reduce((sum, item) => sum + item.transactions, 0))}
          </p>
          <p className="text-sm text-gray-500">Total Transactions</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-red-600">
            {formatValue(chartData.reduce((sum, item) => sum + item.withdrawals, 0))}
          </p>
          <p className="text-sm text-gray-500">Total Withdrawals</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">
            {formatValue(chartData.reduce((sum, item) => sum + item.total, 0))}
          </p>
          <p className="text-sm text-gray-500">Grand Total</p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="database" 
              stroke="#6b7280"
              fontSize={12}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
              tickFormatter={formatValue}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {(dataType === 'transactions' || dataType === 'both') && (
              <Bar
                dataKey="transactions"
                fill="#3b82f6"
                name="Transactions"
                radius={[2, 2, 0, 0]}
              />
            )}
            
            {(dataType === 'withdrawals' || dataType === 'both') && (
              <Bar
                dataKey="withdrawals"
                fill="#ef4444"
                name="Withdrawals"
                radius={[2, 2, 0, 0]}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Database Details */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {chartData.map((item, index) => {
          const dbStats = data[item.database];
          if (!dbStats) return null;

          const transactionSuccessRate = (dbStats.transactions?.total_count || 0) > 0 
            ? ((dbStats.transactions?.success_count || 0) / (dbStats.transactions?.total_count || 0)) * 100 
            : 0;
          const withdrawalSuccessRate = (dbStats.withdrawals?.total_count || 0) > 0 
            ? ((dbStats.withdrawals?.success_count || 0) / (dbStats.withdrawals?.total_count || 0)) * 100 
            : 0;

          return (
            <div key={item.database} className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2 truncate">{item.database}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Transactions:</span>
                  <span className="font-medium">{formatValue(item.transactions)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Withdrawals:</span>
                  <span className="font-medium">{formatValue(item.withdrawals)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Success Rate (T):</span>
                  <span className={`font-medium ${transactionSuccessRate >= 90 ? 'text-green-600' : transactionSuccessRate >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {transactionSuccessRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Success Rate (W):</span>
                  <span className={`font-medium ${withdrawalSuccessRate >= 90 ? 'text-green-600' : withdrawalSuccessRate >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {withdrawalSuccessRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

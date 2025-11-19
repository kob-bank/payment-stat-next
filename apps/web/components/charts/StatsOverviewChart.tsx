'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface TrendData {
  date: string;
  transactions: {
    count: number;
    amount: number;
    success_rate: number;
  };
  withdrawals: {
    count: number;
    amount: number;
    success_rate: number;
  };
}

interface StatsOverviewChartProps {
  data: TrendData[];
  period: string;
  isLoading?: boolean;
}

export default function StatsOverviewChart({ data, period, isLoading = false }: StatsOverviewChartProps) {
  const [chartType, setChartType] = useState<'line' | 'area'>('area');
  const [metric, setMetric] = useState<'count' | 'amount' | 'success_rate'>('count');

  // Transform data for charts
  const chartData = data.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    }),
    fullDate: item.date,
    transactions: item.transactions[metric],
    withdrawals: item.withdrawals[metric],
    total: item.transactions[metric] + item.withdrawals[metric],
  }));

  // Calculate growth metrics
  const calculateGrowth = (currentValue: number, previousValue: number) => {
    if (previousValue === 0) return 0;
    return ((currentValue - previousValue) / previousValue) * 100;
  };

  const getGrowthData = () => {
    if (chartData.length < 2) return { transactions: 0, withdrawals: 0, total: 0 };
    
    const current = chartData[chartData.length - 1];
    const previous = chartData[chartData.length - 2];
    
    if (!current || !previous) return { transactions: 0, withdrawals: 0, total: 0 };
    
    return {
      transactions: calculateGrowth(current.transactions, previous.transactions),
      withdrawals: calculateGrowth(current.withdrawals, previous.withdrawals),
      total: calculateGrowth(current.total, previous.total),
    };
  };

  const growthData = getGrowthData();

  const formatValue = (value: number) => {
    if (metric === 'amount') {
      return new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    }
    if (metric === 'success_rate') {
      return `${value.toFixed(1)}%`;
    }
    return new Intl.NumberFormat('en-US').format(value);
  };

  const getMetricLabel = () => {
    switch (metric) {
      case 'count': return 'Transaction Count';
      case 'amount': return 'Transaction Amount';
      case 'success_rate': return 'Success Rate (%)';
      default: return 'Transactions';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
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

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {getMetricLabel()} Trends
          </h3>
          <p className="text-sm text-gray-500">
            {period} period overview
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
            <option value="success_rate">Success Rate</option>
          </select>
          
          {/* Chart Type Selector */}
          <div className="flex border border-gray-300 rounded-md">
            <button
              onClick={() => setChartType('line')}
              className={`px-3 py-1 text-sm ${
                chartType === 'line'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              } rounded-l-md`}
            >
              Line
            </button>
            <button
              onClick={() => setChartType('area')}
              className={`px-3 py-1 text-sm ${
                chartType === 'area'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              } rounded-r-md border-l border-gray-300`}
            >
              Area
            </button>
          </div>
        </div>
      </div>

      {/* Growth Indicators */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="flex items-center space-x-2">
          <div className={`p-2 rounded-full ${
            growthData.transactions >= 0 ? 'bg-green-100' : 'bg-red-100'
          }`}>
            {growthData.transactions >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-600" />
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500">Transactions</p>
            <p className={`font-semibold ${
              growthData.transactions >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {growthData.transactions >= 0 ? '+' : ''}{growthData.transactions.toFixed(1)}%
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className={`p-2 rounded-full ${
            growthData.withdrawals >= 0 ? 'bg-green-100' : 'bg-red-100'
          }`}>
            {growthData.withdrawals >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-600" />
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500">Withdrawals</p>
            <p className={`font-semibold ${
              growthData.withdrawals >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {growthData.withdrawals >= 0 ? '+' : ''}{growthData.withdrawals.toFixed(1)}%
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className={`p-2 rounded-full ${
            growthData.total >= 0 ? 'bg-green-100' : 'bg-red-100'
          }`}>
            <Activity className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total</p>
            <p className={`font-semibold ${
              growthData.total >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {growthData.total >= 0 ? '+' : ''}{growthData.total.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'line' ? (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280"
                fontSize={12}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={formatValue}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="transactions"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Transactions"
              />
              <Line
                type="monotone"
                dataKey="withdrawals"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Withdrawals"
              />
            </LineChart>
          ) : (
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280"
                fontSize={12}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={formatValue}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="transactions"
                stackId="1"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.6}
                name="Transactions"
              />
              <Area
                type="monotone"
                dataKey="withdrawals"
                stackId="1"
                stroke="#ef4444"
                fill="#ef4444"
                fillOpacity={0.6}
                name="Withdrawals"
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}


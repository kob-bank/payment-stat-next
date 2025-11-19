'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

interface SuccessRateData {
  summary: {
    total_transactions: number;
    total_withdrawals: number;
    overall_success_rate: number;
  };
  by_database: Record<string, {
    transactions?: {
      total_count: number;
      success_count: number;
      failed_count: number;
    };
    withdrawals?: {
      total_count: number;
      success_count: number;
      failed_count: number;
    };
  }>;
}

interface SuccessRatePieChartProps {
  data: SuccessRateData;
  type?: 'transactions' | 'withdrawals' | 'combined';
  isLoading?: boolean;
}

const COLORS = {
  success: '#10b981',
  failed: '#ef4444',
  pending: '#f59e0b',
  unknown: '#6b7280',
};

export default function SuccessRatePieChart({ 
  data, 
  type = 'combined', 
  isLoading = false 
}: SuccessRatePieChartProps) {
  
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

  // Calculate aggregated data
  const calculateAggregatedData = () => {
    let totalSuccess = 0;
    let totalFailed = 0;
    let totalCount = 0;

    Object.values(data.by_database).forEach(dbData => {
      if (type === 'transactions' || type === 'combined') {
        if (dbData.transactions) {
          totalSuccess += dbData.transactions.success_count;
          totalFailed += dbData.transactions.failed_count;
          totalCount += dbData.transactions.total_count;
        }
      }
      
      if (type === 'withdrawals' || type === 'combined') {
        if (dbData.withdrawals) {
          totalSuccess += dbData.withdrawals.success_count;
          totalFailed += dbData.withdrawals.failed_count;
          totalCount += dbData.withdrawals.total_count;
        }
      }
    });

    const totalPending = totalCount - totalSuccess - totalFailed;
    
    return [
      {
        name: 'Successful',
        value: totalSuccess,
        percentage: totalCount > 0 ? (totalSuccess / totalCount) * 100 : 0,
        color: COLORS.success,
        icon: CheckCircle,
      },
      {
        name: 'Failed',
        value: totalFailed,
        percentage: totalCount > 0 ? (totalFailed / totalCount) * 100 : 0,
        color: COLORS.failed,
        icon: XCircle,
      },
      ...(totalPending > 0 ? [{
        name: 'Pending',
        value: totalPending,
        percentage: totalCount > 0 ? (totalPending / totalCount) * 100 : 0,
        color: COLORS.pending,
        icon: Clock,
      }] : []),
    ].filter(item => item.value > 0);
  };

  const pieData = calculateAggregatedData();
  const totalTransactions = pieData.reduce((sum, item) => sum + item.value, 0);
  const successRate = pieData.find(item => item.name === 'Successful')?.percentage || 0;

  const getChartTitle = () => {
    switch (type) {
      case 'transactions': return 'Transaction Success Rate';
      case 'withdrawals': return 'Withdrawal Success Rate';
      case 'combined': return 'Overall Success Rate';
      default: return 'Success Rate';
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">
            Count: {new Intl.NumberFormat('en-US').format(data.value)}
          </p>
          <p className="text-sm text-gray-600">
            Percentage: {data.percentage.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // Don't show labels for segments < 5%
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600';
    if (rate >= 90) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSuccessRateIcon = (rate: number) => {
    if (rate >= 95) return CheckCircle;
    if (rate >= 90) return AlertTriangle;
    return XCircle;
  };

  const SuccessRateIcon = getSuccessRateIcon(successRate);

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {getChartTitle()}
          </h3>
          <p className="text-sm text-gray-500">
            {new Intl.NumberFormat('en-US').format(totalTransactions)} total operations
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className={`p-2 rounded-full ${
            successRate >= 95 ? 'bg-green-100' : 
            successRate >= 90 ? 'bg-yellow-100' : 'bg-red-100'
          }`}>
            <SuccessRateIcon className={`w-5 h-5 ${getSuccessRateColor(successRate)}`} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Success Rate</p>
            <p className={`text-lg font-bold ${getSuccessRateColor(successRate)}`}>
              {successRate.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={CustomLabel}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 space-y-2">
        {pieData.map((entry, index) => {
          const IconComponent = entry.icon;
          return (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <IconComponent className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">{entry.name}</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {new Intl.NumberFormat('en-US').format(entry.value)}
                </p>
                <p className="text-xs text-gray-500">
                  {entry.percentage.toFixed(1)}%
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Status Indicator */}
      <div className="mt-4 p-3 rounded-lg bg-gray-50">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Performance Status</span>
          <span className={`text-sm font-medium ${
            successRate >= 95 ? 'text-green-600' : 
            successRate >= 90 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {successRate >= 95 ? 'Excellent' : 
             successRate >= 90 ? 'Good' : 'Needs Attention'}
          </span>
        </div>
      </div>
    </div>
  );
}


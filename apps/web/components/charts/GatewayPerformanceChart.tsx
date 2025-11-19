'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, DollarSign, Zap, AlertCircle } from 'lucide-react';

interface GatewayStats {
  transactions: { count: number; amount: number };
  withdrawals: { count: number; amount: number };
}

interface GatewayPerformanceData {
  by_database: Record<string, {
    transactions?: {
      by_gateway: Record<string, { count: number; amount: number }>;
      success_count: number;
      failed_count: number;
      total_count: number;
    };
    withdrawals?: {
      by_gateway: Record<string, { count: number; amount: number }>;
      success_count: number;
      failed_count: number;
      total_count: number;
    };
  }>;
}

interface GatewayPerformanceChartProps {
  data: GatewayPerformanceData;
  metric?: 'count' | 'amount' | 'success_rate';
  isLoading?: boolean;
}

export default function GatewayPerformanceChart({ 
  data, 
  metric = 'count', 
  isLoading = false 
}: GatewayPerformanceChartProps) {
  
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

  // Aggregate gateway data across all databases
  const aggregateGatewayData = () => {
    const gatewayMap = new Map<string, GatewayStats>();

    Object.values(data.by_database).forEach(dbData => {
      // Process transactions
      if (dbData.transactions?.by_gateway) {
        Object.entries(dbData.transactions.by_gateway).forEach(([gateway, stats]) => {
          const existing = gatewayMap.get(gateway) || {
            transactions: { count: 0, amount: 0 },
            withdrawals: { count: 0, amount: 0 },
          };
          
          existing.transactions.count += stats.count;
          existing.transactions.amount += stats.amount;
          gatewayMap.set(gateway, existing);
        });
      }

      // Process withdrawals
      if (dbData.withdrawals?.by_gateway) {
        Object.entries(dbData.withdrawals.by_gateway).forEach(([gateway, stats]) => {
          const existing = gatewayMap.get(gateway) || {
            transactions: { count: 0, amount: 0 },
            withdrawals: { count: 0, amount: 0 },
          };
          
          existing.withdrawals.count += stats.count;
          existing.withdrawals.amount += stats.amount;
          gatewayMap.set(gateway, existing);
        });
      }
    });

    return gatewayMap;
  };

  const gatewayData = aggregateGatewayData();

  // Calculate success rates for each gateway
  const calculateSuccessRate = (gateway: string) => {
    let totalTransactions = 0;
    let totalSuccess = 0;

    Object.values(data.by_database).forEach(dbData => {
      if (dbData.transactions?.by_gateway[gateway] && dbData.transactions.total_count > 0) {
        const gatewayShare = dbData.transactions.by_gateway[gateway].count / 
          Object.values(dbData.transactions.by_gateway).reduce((sum, g) => sum + g.count, 0);
        totalTransactions += dbData.transactions.total_count * gatewayShare;
        totalSuccess += dbData.transactions.success_count * gatewayShare;
      }
      
      if (dbData.withdrawals?.by_gateway[gateway] && dbData.withdrawals.total_count > 0) {
        const gatewayShare = dbData.withdrawals.by_gateway[gateway].count / 
          Object.values(dbData.withdrawals.by_gateway).reduce((sum, g) => sum + g.count, 0);
        totalTransactions += dbData.withdrawals.total_count * gatewayShare;
        totalSuccess += dbData.withdrawals.success_count * gatewayShare;
      }
    });

    return totalTransactions > 0 ? (totalSuccess / totalTransactions) * 100 : 0;
  };

  // Prepare chart data
  const chartData = Array.from(gatewayData.entries()).map(([gateway, stats]) => {
    const successRate = calculateSuccessRate(gateway);
    
    return {
      gateway: gateway.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      originalGateway: gateway,
      transactions_count: stats.transactions.count,
      transactions_amount: stats.transactions.amount,
      withdrawals_count: stats.withdrawals.count,
      withdrawals_amount: stats.withdrawals.amount,
      total_count: stats.transactions.count + stats.withdrawals.count,
      total_amount: stats.transactions.amount + stats.withdrawals.amount,
      success_rate: successRate,
    };
  }).sort((a, b) => {
    // Sort by the selected metric
    if (metric === 'count') return b.total_count - a.total_count;
    if (metric === 'amount') return b.total_amount - a.total_amount;
    if (metric === 'success_rate') return b.success_rate - a.success_rate;
    return 0;
  }).slice(0, 10); // Show top 10 gateways

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
      case 'success_rate': return 'Success Rate';
      default: return 'Performance';
    }
  };

  const getMetricIcon = () => {
    switch (metric) {
      case 'count': return Activity;
      case 'amount': return DollarSign;
      case 'success_rate': return Zap;
      default: return Activity;
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-sm text-blue-600">
              Transactions: {new Intl.NumberFormat('en-US').format(data.transactions_count)} 
              ({new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(data.transactions_amount)})
            </p>
            <p className="text-sm text-red-600">
              Withdrawals: {new Intl.NumberFormat('en-US').format(data.withdrawals_count)}
              ({new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(data.withdrawals_amount)})
            </p>
            <p className="text-sm text-green-600">
              Success Rate: {data.success_rate.toFixed(1)}%
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Calculate summary stats
  const totalGateways = gatewayData.size;
  const topPerformer = chartData[0];
  const avgSuccessRate = chartData.reduce((sum, item) => sum + item.success_rate, 0) / chartData.length;

  const MetricIcon = getMetricIcon();

  const getDataKey = () => {
    if (metric === 'success_rate') return 'success_rate';
    if (metric === 'amount') return 'total_amount';
    return 'total_count';
  };

  const getBarColor = (value: number, index: number) => {
    if (metric === 'success_rate') {
      if (value >= 95) return '#10b981'; // green
      if (value >= 90) return '#f59e0b'; // yellow
      return '#ef4444'; // red
    }
    // Gradient based on ranking
    const intensity = Math.max(0.3, 1 - (index / chartData.length));
    return `rgba(59, 130, 246, ${intensity})`;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <MetricIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Gateway Performance - {getMetricLabel()}
            </h3>
            <p className="text-sm text-gray-500">
              Top {chartData.length} of {totalGateways} gateways
            </p>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-600">Total Gateways</span>
          </div>
          <p className="text-lg font-bold text-blue-900">{totalGateways}</p>
        </div>
        
        <div className="bg-green-50 p-3 rounded-lg">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-600">Top Performer</span>
          </div>
          <p className="text-lg font-bold text-green-900 truncate">
            {topPerformer?.gateway || 'N/A'}
          </p>
        </div>
        
        <div className="bg-yellow-50 p-3 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-yellow-600" />
            <span className="text-sm text-yellow-600">Avg Success Rate</span>
          </div>
          <p className="text-lg font-bold text-yellow-900">
            {avgSuccessRate.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="gateway"
              stroke="#6b7280"
              fontSize={11}
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
            {metric === 'success_rate' ? (
              <Bar 
                dataKey={getDataKey()} 
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              >
                {chartData.map((entry, index) => (
                  <Bar 
                    key={`cell-${index}`} 
                    fill={getBarColor(entry[getDataKey()], index)} 
                  />
                ))}
              </Bar>
            ) : (
              <>
                <Bar 
                  dataKey={metric === 'amount' ? 'transactions_amount' : 'transactions_count'}
                  stackId="a"
                  fill="#3b82f6"
                  name="Transactions"
                  radius={[0, 0, 0, 0]}
                />
                <Bar 
                  dataKey={metric === 'amount' ? 'withdrawals_amount' : 'withdrawals_count'}
                  stackId="a"
                  fill="#ef4444"
                  name="Withdrawals"
                  radius={[4, 4, 0, 0]}
                />
              </>
            )}
            <Legend />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Performance Insights */}
      {chartData.length > 0 && topPerformer && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Performance Insights</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <p>• <strong>{topPerformer.gateway}</strong> is the top performer with {formatValue(topPerformer[getDataKey()])}</p>
            <p>• Average success rate across all gateways: {avgSuccessRate.toFixed(1)}%</p>
            <p>• {chartData.filter(g => g.success_rate >= 95).length} gateways have excellent performance (≥95%)</p>
          </div>
        </div>
      )}
    </div>
  );
}


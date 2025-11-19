'use client';

import { TrendingUp, TrendingDown, DollarSign, Activity, CreditCard, ArrowUpDown } from 'lucide-react';

interface StatsSummary {
  total_transactions: number;
  total_withdrawals: number;
  total_transaction_amount: number;
  total_withdrawal_amount: number;
  overall_success_rate: number;
}

interface StatsCardsProps {
  data: StatsSummary;
  isLoading?: boolean;
  previousData?: StatsSummary;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<any>;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  color: 'blue' | 'green' | 'purple' | 'yellow' | 'red';
  isLoading?: boolean;
}

function StatCard({ title, value, icon: Icon, trend, color, isLoading }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500 text-blue-600 bg-blue-50',
    green: 'bg-green-500 text-green-600 bg-green-50',
    purple: 'bg-purple-500 text-purple-600 bg-purple-50',
    yellow: 'bg-yellow-500 text-yellow-600 bg-yellow-50',
    red: 'bg-red-500 text-red-600 bg-red-50',
  };

  const [bgColor, textColor, cardBg] = colorClasses[color].split(' ');

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-8 w-8 bg-gray-200 rounded"></div>
          </div>
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <div className={`p-2 rounded-lg ${cardBg}`}>
          <Icon className={`w-5 h-5 ${textColor}`} />
        </div>
      </div>
      
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-2xl font-bold text-gray-900">
            {typeof value === 'number' ? new Intl.NumberFormat('en-US').format(value) : value}
          </p>
          {trend && (
            <div className="flex items-center mt-1">
              {trend.direction === 'up' ? (
                <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
              ) : trend.direction === 'down' ? (
                <TrendingDown className="w-3 h-3 text-red-500 mr-1" />
              ) : null}
              <span className={`text-xs font-medium ${
                trend.direction === 'up' ? 'text-green-600' : 
                trend.direction === 'down' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {trend.direction !== 'neutral' && (trend.direction === 'up' ? '+' : '')}
                {trend.value.toFixed(1)}%
              </span>
              <span className="text-xs text-gray-500 ml-1">vs previous</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StatsCards({ data, isLoading = false, previousData }: StatsCardsProps) {
  
  const calculateTrend = (current: number, previous?: number) => {
    if (!previous || previous === 0) return { value: 0, direction: 'neutral' as const };
    
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(change),
      direction: change > 0 ? 'up' as const : change < 0 ? 'down' as const : 'neutral' as const,
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (rate: number) => {
    return `${rate.toFixed(1)}%`;
  };

  const totalOperations = data.total_transactions + data.total_withdrawals;
  const totalAmount = data.total_transaction_amount + data.total_withdrawal_amount;
  const avgTransactionAmount = data.total_transactions > 0 ? data.total_transaction_amount / data.total_transactions : 0;

  const cards = [
    {
      title: 'Total Transactions',
      value: data.total_transactions,
      icon: CreditCard,
      color: 'blue' as const,
      trend: calculateTrend(data.total_transactions, previousData?.total_transactions),
    },
    {
      title: 'Total Withdrawals',
      value: data.total_withdrawals,
      icon: ArrowUpDown,
      color: 'purple' as const,
      trend: calculateTrend(data.total_withdrawals, previousData?.total_withdrawals),
    },
    {
      title: 'Transaction Volume',
      value: formatCurrency(data.total_transaction_amount),
      icon: DollarSign,
      color: 'green' as const,
      trend: calculateTrend(data.total_transaction_amount, previousData?.total_transaction_amount),
    },
    {
      title: 'Success Rate',
      value: formatPercentage(data.overall_success_rate),
      icon: Activity,
      color: data.overall_success_rate >= 95 ? 'green' as const : data.overall_success_rate >= 90 ? 'yellow' as const : 'red' as const,
      trend: calculateTrend(data.overall_success_rate, previousData?.overall_success_rate),
    },
  ];

  // Additional insights cards
  const insightCards = [
    {
      title: 'Total Operations',
      value: totalOperations,
      icon: Activity,
      color: 'blue' as const,
      trend: calculateTrend(totalOperations, (previousData?.total_transactions || 0) + (previousData?.total_withdrawals || 0)),
    },
    {
      title: 'Total Volume',
      value: formatCurrency(totalAmount),
      icon: DollarSign,
      color: 'green' as const,
      trend: calculateTrend(totalAmount, (previousData?.total_transaction_amount || 0) + (previousData?.total_withdrawal_amount || 0)),
    },
    {
      title: 'Avg Transaction',
      value: formatCurrency(avgTransactionAmount),
      icon: TrendingUp,
      color: 'purple' as const,
      trend: previousData ? calculateTrend(
        avgTransactionAmount, 
        previousData.total_transactions > 0 ? previousData.total_transaction_amount / previousData.total_transactions : 0
      ) : undefined,
    },
    {
      title: 'Withdrawal Volume',
      value: formatCurrency(data.total_withdrawal_amount),
      icon: ArrowUpDown,
      color: 'yellow' as const,
      trend: calculateTrend(data.total_withdrawal_amount, previousData?.total_withdrawal_amount),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Primary Stats */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((card, index) => (
            <StatCard
              key={index}
              title={card.title}
              value={card.value}
              icon={card.icon}
              color={card.color}
              trend={card.trend}
              isLoading={isLoading}
            />
          ))}
        </div>
      </div>

      {/* Additional Insights */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {insightCards.map((card, index) => (
            <StatCard
              key={index}
              title={card.title}
              value={card.value}
              icon={card.icon}
              color={card.color}
              trend={card.trend}
              isLoading={isLoading}
            />
          ))}
        </div>
      </div>

      {/* Performance Summary */}
      {!isLoading && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h4 className="text-md font-semibold text-gray-900 mb-3">Performance Summary</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Processing Ratio</p>
              <p className="text-lg font-bold text-gray-900">
                {data.total_withdrawals > 0 && data.total_transactions > 0
                  ? `${(data.total_transactions / data.total_withdrawals).toFixed(1)}:1`
                  : 'N/A'}
              </p>
              <p className="text-xs text-gray-500">Transactions to Withdrawals</p>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Volume Efficiency</p>
              <p className="text-lg font-bold text-gray-900">
                {totalOperations > 0 ? formatCurrency(totalAmount / totalOperations) : formatCurrency(0)}
              </p>
              <p className="text-xs text-gray-500">Average per Operation</p>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Success Score</p>
              <p className={`text-lg font-bold ${
                data.overall_success_rate >= 95 ? 'text-green-600' : 
                data.overall_success_rate >= 90 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {data.overall_success_rate >= 95 ? 'Excellent' : 
                 data.overall_success_rate >= 90 ? 'Good' : 'Needs Attention'}
              </p>
              <p className="text-xs text-gray-500">{formatPercentage(data.overall_success_rate)} Success Rate</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


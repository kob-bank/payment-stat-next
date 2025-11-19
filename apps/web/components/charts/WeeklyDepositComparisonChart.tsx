'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
  Area,
  AreaChart
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';

interface DailyDeposit {
  date: string;
  deposits: {
    count: number;
    amount: number;
    success_rate: number;
    by_provider?: Record<string, { count: number; amount: number; success_count: number }>;
    by_site?: Record<string, { count: number; amount: number; success_count: number }>;
  };
  change_from_previous: {
    count_change: number;
    amount_change: number;
    trend: 'up' | 'down' | 'stable' | 'baseline';
  };
}

interface WeeklyDepositData {
  period: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  daily_comparison: DailyDeposit[];
  week_summary: {
    total_deposits: number;
    total_amount: number;
    avg_daily_deposits: number;
    best_day: string;
    growth_rate: number;
  };
  generated_at: string;
}

interface WeeklyDepositComparisonChartProps {
  data: WeeklyDepositData | null;
  isLoading?: boolean;
  showProviderBreakdown?: boolean;
}

export default function WeeklyDepositComparisonChart({
  data,
  isLoading = false,
  showProviderBreakdown = false
}: WeeklyDepositComparisonChartProps) {
  const [metric, setMetric] = useState<'count' | 'amount'>('count');
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area'>('line');

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-80 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data || !data.daily_comparison || data.daily_comparison.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">ไม่มีข้อมูลยอดฝาก</h3>
          <p className="text-gray-500">ไม่มีข้อมูลยอดฝากสำหรับ 7 วันย้อนหลัง</p>
        </div>
      </div>
    );
  }

  // Transform data for chart
  const chartData = data.daily_comparison.map((day, index) => {
    const date = new Date(day.date);
    const formattedDate = date.toLocaleDateString('th-TH', {
      day: '2-digit',
      month: '2-digit'
    });

    return {
      date: formattedDate,
      fullDate: day.date,
      count: day.deposits.count,
      amount: day.deposits.amount,
      success_rate: day.deposits.success_rate,
      count_change: day.change_from_previous.count_change,
      amount_change: day.change_from_previous.amount_change,
      trend: day.change_from_previous.trend,
      index
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

  const formatChange = (change: number, isAmount = false) => {
    const formatted = isAmount ? formatValue(Math.abs(change)) : `${Math.abs(change).toFixed(1)}%`;
    return change > 0 ? `+${formatted}` : change < 0 ? `-${formatted}` : formatted;
  };

  const getTrendIcon = (trend: string, size = 16) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className={`w-${size/4} h-${size/4} text-green-500`} />;
      case 'down':
        return <TrendingDown className={`w-${size/4} h-${size/4} text-red-500`} />;
      default:
        return <Minus className={`w-${size/4} h-${size/4} text-gray-400`} />;
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const currentValue = metric === 'count' ? data.count : data.amount;
      const change = metric === 'count' ? data.count_change : data.amount_change;

      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">
            {new Date(data.fullDate).toLocaleDateString('th-TH', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="text-gray-600">
                {metric === 'count' ? 'จำนวนรายการ:' : 'จำนวนเงิน:'}
              </span>
              <span className="font-medium ml-2">{formatValue(currentValue)}</span>
            </p>
            <p className="text-sm">
              <span className="text-gray-600">Success Rate:</span>
              <span className="font-medium ml-2">{data.success_rate.toFixed(1)}%</span>
            </p>
            {data.index > 0 && (
              <div className="flex items-center space-x-1 text-sm">
                {getTrendIcon(data.trend)}
                <span className="text-gray-600">เทียบกับเมื่อวาน:</span>
                <span className={`font-medium ${
                  data.trend === 'up' ? 'text-green-600' :
                  data.trend === 'down' ? 'text-red-600' :
                  'text-gray-600'
                }`}>
                  {formatChange(change, metric === 'amount')}
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    const dataKey = metric;
    const color = metric === 'count' ? '#3b82f6' : '#10b981';

    switch (chartType) {
      case 'bar':
        return (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
            <YAxis stroke="#6b7280" fontSize={12} tickFormatter={formatValue} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        );

      case 'area':
        return (
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
            <YAxis stroke="#6b7280" fontSize={12} tickFormatter={formatValue} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              fill={color}
              fillOpacity={0.3}
            />
          </AreaChart>
        );

      default: // line
        return (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
            <YAxis stroke="#6b7280" fontSize={12} tickFormatter={formatValue} />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={3}
              dot={{ fill: color, strokeWidth: 2, r: 6 }}
              activeDot={{ r: 8 }}
            />
          </LineChart>
        );
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            เปรียบเทียบยอดฝาก 7 วันย้อนหลัง
          </h3>
          <p className="text-sm text-gray-500">
            ระยะเวลา: {new Date(data.dateRange.startDate).toLocaleDateString('th-TH')} - {new Date(data.dateRange.endDate).toLocaleDateString('th-TH')}
          </p>
        </div>

        <div className="flex space-x-2">
          {/* Metric Selector */}
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as 'count' | 'amount')}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="count">จำนวนรายการ</option>
            <option value="amount">จำนวนเงิน</option>
          </select>

          {/* Chart Type Selector */}
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value as any)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="line">Line Chart</option>
            <option value="bar">Bar Chart</option>
            <option value="area">Area Chart</option>
          </select>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>

      {/* Day-by-Day Details */}
      <div className="grid grid-cols-7 gap-2">
        {data.daily_comparison.map((day, index) => {
          const date = new Date(day.date);
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          const isBestDay = day.date === data.week_summary.best_day;

          return (
            <div
              key={day.date}
              className={`p-3 rounded-lg border text-center ${
                isBestDay ? 'bg-green-50 border-green-200' :
                isWeekend ? 'bg-gray-50 border-gray-200' :
                'bg-white border-gray-200'
              }`}
            >
              <div className="text-xs text-gray-500 mb-1">
                {date.toLocaleDateString('th-TH', { weekday: 'short' })}
              </div>
              <div className="text-xs font-medium text-gray-900 mb-2">
                {date.getDate()}/{date.getMonth() + 1}
              </div>

              <div className="space-y-1">
                <div className="text-sm font-medium">
                  {formatValue(metric === 'count' ? day.deposits.count : day.deposits.amount)}
                </div>

                {index > 0 && (
                  <div className="flex items-center justify-center space-x-1">
                    {getTrendIcon(day.change_from_previous.trend, 12)}
                    <span className={`text-xs font-medium ${
                      day.change_from_previous.trend === 'up' ? 'text-green-600' :
                      day.change_from_previous.trend === 'down' ? 'text-red-600' :
                      'text-gray-500'
                    }`}>
                      {Math.abs(metric === 'count' ?
                        day.change_from_previous.count_change :
                        day.change_from_previous.amount_change
                      ).toFixed(1)}%
                    </span>
                  </div>
                )}

                {index === 0 && (
                  <div className="text-xs text-gray-400">baseline</div>
                )}
              </div>

              {isBestDay && (
                <div className="mt-1">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Best
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
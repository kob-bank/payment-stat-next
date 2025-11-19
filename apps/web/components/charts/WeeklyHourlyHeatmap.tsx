'use client';

import { useMemo } from 'react';

interface HourlyData {
  hour: number;
  transactions: { count: number; amount: number };
  withdrawals: { count: number; amount: number };
}

interface DayData {
  date: string;
  hourly?: HourlyData[];
}

interface WeeklyHourlyHeatmapProps {
  weekData: DayData[];
  metric?: 'transactions' | 'withdrawals' | 'total';
  valueType?: 'count' | 'amount';
}

export function WeeklyHourlyHeatmap({
  weekData,
  metric = 'total',
  valueType = 'count',
}: WeeklyHourlyHeatmapProps) {
  const { heatmapData, maxValue, minValue } = useMemo(() => {
    const data: number[][] = [];
    let max = 0;
    let min = Infinity;

    weekData.forEach((day) => {
      const dayValues: number[] = [];

      for (let hour = 0; hour < 24; hour++) {
        const hourData = day.hourly?.find((h) => h.hour === hour);

        let value = 0;
        if (hourData) {
          if (metric === 'transactions') {
            value = valueType === 'count' ? hourData.transactions.count : hourData.transactions.amount;
          } else if (metric === 'withdrawals') {
            value = valueType === 'count' ? hourData.withdrawals.count : hourData.withdrawals.amount;
          } else {
            // total
            value = valueType === 'count'
              ? hourData.transactions.count + hourData.withdrawals.count
              : hourData.transactions.amount + hourData.withdrawals.amount;
          }
        }

        dayValues.push(value);
        if (value > max) max = value;
        if (value < min && value > 0) min = value;
      }

      data.push(dayValues);
    });

    return { heatmapData: data, maxValue: max, minValue: min === Infinity ? 0 : min };
  }, [weekData, metric, valueType]);

  const getColor = (value: number): string => {
    if (value === 0) return 'bg-gray-100 dark:bg-gray-800';

    const normalized = (value - minValue) / (maxValue - minValue);

    if (metric === 'transactions') {
      if (normalized > 0.75) return 'bg-blue-600';
      if (normalized > 0.5) return 'bg-blue-500';
      if (normalized > 0.25) return 'bg-blue-400';
      return 'bg-blue-300';
    } else if (metric === 'withdrawals') {
      if (normalized > 0.75) return 'bg-green-600';
      if (normalized > 0.5) return 'bg-green-500';
      if (normalized > 0.25) return 'bg-green-400';
      return 'bg-green-300';
    } else {
      // total
      if (normalized > 0.75) return 'bg-purple-600';
      if (normalized > 0.5) return 'bg-purple-500';
      if (normalized > 0.25) return 'bg-purple-400';
      return 'bg-purple-300';
    }
  };

  const formatValue = (value: number): string => {
    if (value === 0) return '0';
    if (valueType === 'amount') {
      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
      return value.toFixed(0);
    }
    return value.toLocaleString();
  };

  const dayOfWeek = (dateStr: string): string => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const date = new Date(dateStr);
    return days[date.getDay()] || '';
  };

  if (!weekData || weekData.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        No data available for heatmap
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[800px]">
        {/* Title */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold">
            {metric === 'transactions' ? 'Transactions' : metric === 'withdrawals' ? 'Withdrawals' : 'Total Operations'}
            {' '}- Hourly Heatmap
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {valueType === 'count' ? 'Transaction count' : 'Amount (THB)'} by hour and day
          </p>
        </div>

        {/* Heatmap Grid */}
        <div className="relative">
          {/* Hour labels (top) */}
          <div className="flex ml-16 mb-1">
            {Array.from({ length: 24 }, (_, i) => (
              <div
                key={i}
                className="flex-1 text-center text-xs text-gray-600 dark:text-gray-400"
              >
                {i % 3 === 0 ? `${i}h` : ''}
              </div>
            ))}
          </div>

          {/* Days + cells */}
          {weekData.map((day, dayIndex) => (
            <div key={day.date} className="flex items-center mb-1">
              {/* Day label */}
              <div className="w-16 text-sm font-medium text-gray-700 dark:text-gray-300">
                <div>{dayOfWeek(day.date)}</div>
                <div className="text-xs text-gray-500">
                  {day.date.split('-').slice(1).join('/')}
                </div>
              </div>

              {/* Hour cells */}
              <div className="flex flex-1 gap-0.5">
                {heatmapData[dayIndex]?.map((value, hour) => (
                  <div
                    key={hour}
                    className={`flex-1 aspect-square rounded ${getColor(value)}
                      hover:ring-2 hover:ring-gray-400 dark:hover:ring-gray-500
                      transition-all cursor-pointer group relative`}
                    title={`${day.date} ${hour}:00 - ${formatValue(value)}`}
                  >
                    {/* Tooltip on hover */}
                    <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2
                      bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap pointer-events-none z-10 transition-opacity">
                      <div className="font-semibold">{hour}:00</div>
                      <div>{formatValue(value)} {valueType === 'amount' ? 'THB' : ''}</div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2
                        border-4 border-transparent border-t-gray-900" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center gap-4 text-sm">
          <span className="text-gray-600 dark:text-gray-400">Less</span>
          <div className="flex gap-1">
            {metric === 'transactions' ? (
              <>
                <div className="w-6 h-6 rounded bg-blue-300" />
                <div className="w-6 h-6 rounded bg-blue-400" />
                <div className="w-6 h-6 rounded bg-blue-500" />
                <div className="w-6 h-6 rounded bg-blue-600" />
              </>
            ) : metric === 'withdrawals' ? (
              <>
                <div className="w-6 h-6 rounded bg-green-300" />
                <div className="w-6 h-6 rounded bg-green-400" />
                <div className="w-6 h-6 rounded bg-green-500" />
                <div className="w-6 h-6 rounded bg-green-600" />
              </>
            ) : (
              <>
                <div className="w-6 h-6 rounded bg-purple-300" />
                <div className="w-6 h-6 rounded bg-purple-400" />
                <div className="w-6 h-6 rounded bg-purple-500" />
                <div className="w-6 h-6 rounded bg-purple-600" />
              </>
            )}
          </div>
          <span className="text-gray-600 dark:text-gray-400">More</span>
          <div className="ml-auto text-gray-600 dark:text-gray-400">
            Max: {formatValue(maxValue)} {valueType === 'amount' ? 'THB' : ''}
          </div>
        </div>
      </div>
    </div>
  );
}

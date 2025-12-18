'use client';

import { useMemo, useState } from 'react';
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';

interface ProviderStats {
    name: string;
    success: { count: number; amount: number };
    failed: { count: number; amount: number };
    total: { count: number; amount: number };
}

interface ProviderDistributionChartProps {
    data: Record<string, any>; // Using any for flexibility with StatusBreakdown
    height?: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

const CustomTooltip = ({ active, payload, metric }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                <p className="font-semibold mb-2">{data.name}</p>
                <div className="text-sm space-y-1">
                    <div className="flex justify-between gap-4">
                        <span className="text-gray-600 dark:text-gray-400">Value:</span>
                        <span className="font-medium">
                            {metric === 'amount'
                                ? new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(data.value)
                                : data.value.toLocaleString()}
                        </span>
                    </div>
                    <div className="flex justify-between gap-4">
                        <span className="text-gray-600 dark:text-gray-400">Share:</span>
                        <span className="font-medium">
                            {data.percent.toFixed(1)}%
                        </span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

export function ProviderDistributionChart({
    data,
    height = 400,
}: ProviderDistributionChartProps) {
    const [metric, setMetric] = useState<'count' | 'amount'>('count');

    const chartData = useMemo(() => {
        if (!data) return [];

        const totalValue = Object.values(data).reduce((sum: number, provider: any) => {
            return sum + (metric === 'count' ? provider.success.count : provider.success.amount);
        }, 0);

        return Object.entries(data)
            .map(([name, stats]: [string, any]) => ({
                name,
                value: metric === 'count' ? stats.success.count : stats.success.amount,
                percent: totalValue > 0
                    ? ((metric === 'count' ? stats.success.count : stats.success.amount) / totalValue) * 100
                    : 0
            }))
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value);
    }, [data, metric]);

    if (!data || Object.keys(data).length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-500">
                No provider data available
            </div>
        );
    }

    return (
        <div className="w-full bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Provider Distribution (Success)
                </h3>
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                    <button
                        onClick={() => setMetric('count')}
                        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${metric === 'count'
                                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                    >
                        By Count
                    </button>
                    <button
                        onClick={() => setMetric('amount')}
                        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${metric === 'amount'
                                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                    >
                        By Volume
                    </button>
                </div>
            </div>

            <ResponsiveContainer width="100%" height={height}>
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                            const RADIAN = Math.PI / 180;
                            const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                            const y = cy + radius * Math.sin(-midAngle * RADIAN);

                            return percent > 0.05 ? (
                                <text
                                    x={x}
                                    y={y}
                                    fill="white"
                                    textAnchor={x > cx ? 'start' : 'end'}
                                    dominantBaseline="central"
                                    className="text-xs font-bold"
                                >
                                    {`${(percent * 100).toFixed(0)}%`}
                                </text>
                            ) : null;
                        }}
                        outerRadius={150}
                        fill="#8884d8"
                        dataKey="value"
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip metric={metric} />} />
                    <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value, entry: any) => (
                            <span className="text-gray-700 dark:text-gray-300 font-medium ml-1">
                                {value}
                            </span>
                        )}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

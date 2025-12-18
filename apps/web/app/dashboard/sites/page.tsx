'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiClient, DailySummary, SiteStats } from '@/lib/api';
import DateSelector from '@/components/dashboard/DateSelector';
import { Loader2, AlertCircle, Search, X, BarChart2, PieChart as PieChartIcon, LayoutGrid } from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';

function SiteInsightsContent() {
    const searchParams = useSearchParams();
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [mounted, setMounted] = useState(false);
    const [data, setData] = useState<DailySummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSite, setSelectedSite] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null);
    const [showPercentage, setShowPercentage] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'structure'>('overview');

    useEffect(() => {
        setSelectedDate(new Date().toISOString().split('T')[0] ?? '');
        setMounted(true);

        // Check auth role and set initial site
        const getCookie = (name: string) => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop()?.split(';').shift();
        };

        const role = getCookie('auth_role') as 'admin' | 'user' | undefined;
        const site = getCookie('auth_site');

        setUserRole(role || null);

        if (role === 'user' && site) {
            setSelectedSite(site);
        } else if (role === 'admin') {
            // Check URL param
            const siteParam = searchParams.get('site');
            if (siteParam) {
                setSelectedSite(siteParam);
            }
        }
    }, [searchParams]);

    useEffect(() => {
        if (!selectedDate) return;

        async function fetchData() {
            try {
                setLoading(true);
                setError(null);
                const result = await apiClient.getDailySummary(selectedDate);
                setData(result);
            } catch (err) {
                console.error('Failed to fetch daily summary:', err);
                setError('Failed to load site data. Please try again.');
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [selectedDate]);

    const sites = useMemo(() => {
        if (!data?.sites) return [];
        return Object.entries(data.sites)
            .map(([name, stats]) => ({
                name,
                ...stats
            }))
            .filter(site =>
                site.name.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => b.total.total.count - a.total.total.count);
    }, [data, searchTerm]);

    const selectedSiteData = useMemo(() => {
        if (!selectedSite || !data?.sites) return null;
        return {
            name: selectedSite,
            stats: data.sites[selectedSite]
        };
    }, [selectedSite, data]);

    // Helper for Heatmap Color
    const getColorIntensity = (count: number, max: number) => {
        if (count === 0) return 'bg-gray-50 dark:bg-gray-800';
        const intensity = count / max;
        if (intensity < 0.2) return 'bg-blue-100 dark:bg-blue-900/30';
        if (intensity < 0.4) return 'bg-blue-200 dark:bg-blue-800/40';
        if (intensity < 0.6) return 'bg-blue-300 dark:bg-blue-700/50';
        if (intensity < 0.8) return 'bg-blue-400 dark:bg-blue-600/60';
        return 'bg-blue-500 dark:bg-blue-500';
    };

    if (!mounted) return null;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto px-4 py-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Site Insights</h1>
                        <p className="text-gray-500 dark:text-gray-400">Detailed analysis per site</p>
                    </div>
                    <DateSelector
                        selectedDate={selectedDate}
                        onDateChange={setSelectedDate}
                    />
                </div>

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl mb-8 flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2" />
                        {error}
                    </div>
                )}

                {userRole !== 'user' && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex gap-4">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search sites..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex justify-center items-center h-64">
                                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase font-medium">
                                        <tr>
                                            <th className="px-6 py-4">Site Name</th>
                                            <th className="px-6 py-4 text-right">Total Tx</th>
                                            <th className="px-6 py-4 text-right">Total Wd</th>
                                            <th className="px-6 py-4 text-right">Volume (Tx)</th>
                                            <th className="px-6 py-4 text-right">Success Rate</th>
                                            <th className="px-6 py-4 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {sites.map((site) => {
                                            const totalOps = site.total.total.count;
                                            const successOps = site.total.success.count;
                                            const successRate = totalOps > 0 ? (successOps / totalOps) * 100 : 0;

                                            return (
                                                <tr key={site.name} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                                        {site.name}
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-300">
                                                        {site.transactions?.total.count.toLocaleString() || '0'}
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-300">
                                                        {site.withdrawals?.total.count.toLocaleString() || '0'}
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-300">
                                                        {new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(site.total.total.amount)}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${successRate >= 90 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                                            successRate >= 70 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                                'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                                            }`}>
                                                            {successRate.toFixed(1)}%
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <button
                                                            onClick={() => setSelectedSite(site.name)}
                                                            className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
                                                        >
                                                            View Details
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
                {userRole === 'user' && loading && (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                )}
            </div>

            {/* Site Detail Modal */}
            {selectedSiteData && (
                <div className={userRole === 'user'
                    ? "container mx-auto px-4 pb-8"
                    : "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                }>
                    <div className={userRole === 'user'
                        ? "bg-white dark:bg-gray-800 rounded-2xl shadow-sm w-full"
                        : "bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto"
                    }>
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedSiteData.name}</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Site Analysis</p>
                            </div>
                            <div className="flex items-center space-x-4">
                                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                                    <button
                                        onClick={() => setActiveTab('overview')}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'overview'
                                            ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                            }`}
                                    >
                                        Overview
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('structure')}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'structure'
                                            ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                            }`}
                                    >
                                        Amount Structure
                                    </button>
                                </div>
                                {userRole !== 'user' && (
                                    <button
                                        onClick={() => setSelectedSite(null)}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                                    >
                                        <X className="w-5 h-5 text-gray-500" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="p-6 space-y-8">
                            {activeTab === 'overview' ? (
                                <>
                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Operations</p>
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                                {selectedSiteData?.stats?.total.total.count.toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Volume</p>
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                                {new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(selectedSiteData?.stats?.total.total.amount || 0)}
                                            </p>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Success Rate</p>
                                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                                {selectedSiteData?.stats?.total.total.count ? ((selectedSiteData.stats.total.success.count / selectedSiteData.stats.total.total.count) * 100).toFixed(1) : '0.0'}%
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Provider Distribution */}
                                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                                            <h3 className="text-lg font-semibold mb-4 flex items-center">
                                                <PieChartIcon className="w-5 h-5 mr-2 text-blue-500" />
                                                Provider Distribution
                                            </h3>
                                            <div className="h-64">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={Object.entries(selectedSiteData?.stats?.providers || {}).map(([name, stats]) => ({
                                                                name,
                                                                value: stats.success.amount
                                                            }))}
                                                            cx="50%"
                                                            cy="50%"
                                                            innerRadius={60}
                                                            outerRadius={80}
                                                            paddingAngle={5}
                                                            dataKey="value"
                                                        >
                                                            {Object.entries(selectedSiteData?.stats?.providers || {}).map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444'][index % 4]} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip
                                                            formatter={(value: number) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(value)}
                                                        />
                                                        <Legend />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>

                                        {/* Hourly Activity */}
                                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                                            <h3 className="text-lg font-semibold mb-4 flex items-center">
                                                <BarChart2 className="w-5 h-5 mr-2 text-purple-500" />
                                                Hourly Activity
                                            </h3>
                                            <div className="h-64">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart
                                                        data={Object.entries(selectedSiteData?.stats?.hourly || {})
                                                            .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                                                            .map(([hour, stats]) => ({
                                                                hour: `${hour}:00`,
                                                                count: stats.total.count
                                                            }))}
                                                    >
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                        <XAxis dataKey="hour" fontSize={12} />
                                                        <YAxis fontSize={12} />
                                                        <Tooltip />
                                                        <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-8">
                                    {/* Amount Distribution Chart */}
                                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                                        <h3 className="text-lg font-semibold mb-4 flex items-center">
                                            <BarChart2 className="w-5 h-5 mr-2 text-indigo-500" />
                                            Amount Distribution
                                        </h3>
                                        <div className="h-80 w-full min-h-[320px] overflow-x-auto">
                                            {Object.keys(selectedSiteData?.stats?.amountDistribution || {}).length > 0 ? (
                                                (() => {
                                                    const chartData = Object.values(selectedSiteData?.stats?.amountDistribution || {})
                                                        .sort((a, b) => {
                                                            const getMin = (r: string) => {
                                                                if (!r) return 0;
                                                                return parseInt(r.split('-')[0].replace('>', ''));
                                                            };
                                                            return getMin(a.range) - getMin(b.range);
                                                        });
                                                    console.log('Amount Distribution Data:', chartData);
                                                    const uniqueProviders = Array.from(new Set(chartData.flatMap(d => Object.keys(d.providers || {}))));
                                                    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

                                                    return (
                                                        <ResponsiveContainer width="100%" height="100%" debounce={200}>
                                                            <BarChart
                                                                data={chartData.map(d => ({
                                                                    ...d,
                                                                    ...Object.entries(d.providers || {}).reduce((acc, [p, v]) => ({ ...acc, [p]: v.count }), {})
                                                                }))}
                                                                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                                                layout="horizontal"
                                                            >
                                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                                <XAxis dataKey="range" fontSize={12} />
                                                                <YAxis fontSize={12} />
                                                                <Tooltip
                                                                    cursor={{ fill: 'transparent' }}
                                                                    content={({ active, payload, label }) => {
                                                                        if (active && payload && payload.length) {
                                                                            return (
                                                                                <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                                                                                    <p className="font-medium text-gray-900 dark:text-white mb-2">{label}</p>
                                                                                    {payload.map((entry: any, index: number) => (
                                                                                        <div key={index} className="flex items-center justify-between gap-4 text-sm">
                                                                                            <span className="flex items-center gap-2">
                                                                                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                                                                                <span className="text-gray-600 dark:text-gray-300 capitalize">{entry.name}</span>
                                                                                            </span>
                                                                                            <span className="font-medium text-gray-900 dark:text-white">{entry.value}</span>
                                                                                        </div>
                                                                                    ))}
                                                                                    <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between gap-4 text-sm font-bold">
                                                                                        <span className="text-gray-900 dark:text-white">Total</span>
                                                                                        <span className="text-gray-900 dark:text-white">
                                                                                            {payload.reduce((sum: number, entry: any) => sum + (entry.value as number), 0)}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        }
                                                                        return null;
                                                                    }}
                                                                />
                                                                <Legend />
                                                                {uniqueProviders.map((provider, index) => (
                                                                    <Bar
                                                                        key={provider}
                                                                        dataKey={provider}
                                                                        stackId="a"
                                                                        fill={COLORS[index % COLORS.length]}
                                                                        radius={[0, 0, 0, 0]} // Radius only on top-most bar is tricky in Recharts 2.x, keeping simple for now
                                                                        barSize={30}
                                                                    />
                                                                ))}
                                                            </BarChart>
                                                        </ResponsiveContainer>
                                                    );
                                                })()
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-gray-500">
                                                    No amount distribution data available
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Hourly Distribution (Table) */}
                                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-semibold flex items-center">
                                                <LayoutGrid className="w-5 h-5 mr-2 text-orange-500" />
                                                Hourly Distribution (Table)
                                            </h3>
                                            <div className="flex items-center space-x-2">
                                                <span className="text-sm text-gray-500 dark:text-gray-400">Show %</span>
                                                <button
                                                    onClick={() => setShowPercentage(!showPercentage)}
                                                    className={`
                                                        relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2
                                                        ${showPercentage ? 'bg-orange-500' : 'bg-gray-200 dark:bg-gray-700'}
                                                    `}
                                                >
                                                    <span
                                                        className={`
                                                            inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                                                            ${showPercentage ? 'translate-x-6' : 'translate-x-1'}
                                                        `}
                                                    />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="h-[600px] w-full flex flex-col">
                                            {(() => {
                                                // Extract and sort ranges
                                                const allRanges = new Set<string>();
                                                const hourlyDist = selectedSiteData?.stats?.hourlyDistribution || {};
                                                Object.values(hourlyDist).forEach((hourData: any) => {
                                                    Object.keys(hourData).forEach(r => allRanges.add(r));
                                                });

                                                // Sort ranges numerically ascending (0-50, 50-100, ...)
                                                const sortedRanges = Array.from(allRanges).sort((a, b) => {
                                                    const lowerA = parseInt(a.split('-')[0] || '0');
                                                    const lowerB = parseInt(b.split('-')[0] || '0');
                                                    return lowerA - lowerB;
                                                });

                                                const maxCount = Math.max(1, ...Object.values(hourlyDist)
                                                    .flatMap((h: any) => Object.values(h).map((r: any) => r.count || 0)));

                                                if (sortedRanges.length === 0) {
                                                    return (
                                                        <div className="flex items-center justify-center h-full text-gray-500">
                                                            No hourly distribution data available
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div className="flex-1 overflow-auto custom-scrollbar relative border border-gray-200 dark:border-gray-700 rounded-lg">
                                                        <table className="min-w-full text-xs text-left border-collapse">
                                                            <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-20">
                                                                <tr>
                                                                    <th className="p-2 border-b border-r border-gray-200 dark:border-gray-700 font-medium text-gray-500 sticky left-0 bg-gray-50 dark:bg-gray-900 z-30 w-16 text-center">
                                                                        Hour
                                                                    </th>
                                                                    {sortedRanges.map(range => (
                                                                        <th key={range} className="p-2 border-b border-gray-200 dark:border-gray-700 font-medium text-gray-500 min-w-[80px] text-center whitespace-nowrap">
                                                                            {range}
                                                                        </th>
                                                                    ))}
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                                                {Array.from({ length: 24 }).map((_, hourIndex) => {
                                                                    const hour = String(hourIndex).padStart(2, '0');

                                                                    // Calculate row total for percentage
                                                                    const rowTotal = sortedRanges.reduce((sum, range) => {
                                                                        return sum + (hourlyDist[hour]?.[range]?.count || 0);
                                                                    }, 0);

                                                                    return (
                                                                        <tr key={hour} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                                            <td className="p-2 border-r border-gray-200 dark:border-gray-700 font-medium text-gray-900 dark:text-gray-300 sticky left-0 bg-white dark:bg-gray-800 z-10 text-center">
                                                                                {hour}:00
                                                                            </td>
                                                                            {sortedRanges.map(range => {
                                                                                const count = hourlyDist[hour]?.[range]?.count || 0;
                                                                                const intensity = count / maxCount;
                                                                                const percentage = rowTotal > 0 ? (count / rowTotal) * 100 : 0;

                                                                                return (
                                                                                    <td key={`${hour}-${range}`} className="p-1 text-center border-r border-gray-100 dark:border-gray-800 last:border-r-0">
                                                                                        <div
                                                                                            className={`
                                                                                                w-full h-8 flex items-center justify-center rounded text-[10px]
                                                                                                ${count > 0 ? 'text-orange-900 font-semibold' : 'text-gray-300'}
                                                                                            `}
                                                                                            style={{
                                                                                                backgroundColor: count > 0 ? `rgba(249, 115, 22, ${Math.max(0.1, intensity)})` : 'transparent'
                                                                                            }}
                                                                                            title={`Count: ${count}\nPercentage: ${percentage.toFixed(1)}%`}
                                                                                        >
                                                                                            {count > 0
                                                                                                ? (showPercentage ? `${percentage.toFixed(0)}%` : count)
                                                                                                : '-'}
                                                                                        </div>
                                                                                    </td>
                                                                                );
                                                                            })}
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    {/* Provider Heatmap */}
                                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                                        <h3 className="text-lg font-semibold mb-4 flex items-center">
                                            <LayoutGrid className="w-5 h-5 mr-2 text-purple-500" />
                                            Provider Distribution (Provider vs Amount Range)
                                        </h3>
                                        <div className="h-80 w-full min-h-[320px] overflow-x-auto">
                                            {(() => {
                                                const providers = Object.keys(selectedSiteData?.stats?.providers || {});
                                                const ranges = ['>50000', '10001-50000', '5001-10000', '1001-5000', '501-1000', '101-500', '0-100'];

                                                // Calculate max count for intensity
                                                const maxCount = Math.max(1, ...Object.values(selectedSiteData?.stats?.amountDistribution || {})
                                                    .flatMap((dist: any) => Object.values(dist.providers || {}).map((p: any) => p.count || 0)));

                                                return (
                                                    <div className="min-w-[600px] h-full">
                                                        <div className="grid grid-cols-[auto_1fr] gap-4 h-full">
                                                            {/* Y-Axis Labels (Ranges) */}
                                                            <div className="flex flex-col justify-between py-6 text-xs text-gray-500 font-medium">
                                                                {ranges.map(range => (
                                                                    <div key={range} className="h-12 flex items-center justify-end pr-2">{range}</div>
                                                                ))}
                                                            </div>

                                                            {/* Heatmap Grid */}
                                                            <div className="flex flex-col h-full">
                                                                <div className={`flex-1 grid gap-1`} style={{ gridTemplateColumns: `repeat(${providers.length}, 1fr)` }}>
                                                                    {providers.map(provider => (
                                                                        <div key={provider} className="flex flex-col justify-between h-full gap-1">
                                                                            {ranges.map(range => {
                                                                                const count = selectedSiteData?.stats?.amountDistribution?.[range]?.providers?.[provider]?.count || 0;
                                                                                const intensity = count / maxCount;

                                                                                return (
                                                                                    <div
                                                                                        key={`${provider}-${range}`}
                                                                                        className="h-12 rounded-sm transition-all hover:ring-2 ring-purple-500 relative group flex items-center justify-center"
                                                                                        style={{
                                                                                            backgroundColor: count > 0 ? `rgba(168, 85, 247, ${Math.max(0.1, intensity)})` : '#f3f4f6'
                                                                                        }}
                                                                                    >
                                                                                        <span className={`text-[10px] font-medium ${count > 0 ? 'text-purple-900' : 'text-gray-300'}`}>
                                                                                            {count > 0 ? count : '-'}
                                                                                        </span>
                                                                                        {/* Tooltip */}
                                                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 min-w-[140px]">
                                                                                            <div className="bg-gray-900 text-white text-xs rounded py-2 px-3 shadow-xl">
                                                                                                <div className="font-bold mb-1 capitalize">{provider}</div>
                                                                                                <div className="text-gray-400 text-[10px] mb-1">{range}</div>
                                                                                                <div className="flex justify-between">
                                                                                                    <span>Count:</span>
                                                                                                    <span className="font-bold">{count}</span>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                {/* X-Axis Labels (Providers) */}
                                                                <div className={`grid gap-1 mt-2`} style={{ gridTemplateColumns: `repeat(${providers.length}, 1fr)` }}>
                                                                    {providers.map(provider => (
                                                                        <div key={provider} className="text-[10px] text-gray-400 text-center capitalize truncate">
                                                                            {provider}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function SiteInsightsPage() {
    return (
        <Suspense fallback={
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        }>
            <SiteInsightsContent />
        </Suspense>
    );
}

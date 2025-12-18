'use client';

import { useState, useEffect } from 'react';
import { apiClient, DailySummary } from '@/lib/api';
import { Loader2, TrendingUp, TrendingDown, Minus, Calendar, DollarSign, Activity, BarChart2, CalendarDays } from 'lucide-react';
import { formatNumber, getDateString } from '@/lib/utils';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    BarChart,
    Bar,
    ReferenceLine,
    Cell
} from 'recharts';
import SuccessRatePieChart from '@/components/charts/SuccessRatePieChart';

type Period = 'week' | 'month';
type Mode = 'period' | 'compare' | 'weekday';
type Weekday = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
type CompareType = 'day' | 'week' | 'month';

interface ComparisonStats {
    current: number;
    previous: number;
    change: number; // percentage
    trend: 'up' | 'down' | 'neutral';
}

interface Metrics {
    txVolume: ComparisonStats;
    wdVolume: ComparisonStats;
    txCount: ComparisonStats;
    wdCount: ComparisonStats;
    txSuccessRate: ComparisonStats;
    wdSuccessRate: ComparisonStats;
    txStats: { success: number; failed: number; pending: number };
    wdStats: { success: number; failed: number; pending: number };
}

const WEEKDAYS: { value: Weekday; label: string }[] = [
    { value: 'Sunday', label: 'Sunday' },
    { value: 'Monday', label: 'Monday' },
    { value: 'Tuesday', label: 'Tuesday' },
    { value: 'Wednesday', label: 'Wednesday' },
    { value: 'Thursday', label: 'Thursday' },
    { value: 'Friday', label: 'Friday' },
    { value: 'Saturday', label: 'Saturday' },
];

export default function InsightsPage() {
    // Mode State
    const [mode, setMode] = useState<Mode>('compare');

    // Period Mode State
    const [period, setPeriod] = useState<Period>('week');

    // Compare Mode State
    const [compareType, setCompareType] = useState<CompareType>('day');

    // Calculate defaults (Yesterday for Day/Week, Last Month for Month)
    // User Requirement: "Don't compare current... data incomplete... start from yesterday"
    const [defaults] = useState(() => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        const lastMonth = new Date(today);
        lastMonth.setMonth(today.getMonth() - 1);

        return {
            date: yesterday.toISOString().split('T')[0],
            month: lastMonth.toISOString().slice(0, 7),
            maxDate: yesterday.toISOString().split('T')[0],
            maxMonth: today.toISOString().slice(0, 7)
        };
    });

    // Day/Week selection for Compare Mode
    const [selectedDate, setSelectedDate] = useState<string>(defaults.date);

    // Weekday Mode State
    // Month selection for Compare Mode & Weekday Mode
    const [selectedMonth, setSelectedMonth] = useState<string>(defaults.month);
    const [selectedWeekday, setSelectedWeekday] = useState<Weekday>('Wednesday'); // Default Wednesday

    // Shared State
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [chartData, setChartData] = useState<any[]>([]);
    const [weeklyChartData, setWeeklyChartData] = useState<any[]>([]); // New state for weekly data breakdown
    const [error, setError] = useState<string | null>(null);
    const [headerText, setHeaderText] = useState('');
    const [userSite, setUserSite] = useState<string | null>(null);

    useEffect(() => {
        const match = document.cookie.match(new RegExp('(^| )auth_site=([^;]+)'));
        const site = match ? match[2] : null;
        if (site && site !== 'root') {
            setUserSite(site);
        }
    }, []);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            setError(null);
            setMetrics(null);
            setChartData([]);
            setWeeklyChartData([]);

            try {
                if (mode === 'period') {
                    await fetchPeriodData();
                } else if (mode === 'compare') {
                    await fetchComparisonData();
                } else if (mode === 'weekday') {
                    await fetchWeekdayData();
                }
            } catch (err) {
                console.error('Failed to fetch data:', err);
                setError('Failed to load data.');
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [mode, period, selectedDate, selectedMonth, selectedWeekday, compareType, userSite]);

    const transformDataForSite = (data: any, siteId: string | null) => {
        if (!siteId || !data) return data;

        const extractSiteDay = (day: any) => {
            // If sites data missing or specific site data missing, return zeroed structure for safety
            const siteData = day.sites?.[siteId];

            // Create a zeroed breakdown
            const zeroBreakdown = {
                success: { count: 0, amount: 0 },
                failed: { count: 0, amount: 0 },
                pending: { count: 0, amount: 0 },
                total: { count: 0, amount: 0 }
            };

            if (!siteData) {
                return {
                    ...day,
                    transactions: zeroBreakdown,
                    withdrawals: zeroBreakdown
                };
            }

            return {
                ...day,
                transactions: siteData.transactions || zeroBreakdown,
                withdrawals: siteData.withdrawals || zeroBreakdown
            };
        };

        // Handle generic structure with 'daily' or 'data' array
        if (data.daily && Array.isArray(data.daily)) {
            return { ...data, daily: data.daily.map(extractSiteDay) };
        }

        if (data.data && Array.isArray(data.data)) { // DateRangeSummary
            return { ...data, data: data.data.map(extractSiteDay) };
        }

        // Single DailySummary
        if (data.date) {
            return extractSiteDay(data);
        }

        return data;
    };

    // --- Data Fetching Strategies ---

    const fetchPeriodData = async () => {
        let currentStart, currentEnd;
        const now = new Date();

        const formatDateLocal = (d: Date) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        if (period === 'month') {
            const parts = selectedMonth.split('-');
            if (parts.length < 2) return;
            const year = parseInt(parts[0]);
            const month = parseInt(parts[1]);

            currentStart = new Date(year, month - 1, 1);
            currentEnd = new Date(year, month, 0);

            // Cap at today if selecting current month
            if (now.getFullYear() === year && now.getMonth() === (month - 1)) {
                currentEnd = new Date(now);
            }
        } else {
            const refDate = new Date(selectedDate);
            if (isNaN(refDate.getTime())) return;

            currentStart = new Date(refDate);
            currentStart.setDate(refDate.getDate() - refDate.getDay()); // Sunday start
            currentEnd = new Date(currentStart);
            currentEnd.setDate(currentStart.getDate() + 6);

            if (currentEnd > now) {
                currentEnd = new Date(now);
            }
        }

        const currentStartStr = formatDateLocal(currentStart);
        const currentEndStr = formatDateLocal(currentEnd);

        setHeaderText(`Period: ${currentStartStr} to ${currentEndStr}`);

        const rawRes = await apiClient.getWeeklyStats(currentStartStr, currentEndStr);
        const currentRes = transformDataForSite(rawRes, userSite);
        // We don't need previous stats for Standard mode as trends are hidden
        const currentTotals = calculateRangeTotals(currentRes.daily || []);
        const dummyTotals = { txVolume: 0, wdVolume: 0, txCount: 0, wdCount: 0, txSuccessCount: 0, txTotalCount: 0, wdSuccessCount: 0, wdTotalCount: 0 };

        const computed = computeMetrics(currentTotals, dummyTotals);
        setMetrics({
            ...computed,
            txStats: { success: currentTotals.txSuccessCount, failed: currentTotals.txFailedCount, pending: currentTotals.txPendingCount },
            wdStats: { success: currentTotals.wdSuccessCount, failed: currentTotals.wdFailedCount, pending: currentTotals.wdPendingCount }
        });

        setChartData((currentRes.daily || []).map(day => ({
            date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            Deposit: day.transactions.total.amount,
            Withdrawal: day.withdrawals.total.amount
        })));
    };

    const fetchComparisonData = async () => {
        try {
            setError(null);

            if (compareType === 'day') {
                // --- DAY comparison logic (Target vs Last Week & Last Month) ---
                const targetDate = new Date(selectedDate);
                if (isNaN(targetDate.getTime())) return;

                const targetStr = getDateString(targetDate);
                // Last Month
                const lastMonthDate = new Date(targetDate);
                lastMonthDate.setMonth(targetDate.getMonth() - 1);
                const lastMonthStr = getDateString(lastMonthDate);
                // Last Week (Day)
                const lastWeekDate = new Date(targetDate);
                lastWeekDate.setDate(targetDate.getDate() - 7);
                const lastWeekStr = getDateString(lastWeekDate);

                // For metric context (Weekly Trend)
                const targetWeekStart = new Date(targetDate);
                targetWeekStart.setDate(targetDate.getDate() - targetDate.getDay());
                const targetWeekEnd = new Date(targetWeekStart);
                targetWeekEnd.setDate(targetWeekStart.getDate() + 6);

                const lastMonthWeekStart = new Date(lastMonthDate);
                lastMonthWeekStart.setDate(lastMonthDate.getDate() - lastMonthDate.getDay());
                const lastMonthWeekEnd = new Date(lastMonthWeekStart);
                lastMonthWeekEnd.setDate(lastMonthWeekStart.getDate() + 6);

                setHeaderText(`Comparing ${targetStr} vs Previous`);

                const [
                    rawTargetDayRes,
                    rawLastMonthDayRes,
                    rawLastWeekRes,
                    rawTargetWeekRes,
                    rawLastMonthWeekRes
                ] = await Promise.all([
                    apiClient.getDailySummary(targetStr).catch(() => null),
                    apiClient.getDailySummary(lastMonthStr).catch(() => null),
                    apiClient.getDailySummary(lastWeekStr).catch(() => null),
                    apiClient.getWeeklyStats(getDateString(targetWeekStart), getDateString(targetWeekEnd)),
                    apiClient.getWeeklyStats(getDateString(lastMonthWeekStart), getDateString(lastMonthWeekEnd))
                ]);

                // Apply Site Transformation
                const targetDayRes = transformDataForSite(rawTargetDayRes, userSite);
                const lastMonthDayRes = transformDataForSite(rawLastMonthDayRes, userSite);
                const lastWeekRes = transformDataForSite(rawLastWeekRes, userSite);
                const targetWeekRes = transformDataForSite(rawTargetWeekRes, userSite);
                const lastMonthWeekRes = transformDataForSite(rawLastMonthWeekRes, userSite);

                // Helper to safely get data
                const getAmt = (res: any, t: 'transactions' | 'withdrawals') => (res?.data || res)?.[t]?.total?.amount || 0;

                const dayDiff = (
                    name: string,
                    currentDep: number, currentWd: number,
                    prevDep: number, prevWd: number
                ) => ({
                    name,
                    depositDiff: currentDep - prevDep,
                    withdrawalDiff: currentWd - prevWd
                });

                const tDep = getAmt(targetDayRes, 'transactions');
                const tWd = getAmt(targetDayRes, 'withdrawals');

                setChartData([
                    dayDiff('vs Last Week', tDep, tWd, getAmt(lastWeekRes, 'transactions'), getAmt(lastWeekRes, 'withdrawals')),
                    dayDiff('vs Last Month', tDep, tWd, getAmt(lastMonthDayRes, 'transactions'), getAmt(lastMonthDayRes, 'withdrawals'))
                ]);

                // Update metrics for Day
                const dayMetricsObj = (res: any) => {
                    const root = res?.data || res || {};
                    return {
                        txVolume: root.transactions?.total?.amount || 0,
                        wdVolume: root.withdrawals?.total?.amount || 0,
                        txCount: root.transactions?.total?.count || 0,
                        wdCount: root.withdrawals?.total?.count || 0,
                        txSuccessCount: root.transactions?.success?.count || 0,
                        txFailedCount: root.transactions?.failed?.count || 0,
                        txPendingCount: root.transactions?.pending?.count || 0,
                        txTotalCount: root.transactions?.total?.count || 0,
                        wdSuccessCount: root.withdrawals?.success?.count || 0,
                        wdFailedCount: root.withdrawals?.failed?.count || 0,
                        wdPendingCount: root.withdrawals?.pending?.count || 0,
                        wdTotalCount: root.withdrawals?.total?.count || 0
                    };
                };
                const tM = dayMetricsObj(targetDayRes);
                const lM = dayMetricsObj(lastMonthDayRes);
                // For weekly context in cards
                const tWM = calculateRangeTotals(targetWeekRes?.daily || []);
                const lWM = calculateRangeTotals(lastMonthWeekRes?.daily || []);

                setMetrics({
                    txVolume: computeMetrics(tM, lM).txVolume, // Daily Growth
                    wdVolume: computeMetrics(tWM, lWM).txVolume, // Weekly Growth context
                    txCount: computeMetrics(tM, lM).txCount,
                    wdCount: computeMetrics(tM, lM).wdCount,
                    txSuccessRate: computeMetrics(tM, lM).txSuccessRate,
                    wdSuccessRate: computeMetrics(tM, lM).wdSuccessRate,
                    txStats: { success: tM.txSuccessCount, failed: tM.txFailedCount, pending: tM.txPendingCount },
                    wdStats: { success: tM.wdSuccessCount, failed: tM.wdFailedCount, pending: tM.wdPendingCount }
                });

            } else if (compareType === 'week') {
                // --- WEEK logic ---
                const refDate = new Date(selectedDate);
                if (isNaN(refDate.getTime())) return;

                // Target Week: Start Mon/Sun or just 7 days? User expects standard week usually.
                // Let's use Week-to-Date or Full Week of selectedDate.
                const tStart = new Date(refDate);
                tStart.setDate(refDate.getDate() - refDate.getDay()); // Sunday
                let tEnd = new Date(tStart);
                tEnd.setDate(tStart.getDate() + 6); // Default Saturday

                const now = new Date();
                // If tEnd is in the future, snap to today (WTD)
                if (tEnd > now) {
                    tEnd = new Date(now);
                }

                const pStart = new Date(tStart);
                pStart.setDate(tStart.getDate() - 7);

                // Align pEnd to same duration (WTD)
                const durationMs = tEnd.getTime() - tStart.getTime();
                const daysDiff = Math.floor(durationMs / (1000 * 60 * 60 * 24));

                const pEnd = new Date(pStart);
                pEnd.setDate(pStart.getDate() + daysDiff);

                setHeaderText(`Comparing Week (${getDateString(tStart)} - ${getDateString(tEnd)}) vs Previous Week (${getDateString(pStart)} - ${getDateString(pEnd)})`);

                const [rawTRes, rawPRes] = await Promise.all([
                    apiClient.getWeeklyStats(getDateString(tStart), getDateString(tEnd)),
                    apiClient.getWeeklyStats(getDateString(pStart), getDateString(pEnd))
                ]);

                // Apply Site Transformation
                const tRes = transformDataForSite(rawTRes, userSite);
                const pRes = transformDataForSite(rawPRes, userSite);

                const tM = calculateRangeTotals(tRes?.daily || []);
                const pM = calculateRangeTotals(pRes?.daily || []);

                // --- Daily Comparison Graph Data (Week) ---
                const tDaily = tRes?.daily || [];
                const pDaily = pRes?.daily || [];

                // Map 0-6 (Sun-Sat)
                const weekChartData = WEEKDAYS.map((w, index) => {
                    // Find data for this weekday index
                    // API returns local date string. `new Date(date).getDay()` should match index if we trust timezone or relative order.
                    // Better: Sort daily array by date and map index 0-6 assuming full week fetched.
                    // The fetch logic fetches 7 days (Sunday - Saturday).

                    // Safe approach: Find matches by day index
                    const tDay = tDaily.find((d: any) => new Date(d.date).getDay() === index);
                    const pDay = pDaily.find((d: any) => new Date(d.date).getDay() === index);

                    return {
                        name: w.value.substr(0, 3), // Mon, Tue
                        date: w.label,
                        // Current
                        Deposit: tDay?.transactions?.total?.amount || 0,
                        Withdrawal: tDay?.withdrawals?.total?.amount || 0,
                        // Previous
                        PrevDeposit: pDay?.transactions?.total?.amount || 0,
                        PrevWithdrawal: pDay?.withdrawals?.total?.amount || 0,
                    };
                });

                setChartData(weekChartData);

                const tTxSuccessRate = tM.txTotalCount > 0 ? (tM.txSuccessCount / tM.txTotalCount) * 100 : 0;
                const pTxSuccessRate = pM.txTotalCount > 0 ? (pM.txSuccessCount / pM.txTotalCount) * 100 : 0;

                const tWdSuccessRate = tM.wdTotalCount > 0 ? (tM.wdSuccessCount / tM.wdTotalCount) * 100 : 0;
                const pWdSuccessRate = pM.wdTotalCount > 0 ? (pM.wdSuccessCount / pM.wdTotalCount) * 100 : 0;

                // Metrics: represent the WEEK totals
                setMetrics({
                    txVolume: { current: tM.txVolume, previous: pM.txVolume, change: calcChange(tM.txVolume, pM.txVolume), trend: getTrend(tM.txVolume, pM.txVolume) },
                    wdVolume: { current: tM.wdVolume, previous: pM.wdVolume, change: calcChange(tM.wdVolume, pM.wdVolume), trend: getTrend(tM.wdVolume, pM.wdVolume) },
                    txCount: { current: tM.txCount, previous: pM.txCount, change: calcChange(tM.txCount, pM.txCount), trend: getTrend(tM.txCount, pM.txCount) },
                    wdCount: { current: tM.wdCount, previous: pM.wdCount, change: calcChange(tM.wdCount, pM.wdCount), trend: getTrend(tM.wdCount, pM.wdCount) },
                    txSuccessRate: { current: tTxSuccessRate, previous: pTxSuccessRate, change: calcChange(tTxSuccessRate, pTxSuccessRate), trend: getTrend(tTxSuccessRate, pTxSuccessRate) },
                    wdSuccessRate: { current: tWdSuccessRate, previous: pWdSuccessRate, change: calcChange(tWdSuccessRate, pWdSuccessRate), trend: getTrend(tWdSuccessRate, pWdSuccessRate) },
                    txStats: { success: tM.txSuccessCount, failed: tM.txFailedCount, pending: tM.txPendingCount },
                    wdStats: { success: tM.wdSuccessCount, failed: tM.wdFailedCount, pending: tM.wdPendingCount }
                });

            } else if (compareType === 'month') {
                // --- MONTH logic ---
                const parts = selectedMonth.split('-');
                if (parts.length < 2) return;
                const year = parseInt(parts[0]);
                const month = parseInt(parts[1]); // 1-12

                const tStart = new Date(year, month - 1, 1);
                // Default End is end of month
                let tEnd = new Date(year, month, 0);

                // Check if current month
                const now = new Date();
                const isCurrentMonth = now.getFullYear() === year && now.getMonth() === (month - 1);

                let pStart = new Date(year, month - 2, 1);
                let pEnd = new Date(year, month - 1, 0);

                if (isCurrentMonth) {
                    // Snap to today
                    tEnd = new Date(now);

                    // Snap previous end to same day of month
                    const dayOfMonth = tEnd.getDate();
                    const prevMonthLastDay = new Date(year, month - 1, 0).getDate();
                    const targetDayFunc = Math.min(dayOfMonth, prevMonthLastDay);

                    pEnd = new Date(year, month - 2, targetDayFunc);

                    setHeaderText(`Comparing ${selectedMonth} (MTD: 1-${dayOfMonth}) vs Previous Month (1-${targetDayFunc})`);
                } else {
                    setHeaderText(`Comparing ${selectedMonth} vs Previous Month`);
                }

                const formatDateLocal = (d: Date) => {
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                };

                const [rawTRes, rawPRes] = await Promise.all([
                    apiClient.getDateRangeSummary(formatDateLocal(tStart), formatDateLocal(tEnd)),
                    apiClient.getDateRangeSummary(formatDateLocal(pStart), formatDateLocal(pEnd))
                ]);

                const tRes = transformDataForSite(rawTRes, userSite);
                const pRes = transformDataForSite(rawPRes, userSite);

                const tM = calculateRangeTotals(tRes?.data || []);
                const pM = calculateRangeTotals(pRes?.data || []);

                // --- Daily Comparison Graph Data ---
                const tDaily = tRes?.data || [];
                const pDaily = pRes?.data || [];

                // Create a map for all days 1-31
                const maxDays = new Date(year, month, 0).getDate();
                const dailyData = [];

                for (let d = 1; d <= maxDays; d++) {
                    const tDayData = tDaily.find((x: any) => new Date(x.date).getDate() === d);
                    // For previous month, we also want matching day number
                    // Note: Previous month might have different number of days (e.g. Feb vs Jan).
                    // Best effort: match day number.
                    const pDayData = pDaily.find((x: any) => new Date(x.date).getDate() === d);

                    // Skip if neither exists (and it's future)
                    if (!tDayData && !pDayData && d > now.getDate() && isCurrentMonth) continue;

                    dailyData.push({
                        name: `${d}`, // Day number label
                        day: d,
                        date: `${d}`,
                        // Current Values
                        Deposit: tDayData?.transactions?.total?.amount || 0,
                        Withdrawal: tDayData?.withdrawals?.total?.amount || 0,
                        // Previous Values
                        PrevDeposit: pDayData?.transactions?.total?.amount || 0,
                        PrevWithdrawal: pDayData?.withdrawals?.total?.amount || 0,
                    });
                }

                setChartData(dailyData);

                // --- Weekly Aggregation Logic ---
                // Group days into weeks (Week 1: Days 1-7, Week 2: 8-14, etc.)
                const weeklyAgg = [];
                let currentWeek = 1;
                let daysInWeek = 0;
                let tWeekSum = { deposit: 0, withdrawal: 0 };
                let pWeekSum = { deposit: 0, withdrawal: 0 };

                for (let d = 0; d < dailyData.length; d++) {
                    const day = dailyData[d];

                    tWeekSum.deposit += day.Deposit || 0;
                    tWeekSum.withdrawal += day.Withdrawal || 0;
                    pWeekSum.deposit += day.PrevDeposit || 0;
                    pWeekSum.withdrawal += day.PrevWithdrawal || 0;

                    daysInWeek++;

                    // End of week (7 days) or End of Month
                    if (daysInWeek === 7 || d === dailyData.length - 1) {
                        weeklyAgg.push({
                            name: `Week ${currentWeek}`,
                            Deposit: tWeekSum.deposit,
                            Withdrawal: tWeekSum.withdrawal,
                            PrevDeposit: pWeekSum.deposit,
                            PrevWithdrawal: pWeekSum.withdrawal
                        });

                        // Reset for next week
                        currentWeek++;
                        daysInWeek = 0;
                        tWeekSum = { deposit: 0, withdrawal: 0 };
                        pWeekSum = { deposit: 0, withdrawal: 0 };
                    }
                }
                setWeeklyChartData(weeklyAgg);


                const tTxSuccessRate = tM.txTotalCount > 0 ? (tM.txSuccessCount / tM.txTotalCount) * 100 : 0;
                const pTxSuccessRate = pM.txTotalCount > 0 ? (pM.txSuccessCount / pM.txTotalCount) * 100 : 0;

                const tWdSuccessRate = tM.wdTotalCount > 0 ? (tM.wdSuccessCount / tM.wdTotalCount) * 100 : 0;
                const pWdSuccessRate = pM.wdTotalCount > 0 ? (pM.wdSuccessCount / pM.wdTotalCount) * 100 : 0;

                setMetrics({
                    txVolume: { current: tM.txVolume, previous: pM.txVolume, change: calcChange(tM.txVolume, pM.txVolume), trend: getTrend(tM.txVolume, pM.txVolume) },
                    wdVolume: { current: tM.wdVolume, previous: pM.wdVolume, change: calcChange(tM.wdVolume, pM.wdVolume), trend: getTrend(tM.wdVolume, pM.wdVolume) },
                    txCount: { current: tM.txCount, previous: pM.txCount, change: calcChange(tM.txCount, pM.txCount), trend: getTrend(tM.txCount, pM.txCount) },
                    wdCount: { current: tM.wdCount, previous: pM.wdCount, change: calcChange(tM.wdCount, pM.wdCount), trend: getTrend(tM.wdCount, pM.wdCount) },
                    txSuccessRate: { current: tTxSuccessRate, previous: pTxSuccessRate, change: calcChange(tTxSuccessRate, pTxSuccessRate), trend: getTrend(tTxSuccessRate, pTxSuccessRate) },
                    wdSuccessRate: { current: tWdSuccessRate, previous: pWdSuccessRate, change: calcChange(tWdSuccessRate, pWdSuccessRate), trend: getTrend(tWdSuccessRate, pWdSuccessRate) },
                    txStats: { success: tM.txSuccessCount, failed: tM.txFailedCount, pending: tM.txPendingCount },
                    wdStats: { success: tM.wdSuccessCount, failed: tM.wdFailedCount, pending: tM.wdPendingCount }
                });
            }

        } catch (error) {
            console.error(error);
            setError('Failed to fetch comparison data');
        }
    };

    // Helper Utils needed locally
    const calcChange = (a: number, b: number) => b > 0 ? ((a - b) / b) * 100 : 0;
    const getTrend = (a: number, b: number): 'up' | 'down' | 'neutral' => a > b ? 'up' : a < b ? 'down' : 'neutral';

    const fetchWeekdayData = async () => {
        if (!selectedMonth) return;

        // Calculate start/end of selected month
        const parts = selectedMonth.split('-');
        if (parts.length !== 2) return;

        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);

        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 0);

        const startStr = getDateString(startOfMonth);
        const endStr = getDateString(endOfMonth);

        const weekdayLabel = WEEKDAYS.find(w => w.value === selectedWeekday)?.label;
        setHeaderText(`Trend for every ${weekdayLabel} in ${selectedMonth}`);

        // Fetch whole month
        const rawRes = await apiClient.getDateRangeSummary(startStr, endStr);
        const res = transformDataForSite(rawRes, userSite);
        const allDays = res.data || [];

        // Filter by weekday (0-6)
        const relevantDays = allDays.filter((d: any) => new Date(d.date).getDay().toString() === selectedWeekday);

        setChartData(relevantDays.map((day: any) => ({
            date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            Deposit: day.transactions.total.amount,
            Withdrawal: day.withdrawals.total.amount,
            Transactions: day.transactions.total.count
        })));
    };

    // --- Helpers ---

    const calculateDayTotals = (day: DailySummary) => ({
        txVolume: day.transactions.total.amount,
        wdVolume: day.withdrawals.total.amount,
        txCount: day.transactions.total.count,
        wdCount: day.withdrawals.total.count,
        txSuccessCount: day.transactions.success.count,
        txFailedCount: day.transactions.failed?.count || 0,
        txPendingCount: day.transactions.pending?.count || 0,
        txTotalCount: day.transactions.total.count,
        wdSuccessCount: day.withdrawals.success.count,
        wdFailedCount: day.withdrawals.failed?.count || 0,
        wdPendingCount: day.withdrawals.pending?.count || 0,
        wdTotalCount: day.withdrawals.total.count
    });

    const calculateRangeTotals = (data: DailySummary[]) => {
        return data.reduce((acc, day) => ({
            txVolume: acc.txVolume + day.transactions.total.amount,
            wdVolume: acc.wdVolume + day.withdrawals.total.amount,
            txCount: acc.txCount + day.transactions.total.count,
            wdCount: acc.wdCount + day.withdrawals.total.count,
            txSuccessCount: acc.txSuccessCount + day.transactions.success.count,
            txFailedCount: (acc.txFailedCount || 0) + (day.transactions.failed?.count || 0),
            txPendingCount: (acc.txPendingCount || 0) + (day.transactions.pending?.count || 0),
            txTotalCount: acc.txTotalCount + day.transactions.total.count,
            wdSuccessCount: acc.wdSuccessCount + day.withdrawals.success.count,
            wdFailedCount: (acc.wdFailedCount || 0) + (day.withdrawals.failed?.count || 0),
            wdPendingCount: (acc.wdPendingCount || 0) + (day.withdrawals.pending?.count || 0),
            wdTotalCount: acc.wdTotalCount + day.withdrawals.total.count
        }), { txVolume: 0, wdVolume: 0, txCount: 0, wdCount: 0, txSuccessCount: 0, txFailedCount: 0, txPendingCount: 0, txTotalCount: 0, wdSuccessCount: 0, wdFailedCount: 0, wdPendingCount: 0, wdTotalCount: 0 });
    };

    const computeMetrics = (curr: any, prev: any): Omit<Metrics, 'txStats' | 'wdStats'> => {
        const getComparison = (c: number, p: number): ComparisonStats => {
            const change = p > 0 ? ((c - p) / p) * 100 : 0;
            return {
                current: c,
                previous: p,
                change: Math.abs(change),
                trend: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
            };
        };

        const currTxRate = curr.txTotalCount > 0 ? (curr.txSuccessCount / curr.txTotalCount) * 100 : 0;
        const prevTxRate = prev.txTotalCount > 0 ? (prev.txSuccessCount / prev.txTotalCount) * 100 : 0;

        const currWdRate = curr.wdTotalCount > 0 ? (curr.wdSuccessCount / curr.wdTotalCount) * 100 : 0;
        const prevWdRate = prev.wdTotalCount > 0 ? (prev.wdSuccessCount / prev.wdTotalCount) * 100 : 0;

        return {
            txVolume: getComparison(curr.txVolume, prev.txVolume),
            wdVolume: getComparison(curr.wdVolume, prev.wdVolume),
            txCount: getComparison(curr.txCount, prev.txCount),
            wdCount: getComparison(curr.wdCount, prev.wdCount),
            txSuccessRate: getComparison(currTxRate, prevTxRate),
            wdSuccessRate: getComparison(currWdRate, prevWdRate)
        };
    };

    const MetricCard = ({ title, metric, prefix = '', suffix = '', inverse = false, labelSuffix = ' vs previous', showComparison = true }: { title: string, metric: ComparisonStats, prefix?: string, suffix?: string, inverse?: boolean, labelSuffix?: string, showComparison?: boolean }) => {
        const isPositive = metric.trend === 'up';
        const isNeutral = metric.trend === 'neutral';
        let colorClass = isNeutral ? 'text-gray-500' : isPositive ? 'text-green-500' : 'text-red-500';
        if (inverse && !isNeutral) colorClass = isPositive ? 'text-red-500' : 'text-green-500';

        return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{title}</h3>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {prefix}{metric.current.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}{suffix}
                </div>
                {showComparison && (
                    <div className="flex items-center text-sm">
                        {metric.trend === 'up' && <TrendingUp className={`w-4 h-4 mr-1 ${colorClass}`} />}
                        {metric.trend === 'down' && <TrendingDown className={`w-4 h-4 mr-1 ${colorClass}`} />}
                        {metric.trend === 'neutral' && <Minus className="w-4 h-4 mr-1 text-gray-400" />}

                        <span className={`font-medium ${colorClass}`}>
                            {metric.change.toFixed(1)}%
                        </span>
                        <span className="text-gray-400 ml-2">{labelSuffix}</span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto px-4 py-8">
                {/* Header & Controls */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-8 gap-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Insights & Comparison</h1>
                        <p className="text-gray-500 dark:text-gray-400">{headerText}</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        {/* Mode Switcher */}
                        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                            {(['period', 'compare', 'weekday'] as Mode[]).map((m) => (
                                <button
                                    key={m}
                                    onClick={() => setMode(m)}
                                    className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${mode === m
                                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                        }`}
                                >
                                    {m === 'period' ? 'Standard' : m === 'compare' ? 'Comparison' : 'Weekday'}
                                </button>
                            ))}
                        </div>

                        {/* Controls based on Mode */}
                        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
                            {mode === 'period' && (
                                <div className="flex items-center gap-4">
                                    <div className="flex bg-gray-100 dark:bg-gray-700 rounded p-0.5">
                                        <button
                                            onClick={() => setPeriod('week')}
                                            className={`px-3 py-1.5 rounded text-sm font-medium ${period === 'week' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                                        >
                                            Week
                                        </button>
                                        <button
                                            onClick={() => setPeriod('month')}
                                            className={`px-3 py-1.5 rounded text-sm font-medium ${period === 'month' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                                        >
                                            Month
                                        </button>
                                    </div>

                                    {period === 'week' && (
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-gray-500" />
                                            <input
                                                type="date"
                                                value={selectedDate}
                                                max={defaults.maxDate}
                                                onChange={(e) => setSelectedDate(e.target.value)}
                                                className="bg-transparent text-sm border-none focus:ring-0 text-gray-700 dark:text-gray-300"
                                            />
                                        </div>
                                    )}
                                    {period === 'month' && (
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-gray-500" />
                                            <input
                                                type="month"
                                                value={selectedMonth}
                                                max={defaults.maxMonth}
                                                onChange={(e) => setSelectedMonth(e.target.value)}
                                                className="bg-transparent text-sm border-none focus:ring-0 text-gray-700 dark:text-gray-300"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {mode === 'compare' && (
                                <div className="flex items-center gap-4">
                                    {/* Granularity Toggle */}
                                    <div className="flex bg-gray-100 dark:bg-gray-700 rounded p-0.5">
                                        {(['day', 'week', 'month'] as CompareType[]).map((t) => (
                                            <button
                                                key={t}
                                                onClick={() => setCompareType(t)}
                                                className={`px-2 py-1 rounded text-xs font-medium capitalize transition-colors ${compareType === t
                                                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                                    }`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Picker based on Type */}
                                    {(compareType === 'day' || compareType === 'week') && (
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-gray-500" />
                                            <input
                                                type="date"
                                                value={selectedDate}
                                                max={defaults.maxDate}
                                                onChange={(e) => setSelectedDate(e.target.value)}
                                                className="bg-transparent text-sm border-none focus:ring-0 text-gray-700 dark:text-gray-300"
                                            />
                                        </div>
                                    )}

                                    {compareType === 'month' && (
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-gray-500" />
                                            <input
                                                type="month"
                                                value={selectedMonth}
                                                max={defaults.maxMonth}
                                                onChange={(e) => setSelectedMonth(e.target.value)}
                                                className="bg-transparent text-sm border-none focus:ring-0 text-gray-700 dark:text-gray-300"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {mode === 'weekday' && (
                                <div className="flex items-center gap-3">
                                    <input
                                        type="month"
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(e.target.value)}
                                        className="bg-transparent text-sm border border-gray-300 rounded px-2 py-1 text-gray-700 dark:text-gray-300"
                                    />
                                    <select
                                        value={selectedWeekday}
                                        onChange={(e) => setSelectedWeekday(e.target.value as Weekday)}
                                        className="bg-transparent text-sm border border-gray-300 rounded px-2 py-1 text-gray-700 dark:text-gray-300"
                                    >
                                        {WEEKDAYS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg mb-6">{error}</div>}

                {loading ? (
                    <div className="flex justify-center h-64 items-center">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Metrics are shown for Period and Day modes */}
                        {metrics && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <MetricCard
                                        title={mode === 'compare' ? (compareType === 'month' ? "Monthly Volume Growth" : compareType === 'week' ? "Weekly Volume Growth" : "Daily Volume Growth") : "Total Deposit"}
                                        metric={metrics.txVolume}
                                        prefix="฿"
                                        showComparison={mode === 'compare'}
                                        labelSuffix={mode === 'compare' ? (compareType === 'day' ? " vs Last Month" : " vs previous") : ""}
                                    />
                                    <MetricCard
                                        title={mode === 'compare' ? "Weekly Volume Growth" : "Total Withdrawal"}
                                        metric={metrics.wdVolume}
                                        prefix="฿"
                                        showComparison={mode === 'compare'}
                                        labelSuffix={mode === 'compare' ? (compareType === 'day' ? " vs Last Month" : " vs previous") : ""}
                                    />
                                    <MetricCard
                                        title="Transactions"
                                        metric={metrics.txCount}
                                        showComparison={mode === 'compare'}
                                    />
                                    <MetricCard
                                        title="Withdrawals"
                                        metric={metrics.wdCount}
                                        showComparison={mode === 'compare'}
                                    />
                                </div>

                                {mode === 'period' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                        <SuccessRatePieChart
                                            type="transactions"
                                            data={{
                                                summary: {
                                                    total_transactions: metrics.txStats.success + metrics.txStats.failed + metrics.txStats.pending,
                                                    total_withdrawals: 0,
                                                    overall_success_rate: metrics.txSuccessRate.current
                                                },
                                                by_database: {
                                                    total: {
                                                        transactions: {
                                                            total_count: metrics.txStats.success + metrics.txStats.failed + metrics.txStats.pending,
                                                            success_count: metrics.txStats.success,
                                                            failed_count: metrics.txStats.failed
                                                        }
                                                    }
                                                }
                                            }}
                                        />
                                        <SuccessRatePieChart
                                            type="withdrawals"
                                            data={{
                                                summary: {
                                                    total_transactions: 0,
                                                    total_withdrawals: metrics.wdStats.success + metrics.wdStats.failed + metrics.wdStats.pending,
                                                    overall_success_rate: metrics.wdSuccessRate.current
                                                },
                                                by_database: {
                                                    total: {
                                                        withdrawals: {
                                                            total_count: metrics.wdStats.success + metrics.wdStats.failed + metrics.wdStats.pending,
                                                            success_count: metrics.wdStats.success,
                                                            failed_count: metrics.wdStats.failed
                                                        }
                                                    }
                                                }
                                            }}
                                        />
                                    </div>
                                )}
                            </>
                        )}

                        {/* Charts Area */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                            {chartData.length > 0 ? (
                                <div className="h-96 w-full">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                                        {mode === 'compare' ? (['month', 'week'].includes(compareType) ? 'Daily Comparison (Current vs Previous)' : 'Comparison: Target vs Previous Periods') : 'Volume Trend'}
                                    </h3>

                                    <ResponsiveContainer width="100%" height="100%">
                                        {mode === 'compare' ? (
                                            ['month', 'week'].includes(compareType) ? (
                                                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                                    <defs>
                                                        <linearGradient id="colorDeposit" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                        </linearGradient>
                                                        <linearGradient id="colorPrevDeposit" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#9ca3af" stopOpacity={0.1} />
                                                            <stop offset="95%" stopColor="#9ca3af" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <XAxis dataKey="name" fontSize={12} label={{ value: compareType === 'month' ? 'Day' : '', position: 'insideBottom', offset: -5 }} />
                                                    <YAxis fontSize={12} tickFormatter={(val) => `฿${(val / 1000).toFixed(0)}k`} />
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                                    <Tooltip
                                                        formatter={(val: number, name: string) => {
                                                            const label = name === 'Deposit' ? 'Current Deposit' : name === 'PrevDeposit' ? 'Previous Deposit' : name;
                                                            return [`฿${val.toLocaleString()}`, label];
                                                        }}
                                                        labelFormatter={(label) => compareType === 'month' ? `Day ${label}` : label}
                                                    />
                                                    <Legend />
                                                    <Area type="monotone" dataKey="Deposit" stroke="#10b981" strokeWidth={2} fill="url(#colorDeposit)" name="Deposit" />
                                                    <Area type="monotone" dataKey="PrevDeposit" stroke="#9ca3af" strokeDasharray="5 5" fill="url(#colorPrevDeposit)" name="Prev Deposit" />
                                                    {/* Hiding Withdrawals by default in this complex view to avoid clutter, or maybe add them? User said "Focus on Deposit and Withdrawal" 
                                                      Let's add them but maybe simpler lines.
                                                    */}
                                                    <Area type="monotone" dataKey="Withdrawal" stroke="#ef4444" strokeWidth={2} fillOpacity={0} name="Withdrawal" />
                                                    <Area type="monotone" dataKey="PrevWithdrawal" stroke="#fca5a5" strokeDasharray="5 5" fillOpacity={0} name="Prev Withdrawal" />
                                                </AreaChart>
                                            ) : (
                                                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                                    <ReferenceLine y={0} stroke="#9ca3af" />
                                                    <XAxis dataKey="name" fontSize={12} />
                                                    <YAxis fontSize={12} tickFormatter={(val) => `฿${(val / 1000).toFixed(0)}k`} />
                                                    <Tooltip
                                                        cursor={{ fill: 'transparent' }}
                                                        formatter={(val: number) => {
                                                            const color = val >= 0 ? 'text-green-600' : 'text-red-600';
                                                            return <span className={color}>{val > 0 ? '+' : ''}฿{val.toLocaleString()}</span>;
                                                        }}
                                                    />
                                                    <Legend />
                                                    <Bar dataKey="depositDiff" name="Deposit Change" fill="#10b981">
                                                        {chartData.map((entry, index) => (
                                                            <Cell key={`cell-dep-${index}`} fill={entry.depositDiff >= 0 ? '#10b981' : '#ef4444'} />
                                                        ))}
                                                    </Bar>
                                                    <Bar dataKey="withdrawalDiff" name="Withdrawal Change" fill="#ef4444">
                                                        {chartData.map((entry, index) => (
                                                            <Cell key={`cell-wd-${index}`} fill={entry.withdrawalDiff >= 0 ? '#10b981' : '#ef4444'} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            )
                                        ) : mode === 'weekday' ? (
                                            <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                                <XAxis dataKey="name" fontSize={12} />
                                                <YAxis fontSize={12} tickFormatter={(val) => `฿${(val / 1000).toFixed(0)}k`} />
                                                <Tooltip
                                                    cursor={{ fill: 'transparent' }}
                                                    formatter={(val: number, name: string) => [`฿${val.toLocaleString()}`, name]}
                                                />
                                                <Legend />
                                                <Bar dataKey="Deposit" stackId="a" fill="#10b981" />
                                                <Bar dataKey="Withdrawal" stackId="a" fill="#ef4444" />
                                            </BarChart>
                                        ) : (
                                            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="colorDeposit" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <XAxis dataKey="date" fontSize={12} minTickGap={30} />
                                                <YAxis fontSize={12} tickFormatter={(val) => `฿${(val / 1000).toFixed(0)}k`} />
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                                <Tooltip
                                                    formatter={(val: number) => [`฿${val.toLocaleString()}`, 'Amount']}
                                                />
                                                <Legend />
                                                <Area type="monotone" dataKey="Deposit" stroke="#3b82f6" strokeWidth={2} fill="url(#colorDeposit)" />
                                                <Area type="monotone" dataKey="Withdrawal" stroke="#ef4444" strokeWidth={2} fillOpacity={0} />
                                            </AreaChart>
                                        )}
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-96 flex items-center justify-center text-gray-400">
                                    No chart data available
                                </div>
                            )}

                            {/* Weekly Breakdown Chart (Only for Month Comparison) */}
                            {compareType === 'month' && weeklyChartData.length > 0 && (
                                <div className="h-96 w-full mt-8 pt-8 border-t border-gray-100 dark:border-gray-700">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                                        Weekly Breakdown (Week 1-5)
                                    </h3>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={weeklyChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorDepositW" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorPrevDepositW" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#9ca3af" stopOpacity={0.1} />
                                                    <stop offset="95%" stopColor="#9ca3af" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="name" fontSize={12} label={{ value: 'Week', position: 'insideBottom', offset: -5 }} />
                                            <YAxis fontSize={12} tickFormatter={(val) => `฿${(val / 1000).toFixed(0)}k`} />
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                            <Tooltip
                                                formatter={(val: number, name: string) => {
                                                    const label = name === 'Deposit' ? 'Current Deposit' : name === 'PrevDeposit' ? 'Previous Deposit' : name;
                                                    return [`฿${val.toLocaleString()}`, label];
                                                }}
                                            />
                                            <Legend />
                                            <Area type="monotone" dataKey="Deposit" stroke="#10b981" strokeWidth={2} fill="url(#colorDepositW)" name="Deposit" />
                                            <Area type="monotone" dataKey="PrevDeposit" stroke="#9ca3af" strokeDasharray="5 5" fill="url(#colorPrevDepositW)" name="Prev Deposit" />
                                            <Area type="monotone" dataKey="Withdrawal" stroke="#ef4444" strokeWidth={2} fillOpacity={0} name="Withdrawal" />
                                            <Area type="monotone" dataKey="PrevWithdrawal" stroke="#fca5a5" strokeDasharray="5 5" fillOpacity={0} name="Prev Withdrawal" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

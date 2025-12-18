"use client";

import { useEffect, useState, useRef } from "react";
import { apiClient } from "@/lib/api";
import { Loader2, RefreshCw, CheckCircle2, X, MousePointerClick } from "lucide-react";

export function CacheCalendar() {
    const [cachedDates, setCachedDates] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());

    // Selection State
    const [isDragging, setIsDragging] = useState(false);
    const [selectionStart, setSelectionStart] = useState<string | null>(null);
    const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());

    const [refreshing, setRefreshing] = useState(false);
    const [showBulkConfirm, setShowBulkConfirm] = useState(false);

    useEffect(() => {
        fetchCacheStatus();
        const interval = setInterval(fetchCacheStatus, 30000);
        return () => clearInterval(interval);
    }, []);

    // Global mouse up to end dragging even if outside the component
    useEffect(() => {
        const handleGlobalMouseUp = () => {
            if (isDragging) {
                setIsDragging(false);
            }
        };
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, [isDragging]);

    const fetchCacheStatus = async () => {
        try {
            const { cachedDates } = await apiClient.getCacheStatus();
            setCachedDates(new Set(cachedDates));
        } catch (error) {
            console.error("Failed to fetch cache status:", error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (year: number, month: number) => {
        return new Date(year, month, 1).getDay();
    };

    const generateCalendarDays = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);
        const days = [];

        for (let i = 0; i < firstDay; i++) {
            days.push(null);
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            days.push({
                day: i,
                date: dateStr,
                isCached: cachedDates.has(dateStr),
            });
        }

        return days;
    };

    // Drag selection logic
    const handleMouseDown = (dateStr: string) => {
        setIsDragging(true);
        setSelectionStart(dateStr);
        setSelectedDates(new Set([dateStr]));
    };

    const handleMouseEnter = (dateStr: string) => {
        if (isDragging && selectionStart) {
            updateSelection(selectionStart, dateStr);
        }
    };

    const updateSelection = (start: string, end: string) => {
        const d1 = new Date(start);
        const d2 = new Date(end);

        const min = d1 < d2 ? d1 : d2;
        const max = d1 < d2 ? d2 : d1;

        const newSelection = new Set<string>();
        const current = new Date(min);

        while (current <= max) {
            const dateStr = current.toISOString().split('T')[0];
            newSelection.add(dateStr);
            current.setDate(current.getDate() + 1);
        }

        setSelectedDates(newSelection);
    };

    const handleBulkRefresh = async () => {
        if (selectedDates.size === 0) return;

        setRefreshing(true);
        try {
            // Sort selection to ensure order (optional but good for logs)
            const datesToSync = Array.from(selectedDates).sort();
            await apiClient.triggerBulkSync(datesToSync);

            // Wait a bit and refresh status
            setTimeout(() => {
                fetchCacheStatus();
            }, 2000);
        } catch (error) {
            console.error("Failed to refresh cache:", error);
        } finally {
            setRefreshing(false);
            setShowBulkConfirm(false);
            setSelectedDates(new Set()); // Clear selection after sync
        }
    };

    // Toggle selection if single click without drag
    const handleDateClick = (dateStr: string) => {
        if (selectedDates.has(dateStr)) {
            // If clicking an already selected item (and not dragging), we could deselect or do nothing.
            // But typically a click starts a new selection. 
            // If simple click, logic is handled by MouseDown/Up sequence effectively creating a 1-item range.
            // So no extra logic needed here strictly, but could handle toggling if desired.
        }
    };


    const days = generateCalendarDays();
    const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    return (
        <div className="w-full max-w-4xl mx-auto space-y-4">

            <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
                <div className="flex flex-col space-y-4">
                    <div className="flex flex-row items-center justify-between">
                        <div>
                            <h3 className="text-2xl font-bold leading-none tracking-tight">Cache Management</h3>
                            <p className="text-sm text-zinc-500 mt-1">Drag to select multiple dates for bulk refresh.</p>
                        </div>

                        <div className="flex items-center space-x-2">
                            <button
                                onClick={handlePrevMonth}
                                className="inline-flex items-center justify-center rounded-md border border-input bg-background h-9 w-9 hover:bg-zinc-100"
                            >
                                &lt;
                            </button>
                            <span className="min-w-[150px] text-center font-medium py-1 px-3 bg-zinc-50 dark:bg-zinc-900 rounded-md">
                                {monthName}
                            </span>
                            <button
                                onClick={handleNextMonth}
                                className="inline-flex items-center justify-center rounded-md border border-input bg-background h-9 w-9 hover:bg-zinc-100"
                            >
                                &gt;
                            </button>
                        </div>
                    </div>

                    {/* Action Bar */}
                    {selectedDates.size > 0 && (
                        <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 px-4 py-3 rounded-lg border border-blue-100 dark:border-blue-800 animate-in slide-in-from-top-2">
                            <div className="flex items-center text-blue-700 dark:text-blue-300 font-medium">
                                <MousePointerClick className="w-4 h-4 mr-2" />
                                {selectedDates.size} day{selectedDates.size > 1 ? 's' : ''} selected
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => setSelectedDates(new Set())}
                                    className="px-3 py-1.5 text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors"
                                >
                                    Clear
                                </button>
                                <button
                                    onClick={() => setShowBulkConfirm(true)}
                                    disabled={refreshing}
                                    className="flex items-center px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors disabled:opacity-50"
                                >
                                    {refreshing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                                    Refresh Selected
                                </button>
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="h-10 w-10 animate-spin text-zinc-400" />
                        </div>
                    ) : (
                        <div
                            className="grid grid-cols-7 gap-2 select-none"
                            onMouseLeave={() => setIsDragging(false)}
                        >
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="text-center text-sm font-medium text-zinc-500 py-2">
                                    {day}
                                </div>
                            ))}
                            {days.map((d, i) => (
                                <div key={i} className="aspect-square">
                                    {d ? (
                                        <div
                                            onMouseDown={() => handleMouseDown(d.date)}
                                            onMouseEnter={() => handleMouseEnter(d.date)}
                                            className={`
                        w-full h-full rounded-md border flex flex-col items-center justify-center relative transition-all duration-150 cursor-pointer
                        ${selectedDates.has(d.date)
                                                    ? 'ring-2 ring-blue-500 ring-offset-2 z-10 border-blue-500 bg-blue-50 dark:bg-blue-900/40'
                                                    : 'hover:shadow-md'
                                                }
                        ${d.isCached && !selectedDates.has(d.date)
                                                    ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800 text-green-700 dark:text-green-300'
                                                    : ''}
                        ${!d.isCached && !selectedDates.has(d.date)
                                                    ? 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50'
                                                    : ''}
                      `}
                                        >
                                            <span className="text-lg font-semibold">
                                                {d.day}
                                            </span>
                                            {d.isCached && (
                                                <div className={`mt-1 flex items-center text-[10px] font-medium opacity-80 ${selectedDates.has(d.date) ? 'text-blue-700 dark:text-blue-300' : 'text-green-600'}`}>
                                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                                    Cached
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="w-full h-full" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Bulk Confirm Modal */}
            {showBulkConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in-0 px-4">
                    <div className="relative w-full max-w-lg bg-white dark:bg-zinc-950 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-800 p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col space-y-2 text-center sm:text-left mb-6">
                            <h2 className="text-lg font-semibold leading-none tracking-tight">Confirm Bulk Refresh</h2>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                Are you sure you want to refresh the stats for <strong>{selectedDates.size} selected days</strong>?
                                <br />
                                This will process dates in batches of 10 to manage server load.
                            </p>
                            <div className="mt-2 max-h-[100px] overflow-y-auto text-xs text-zinc-400 bg-zinc-50 p-2 rounded">
                                {Array.from(selectedDates).sort().join(', ')}
                            </div>
                        </div>

                        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2">
                            <button
                                onClick={() => setShowBulkConfirm(false)}
                                className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input h-10 py-2 px-4 hover:bg-zinc-100"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBulkRefresh}
                                disabled={refreshing}
                                className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-zinc-900 text-zinc-50 hover:bg-zinc-900/90 h-10 py-2 px-4"
                            >
                                {refreshing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Confirm Refresh
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

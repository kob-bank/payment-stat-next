'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { Loader2, RefreshCw, Database, Play, AlertCircle, CheckCircle } from 'lucide-react';
import { CacheCalendar } from '@/components/sync/CacheCalendar';

export default function AdminPage() {
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [syncStatus, setSyncStatus] = useState<import('@/lib/api').SyncStatus | null>(null);

    // Poll sync status
    useEffect(() => {
        let interval: NodeJS.Timeout;

        const checkStatus = async () => {
            try {
                const status = await apiClient.getSyncStatus();
                setSyncStatus(status);
            } catch (err) {
                console.error('Failed to check sync status:', err);
            }
        };

        checkStatus(); // Initial check
        interval = setInterval(checkStatus, 2000);

        return () => clearInterval(interval);
    }, []);

    const handleSync = async (type: 'current' | 'full') => {
        try {
            setActionLoading(`sync-${type}`);
            setError(null);
            setSuccess(null);
            const result = await apiClient.triggerSync(type);
            setSuccess(result.message);
        } catch (err) {
            setError(`Failed to trigger ${type} sync`);
        } finally {
            setActionLoading(null);
        }
    };

    const handleWarmCache = async () => {
        try {
            setActionLoading('warm');
            setError(null);
            setSuccess(null);
            const result = await apiClient.triggerCacheWarm();
            setSuccess(result.message);
        } catch (err) {
            setError('Failed to trigger cache warming');
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                        <Database className="w-6 h-6 mr-2" />
                        Admin & Cache Management
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">Manage system synchronization and view daily cache status.</p>
                </div>

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl mb-6 flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2" />
                        {error}
                    </div>
                )}

                {success && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 p-4 rounded-xl mb-6 flex items-center">
                        <CheckCircle className="w-5 h-5 mr-2" />
                        {success}
                    </div>
                )}

                {/* Sync Status Progress Bar */}
                {syncStatus && syncStatus.status === 'running' && (
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-blue-100 dark:border-blue-900 mb-6">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-semibold text-blue-600 dark:text-blue-400 flex items-center">
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                Sync in Progress
                            </h3>
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{syncStatus.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-2">
                            <div
                                className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${syncStatus.progress}%` }}
                            ></div>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{syncStatus.message}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                    {/* Sync Controls - Sidebar on large screens */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                                <RefreshCw className="w-5 h-5 mr-2" />
                                Actions
                            </h2>
                            <div className="space-y-3">
                                <button
                                    onClick={() => handleSync('current')}
                                    disabled={!!actionLoading || syncStatus?.status === 'running'}
                                    className="w-full flex items-center justify-start px-4 py-3 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {actionLoading === 'sync-current' ? (
                                        <Loader2 className="w-4 h-4 animate-spin mr-3" />
                                    ) : (
                                        <Play className="w-4 h-4 mr-3" />
                                    )}
                                    <div className="text-left">
                                        <div className="font-medium text-sm">Sync Current</div>
                                        <div className="text-xs opacity-70">Incremental update</div>
                                    </div>
                                </button>

                                <button
                                    onClick={() => handleSync('full')}
                                    disabled={!!actionLoading || syncStatus?.status === 'running'}
                                    className="w-full flex items-center justify-start px-4 py-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {actionLoading === 'sync-full' ? (
                                        <Loader2 className="w-4 h-4 animate-spin mr-3" />
                                    ) : (
                                        <Database className="w-4 h-4 mr-3" />
                                    )}
                                    <div className="text-left">
                                        <div className="font-medium text-sm">Full Sync</div>
                                        <div className="text-xs opacity-70">Historical data</div>
                                    </div>
                                </button>

                                <button
                                    onClick={handleWarmCache}
                                    disabled={!!actionLoading || syncStatus?.status === 'running'}
                                    className="w-full flex items-center justify-start px-4 py-3 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {actionLoading === 'warm' ? (
                                        <Loader2 className="w-4 h-4 animate-spin mr-3" />
                                    ) : (
                                        <RefreshCw className="w-4 h-4 mr-3" />
                                    )}
                                    <div className="text-left">
                                        <div className="font-medium text-sm">Warm Cache</div>
                                        <div className="text-xs opacity-70">Last 7 days</div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Main Calendar View */}
                    <div className="lg:col-span-3">
                        <CacheCalendar />
                    </div>
                </div>
            </div>
        </div>
    );
}

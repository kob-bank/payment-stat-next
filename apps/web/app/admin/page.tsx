'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { Loader2, RefreshCw, Trash2, Database, Play, AlertCircle, CheckCircle } from 'lucide-react';

interface CacheKey {
    key: string;
    ttl: number;
}

export default function AdminPage() {
    const [keys, setKeys] = useState<CacheKey[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [pattern, setPattern] = useState('stats:*');

    const fetchKeys = async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await apiClient.getCacheKeys(pattern);
            setKeys(result.keys);
        } catch (err) {
            console.error('Failed to fetch keys:', err);
            setError('Failed to fetch cache keys');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchKeys();
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

    const handleDeleteKey = async (key: string) => {
        if (!confirm(`Are you sure you want to delete key: ${key}?`)) return;

        try {
            setActionLoading(`delete-${key}`);
            setError(null);
            await apiClient.deleteCacheKey(key);
            setSuccess(`Deleted key: ${key}`);
            fetchKeys(); // Refresh list
        } catch (err) {
            setError(`Failed to delete key: ${key}`);
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
                    <p className="text-gray-500 dark:text-gray-400">Manage system cache and synchronization tasks</p>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Sync Controls */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                            <RefreshCw className="w-5 h-5 mr-2" />
                            Synchronization
                        </h2>
                        <div className="space-y-4">
                            <button
                                onClick={() => handleSync('current')}
                                disabled={!!actionLoading}
                                className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                                {actionLoading === 'sync-current' ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                    <Play className="w-4 h-4 mr-2" />
                                )}
                                Sync Current Data (Incremental)
                            </button>

                            <button
                                onClick={() => handleSync('full')}
                                disabled={!!actionLoading}
                                className="w-full flex items-center justify-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                                {actionLoading === 'sync-full' ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                    <Database className="w-4 h-4 mr-2" />
                                )}
                                Full Sync (Historical)
                            </button>

                            <button
                                onClick={handleWarmCache}
                                disabled={!!actionLoading}
                                className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                                {actionLoading === 'warm' ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                )}
                                Warm Cache (Last 7 Days)
                            </button>
                        </div>
                    </div>

                    {/* Cache Stats / Info */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Cache Information</h2>
                        <div className="space-y-2">
                            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                                <span className="text-gray-600 dark:text-gray-400">Total Keys Found</span>
                                <span className="font-medium text-gray-900 dark:text-white">{keys.length}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                                <span className="text-gray-600 dark:text-gray-400">Search Pattern</span>
                                <span className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{pattern}</span>
                            </div>
                            <div className="mt-4 text-sm text-gray-500">
                                <p>TTL (Time To Live) indicates when a key will expire in seconds. -1 means no expiry.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Cache Keys Table */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Cache Keys</h2>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={pattern}
                                onChange={(e) => setPattern(e.target.value)}
                                placeholder="Pattern (e.g. stats:*)"
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                            />
                            <button
                                onClick={fetchKeys}
                                disabled={loading}
                                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
                            >
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                <tr>
                                    <th className="px-6 py-3">Key</th>
                                    <th className="px-6 py-3">TTL (s)</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {loading ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                            Loading keys...
                                        </td>
                                    </tr>
                                ) : keys.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                                            No keys found matching pattern
                                        </td>
                                    </tr>
                                ) : (
                                    keys.map((item) => (
                                        <tr key={item.key} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td className="px-6 py-4 font-mono text-gray-900 dark:text-white">
                                                {item.key}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                                {item.ttl}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleDeleteKey(item.key)}
                                                    disabled={!!actionLoading}
                                                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                                                    title="Delete Key"
                                                >
                                                    {actionLoading === `delete-${item.key}` ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

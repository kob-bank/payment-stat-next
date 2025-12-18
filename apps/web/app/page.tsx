'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { Loader2, Lock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [siteId, setSiteId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validSites, setValidSites] = useState<string[]>([]);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const fetchSites = async () => {
      try {
        const today = new Date().toISOString().split('T')[0] || '';
        const data = await apiClient.getDailySummary(today);
        if (data && data.sites) {
          setValidSites(Object.keys(data.sites));
        }
      } catch (err) {
        console.error('Failed to fetch sites configuration');
      } finally {
        setInitializing(false);
      }
    };

    fetchSites();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const input = siteId.trim();

    // Admin Access
    if (input === 'xbet') {
      document.cookie = `auth_role=admin; path=/; max-age=86400`; // 1 day
      document.cookie = `auth_site=root; path=/; max-age=86400`;
      router.push('/dashboard');
      return;
    }

    // Site User Access
    if (validSites.includes(input)) {
      document.cookie = `auth_role=user; path=/; max-age=86400`;
      document.cookie = `auth_site=${input}; path=/; max-age=86400`;
      // Redirect to sites page with the site pre-selected
      router.push(`/dashboard/sites?site=${input}`);
      return;
    }

    // Invalid
    setError('Invalid Site ID');
    setLoading(false);
  };

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
          <Lock className="h-6 w-6 text-blue-600 dark:text-blue-300" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          Sign in to Dashboard
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Enter your Site ID to continue
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100 dark:border-gray-700">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="siteId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Site ID
              </label>
              <div className="mt-1">
                <input
                  id="siteId"
                  name="siteId"
                  type="text"
                  required
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="e.g. site1"
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-200 dark:border-red-800">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Sign In'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

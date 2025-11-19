'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Payment Statistics Dashboard
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-12">
            Redis-First Architecture for High-Performance Analytics
          </p>

          <div className="grid md:grid-cols-2 gap-6 mt-12">
            <Link
              href="/hourly"
              className="group p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
            >
              <div className="text-4xl mb-4">📊</div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Hourly Statistics
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                View detailed hourly transaction and withdrawal statistics with status breakdown
              </p>
            </Link>

            <div className="group p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg opacity-50 cursor-not-allowed">
              <div className="text-4xl mb-4">🎯</div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                More Coming Soon
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Additional analytics and insights are being developed
              </p>
            </div>
          </div>

          <div className="mt-16 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              🚀 Features
            </h3>
            <div className="grid md:grid-cols-3 gap-4 text-left">
              <div>
                <div className="font-semibold text-blue-600 dark:text-blue-400">Real-time Data</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Stats updated every minute
                </div>
              </div>
              <div>
                <div className="font-semibold text-green-600 dark:text-green-400">Fast Response</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  &lt; 50ms via Redis cache
                </div>
              </div>
              <div>
                <div className="font-semibold text-purple-600 dark:text-purple-400">Status Breakdown</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Success, Failed, Pending
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

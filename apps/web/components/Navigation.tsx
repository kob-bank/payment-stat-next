'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BarChart3, TrendingUp, Settings, LayoutGrid, LogOut } from 'lucide-react';

export default function Navigation() {
    const pathname = usePathname();
    const router = useRouter();

    // Hide navigation on login page
    if (pathname === '/') return null;

    const navItems = [
        { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
        { href: '/dashboard/sites', label: 'Sites', icon: LayoutGrid },
        { href: '/insights', label: 'Insights', icon: TrendingUp },
        { href: '/admin', label: 'Admin', icon: Settings },
    ];

    const handleLogout = () => {
        document.cookie = 'auth_role=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
        document.cookie = 'auth_site=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
        router.push('/');
    };

    return (
        <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center space-x-8">
                        <Link href="/dashboard" className="text-xl font-bold text-gray-900 dark:text-white">
                            Payment Stats
                        </Link>
                        <div className="flex space-x-4">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
                                            ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        <Icon className="w-4 h-4 mr-2" />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                    </button>
                </div>
            </div>
        </nav>
    );
}

// API Response Types
export interface StatusBreakdown {
    success: { count: number; amount: number };
    failed: { count: number; amount: number };
    pending: { count: number; amount: number };
    total: { count: number; amount: number };
}

export interface HourlyStats {
    hour: number;
    transactions: StatusBreakdown;
    withdrawals: StatusBreakdown;
}

export interface DailyStats {
    date: string;
    hourly: HourlyStats[];
}

export interface DailySummary {
    date: string;
    transactions: StatusBreakdown;
    withdrawals: StatusBreakdown;
    timestamp: string;
}

export interface WeeklyStats {
    startDate: string;
    endDate: string;
    daily: DailySummary[];
    timestamp: string;
}

export interface ProviderStats {
    provider: string;
    period: string;
    transactions: StatusBreakdown;
    withdrawals: StatusBreakdown;
    lastUpdated: string;
}

export interface DateRangeSummary {
    startDate: string;
    endDate: string;
    data: DailySummary[];
}

// Legacy types for backward compatibility with existing dashboard pages
export interface StatsQueryParams {
    startDate?: string;
    endDate?: string;
    databases?: string[];
    gateways?: string[];
    sites?: string[]
    status?: string[];
    type?: 'transactions' | 'withdrawals' | 'both';
    minAmount?: number;
    maxAmount?: number;
}

export interface PaginationParams {
    page?: number;
    limit?: number;
    sortOrder?: 'asc' | 'desc';
    sortBy?: string;
}

export interface DetailedStatsParams extends StatsQueryParams {
    includeGatewayBreakdown?: boolean;
    includeSiteBreakdown?: boolean;
    includeHourlyBreakdown?: boolean;
}

// API Client
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export class ApiClient {
    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${API_BASE_URL}${endpoint}`;

        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }

        return response.json();
    }

    // Hourly Stats
    async getHourlyStats(date: string): Promise<HourlyStats[]> {
        return this.request<HourlyStats[]>(`/api/v1/stats/hourly?date=${date}`);
    }

    // Daily Summary
    async getDailySummary(date: string): Promise<DailySummary> {
        return this.request<DailySummary>(`/api/v1/stats/daily?date=${date}`);
    }

    // Weekly Stats
    async getWeeklyStats(startDate: string, endDate: string): Promise<DailySummary[]> {
        return this.request<DailySummary[]>(
            `/api/v1/stats/weekly?startDate=${startDate}&endDate=${endDate}`
        );
    }

    // Date Range Summary
    async getDateRangeSummary(startDate: string, endDate: string): Promise<DateRangeSummary> {
        return this.request<DateRangeSummary>(
            `/api/v1/stats/range?startDate=${startDate}&endDate=${endDate}`
        );
    }

    // Provider Stats
    async getProviderStats(providerId: string): Promise<ProviderStats> {
        return this.request<ProviderStats>(`/api/v1/stats/provider/${providerId}`);
    }

    // Get All Providers
    async getAllProviders(): Promise<{ providers: string[] }> {
        return this.request<{ providers: string[] }>('/api/v1/stats/providers');
    }

    async getDetailedStats(params: DetailedStatsParams): Promise<any> {
        console.warn('getDetailedStats: Legacy method - returning mock data');
        return { data: [], total: 0 };
    }

    async getDashboardStats(params: StatsQueryParams): Promise<any> {
        console.warn('getDashboardStats: Legacy method - use getDailySummary instead');
        return this.getDailySummary((params.startDate || new Date().toISOString().split('T')[0]) as string);
    }

    // Admin Methods
    async triggerSync(type: 'current' | 'full'): Promise<{ message: string }> {
        return this.request<{ message: string }>(`/api/v1/admin/sync/${type}`, {
            method: 'POST',
        });
    }

    async triggerCacheWarm(): Promise<{ message: string }> {
        return this.request<{ message: string }>('/api/v1/admin/cache/warm', {
            method: 'POST',
        });
    }

    async getCacheKeys(pattern: string = 'stats:*'): Promise<{ keys: { key: string; ttl: number }[] }> {
        return this.request<{ keys: { key: string; ttl: number }[] }>(`/api/v1/admin/cache/keys?pattern=${encodeURIComponent(pattern)}`);
    }

    async deleteCacheKey(key: string): Promise<{ message: string }> {
        return this.request<{ message: string }>(`/api/v1/admin/cache/keys/${encodeURIComponent(key)}`, {
            method: 'DELETE',
        });
    }
}

export const apiClient = new ApiClient();

# Data Pipeline Architecture

## 📊 Overview

The payment-stat-next system uses a **Redis-First** architecture with a comprehensive background ETL pipeline.

## 🔄 Pipeline Components

### 1. **Incremental Sync** (Every Minute)
**Cron**: `* * * * *`  
**Purpose**: Keep current day data fresh

**Operations:**
- Sync current day hourly stats
- Sync current day summary
- Update provider stats (last 7 days)

**Redis Keys:**
- `stats:hourly:{YYYY-MM-DD}` - Hourly breakdown
- `stats:daily:{YYYY-MM-DD}` - Daily summary
- `stats:provider:{providerId}` - Provider statistics

---

### 2. **Weekly Aggregation** (Daily at 1 AM)
**Cron**: `0 1 * * *`  
**Purpose**: Aggregate weekly trends

**Operations:**
- Aggregate last 7 days into weekly stats
- Store day-by-day breakdown

**Redis Keys:**
- `stats:weekly:{startDate}_{endDate}` - Weekly summary

---

### 3. **Cache Warming** (Every 5 Minutes)
**Cron**: `*/5 * * * *`  
**Purpose**: Preload frequently accessed data

**Operations:**
- Warm last 7 days hourly stats
- Warm last 7 days daily summaries

**Benefit**: Near-instant reads for dashboard queries

---

## 📋 Data Structures

### Hourly Stats
```typescript
{
  date: "2025-01-19",
  hourly: [
    {
      hour: 0,
      transactions: {
        success: { count: 100, amount: 50000 },
        failed: { count: 5, amount: 1000 },
        pending: { count: 2, amount: 500 },
        total: { count: 107, amount: 51500 }
      },
      withdrawals: { /* same structure */ }
    },
    // ... hours 1-23
  ]
}
```

### Daily Summary
```typescript
{
  date: "2025-01-19",
  transactions: {
    success: { count: 2400, amount: 1200000 },
    failed: { count: 120, amount: 24000 },
    pending: { count: 48, amount: 12000 },
    total: { count: 2568, amount: 1236000 }
  },
  withdrawals: { /* same structure */ },
  timestamp: "2025-01-19T15:00:00.000Z"
}
```

### Weekly Stats
```typescript
{
  startDate: "2025-01-13",
  endDate: "2025-01-19",
  daily: [
    { date: "2025-01-13", transactions: {...}, withdrawals: {...} },
    // ... 7 days
  ],
  timestamp: "2025-01-19T01:00:00.000Z"
}
```

### Provider Stats
```typescript
{
  provider: "PROVIDER_ID",
  period: "7days",
  transactions: {
    success: { count: 1500, amount: 750000 },
    // ... status breakdown
  },
  withdrawals: { /* same structure */ },
  lastUpdated: "2025-01-19T15:00:00.000Z"
}
```

---

## 🛠 API Endpoints

### Hourly Stats
```
GET /api/v1/stats/hourly?date=2025-01-19
```

### Daily Summary
```
GET /api/v1/stats/daily?date=2025-01-19
```

### Weekly Stats
```
GET /api/v1/stats/weekly?startDate=2025-01-13&endDate=2025-01-19
```

### Date Range Summary
```
GET /api/v1/stats/range?startDate=2025-01-10&endDate=2025-01-19
```

### Provider Stats
```
GET /api/v1/stats/provider/:providerId
GET /api/v1/stats/providers  # List all providers
```

---

## ⏱ TTL (Time To Live)

| Data Type | Redis Key Pattern | TTL |
|-----------|------------------|-----|
| Hourly Stats | `stats:hourly:*` | 30 days |
| Daily Summary | `stats:daily:*` | 60 days |
| Weekly Stats | `stats:weekly:*` | 90 days |
| Provider Stats | `stats:provider:*` | 7 days |

---

## 🚀 Performance Metrics

- **API Response Time**: < 50ms (Redis read)
- **Sync Frequency**: Every 1 minute (current day)
- **Cache Hit Rate**: ~95% (last 7 days warmed)
- **Data Freshness**: < 1 minute lag

---

## 🔧 Manual Operations

### Full Sync
Sync all historical data (30 days hourly + daily, provider stats, 12 weeks weekly):

```typescript
// Via API endpoint (to be implemented)
POST /api/v1/admin/sync/full

// Or via service
await syncService.fullSync();
```

### Sync Specific Date
```typescript
await syncService.syncDayStats('2025-01-19');
await syncService.syncDailySummary('2025-01-19');
```

### Sync Provider Stats
```typescript
await syncService.syncProviderStats(30); // Last 30 days
```

---

## 📊 Status Breakdown

All aggregations include status breakdown:

- **SUCCESS**: Completed transactions
- **FAILED**: Failed transactions
- **PENDING**: In-progress transactions
- **TOTAL**: All transactions (sum)

This allows filtering and analysis by status in the frontend.

---

## 🧮 Aggregation Logic

### calculateStatusBreakdown()
```typescript
{
  success: { count: 0, amount: 0 },
  failed: { count: 0, amount: 0 },
  pending: { count: 0, amount: 0 },
  total: { count: 0, amount: 0 }
}
```

Automatically calculates from MongoDB aggregation results grouped by `$status`.

---

## 🔄 Data Flow

```
MongoDB (Source)
    ↓
Sync Service (Aggregation)
    ↓
Redis (Cache)
    ↓
Stats Service (Read)
    ↓
API Response
```

**Benefits:**
1. Fast reads (Redis)
2. Complex aggregations done once
3. Reduced MongoDB load
4. Automatic cache refresh

# Payment Stats Next - API

Redis-First payment statistics system built with NestJS.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your MongoDB and Redis connection details

# Run development server
npm run start:dev

# Build for production
npm run build

# Run production
npm run start:prod
```

## 📦 Architecture

### Redis-First Design
- **API Layer**: Fast reads from Redis cache
- **Sync Worker**: Background aggregation from MongoDB to Redis
- **Data Pipeline**: MongoDB (source) → Aggregation → Redis (cache)

### Key Components

#### 1. **Stats API** (`/api/v1/stats`)
- `GET /hourly?date=YYYY-MM-DD` - Hourly statistics for a specific date
- `GET /provider/:id` - Provider-specific statistics
- `GET /summary?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` - Date range summary

#### 2. **Sync Service**
- **Cron Job**: Runs every minute to sync current day stats
- **Full Sync**: Manual trigger to sync historical data (last 30 days)
- **TTL**: Redis keys expire after 30 days

#### 3. **Data Models**
- **Transaction**: Deposit transactions from MongoDB
- **Withdrawal**: Withdrawal transactions from MongoDB
- **Aggregated Stats**: Pre-computed hourly/daily stats in Redis

## 🔧 Configuration

### Environment Variables

```bash
# Server
PORT=3001
NODE_ENV=development

# MongoDB (Source DB)
MONGODB_URI=mongodb://localhost:27017/payment-stats

# Redis (Cache Layer)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# File-Based Config
CONFIG_DIR=/app/config
```

### Redis Key Schema

```
stats:hourly:{YYYY-MM-DD}    # Daily hourly stats (JSON)
stats:provider:{providerId}   # Provider stats (Hash)
stats:summary:{start}:{end}   # Date range summary (JSON)
```

## 📊 Performance

- **API Response Time**: < 50ms (reads from Redis)
- **Sync Frequency**: Every 1 minute (configurable via cron)
- **Cache TTL**: 30 days

## 🛠 Development

```bash
# Watch mode
npm run start:dev

# Build
npm run build

# Lint
npm run lint

# Format code
npm run format
```

## 📁 Project Structure

```
src/
├── config/          # File-based configuration service
├── database/        # MongoDB schemas and module
│   └── schemas/     # Transaction & Withdrawal schemas
├── redis/           # Redis service
├── stats/           # Stats API (reads from Redis)
│   ├── stats.service.ts
│   ├── stats.controller.ts
│   └── stats.module.ts
├── sync/            # Background sync worker
│   ├── sync.service.ts
│   └── sync.module.ts
├── app.module.ts
└── main.ts
```

## 🔄 Sync Worker

The sync worker runs automatically via cron:
- Aggregates transactions/withdrawals from MongoDB
- Groups by hour (0-23) for each day
- Stores pre-computed stats in Redis
- Handles both SUCCESS status records

### Manual Full Sync

To manually trigger a full sync (useful for initialization):

```typescript
// Via API endpoint or admin panel (to be implemented)
await syncService.fullSync();
```

## 🚢 Deployment

### Docker

```bash
# Build
docker build -t payment-stats-api .

# Run
docker run -p 3001:3001 \
  -e MONGODB_URI=mongodb://mongo:27017/payment-stats \
  -e REDIS_HOST=redis \
  payment-stats-api
```

### Coolify

Supports Docker volumes for persistent file-based configuration:
- Mount `/app/config` for JSON config files

## 📝 License

UNLICENSED

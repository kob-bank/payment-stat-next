# Payment Stats Next

Redis-First payment statistics system - monorepo with NestJS backend and Next.js frontend.

## 🎯 Project Overview

This is a complete rewrite of the `payment-stat` project with a focus on **high-performance data retrieval** using a Redis-First architecture.

## 🏗 Architecture

```
┌─────────────┐
│   Frontend  │ (Next.js - Static Export)
│  (apps/web) │
└──────┬──────┘
       │
       │ HTTP/REST
       ▼
┌─────────────┐
│     API     │ (NestJS)
│ (apps/api)  │
└──────┬──────┘
       │
       ├──────► Redis (Fast Read - Aggregated Stats)
       │
       └──────► MongoDB (Source - Raw Transactions)
                    ▲
                    │
              Background
              Sync Worker
```

### Key Features

1. **Redis-First Performance**: All dashboard reads from Redis cache (< 50ms response time)
2. **Background ETL**: Automatic sync worker aggregates MongoDB data to Redis every minute
3. **File-Based Config**: JSON configuration files (Docker/Coolify friendly)
4. **Static Frontend**: Next.js static export for easy deployment

## 📦 Apps

- **`apps/api`**: NestJS backend with Redis-First architecture
- **`apps/web`**: Next.js frontend (static export)
- **`apps/docs`**: Documentation site

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Development (all apps)
npm run dev

# Build all
npm run build

# Lint all
npm run lint
```

### Running Individual Apps

```bash
# API only
cd apps/api
npm run start:dev

# Frontend only
cd apps/web
npm run dev
```

## 🔧 Environment Setup

### API (apps/api/.env)

```bash
PORT=3001
MONGODB_URI=mongodb://localhost:27017/payment-stats
REDIS_HOST=localhost
REDIS_PORT=6379
CONFIG_DIR=/app/config
```

### Frontend (apps/web/.env.local)

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 📊 Data Flow

1. **Write Path**: Transactions → MongoDB (unchanged)
2. **Sync Worker**: MongoDB → Aggregation → Redis (every 1 min)
3. **Read Path**: API ← Redis (dashboard queries)

## 🚢 Deployment

### Backend (Docker)

```bash
cd apps/api
docker build -t payment-stats-api .
docker run -p 3001:3001 payment-stats-api
```

### Frontend (Static Hosting)

```bash
cd apps/web
npm run build
# Deploy ./out directory to any static host
```

## 📚 Documentation

- [API Documentation](./apps/api/README.md)
- [Architecture Plan](https://github.com/kob-bank/payment-stat/issues/13)

## 🔗 Related Projects

- [Original Project](https://github.com/kob-bank/payment-stat)

## 📝 License

UNLICENSED

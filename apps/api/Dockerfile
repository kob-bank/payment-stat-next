FROM node:20-alpine AS builder

WORKDIR /app

# Copy root config
COPY package.json package-lock.json turbo.json ./

# Copy packages and apps
COPY packages ./packages
COPY apps/api ./apps/api

# Install dependencies
RUN npm config set fetch-retry-maxtimeout 600000 && npm install

# Build api
RUN npx turbo run build --filter=api


FROM node:20-alpine

WORKDIR /app

# Set timezone to GMT+7
RUN apk add --no-cache tzdata
ENV TZ=Asia/Bangkok

# Copy built artifacts and dependencies
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/apps/api/config ./config

EXPOSE 3001

CMD ["node", "dist/main"]

FROM node:18-alpine AS builder

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

FROM node:18-alpine

WORKDIR /app

# Copy built artifacts and dependencies
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./

EXPOSE 3001

CMD ["node", "dist/main"]

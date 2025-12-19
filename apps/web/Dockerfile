FROM node:20-alpine AS builder

WORKDIR /app

# Copy root config
COPY package.json package-lock.json turbo.json ./

# Copy packages and apps
COPY packages ./packages
COPY apps/web ./apps/web

# Install dependencies (libc6-compat might be needed for some deps even in runner if not fully standalone, but usually inside builder is enough)
RUN apk add --no-cache libc6-compat
RUN npm config set fetch-retry-maxtimeout 600000 && npm install

# Set API URL for build time (if needed by client components during build)
# Set API URL for build time
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build web
RUN npx turbo run build --filter=web

FROM node:20-alpine AS runner
WORKDIR /app

# Set timezone to GMT+7
RUN apk add --no-cache tzdata
ENV TZ=Asia/Bangkok

# Don't run as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

COPY --from=builder /app/apps/web/next.config.js ./
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

# Copy the standalone build
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000

CMD ["node", "apps/web/server.js"]

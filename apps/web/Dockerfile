FROM node:20-alpine AS builder


RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy root config
COPY package.json package-lock.json turbo.json ./

# Copy packages and apps
COPY packages ./packages
COPY apps/web ./apps/web

# Install dependencies
RUN npm config set fetch-retry-maxtimeout 600000 && npm install

# Set API URL for build time
ENV NEXT_PUBLIC_API_URL=http://localhost:3001

# Build web
RUN npx turbo run build --filter=web

FROM nginx:alpine

COPY --from=builder /app/apps/web/out /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

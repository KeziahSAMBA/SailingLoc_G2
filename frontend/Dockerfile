# Multi-stage build for React/Vite application

# Build stage
FROM node:20.19.4-alpine3.21 AS builder

WORKDIR /app

# Vite inlines public configuration into the browser bundle. Railway exposes
# service variables during the Docker build; declaring them as ARGs makes that
# contract explicit and lets the build validator fail closed when a deployment
# URL is missing or points at localhost.
ARG VITE_API_BASE_URL
ARG VITE_MATOMO_URL
ARG VITE_STRIPE_PUBLISHABLE_KEY
ARG VITE_BUILD_ENV=production
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_MATOMO_URL=$VITE_MATOMO_URL \
    VITE_STRIPE_PUBLISHABLE_KEY=$VITE_STRIPE_PUBLISHABLE_KEY \
    VITE_BUILD_ENV=$VITE_BUILD_ENV

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginxinc/nginx-unprivileged:1.27-alpine

# Apply Alpine security updates while retaining the image's documented
# unprivileged runtime identity (UID 101).
USER root
RUN apk upgrade --no-cache

# Copy built assets from builder stage
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Nginx runs as the unprivileged `nginx` user and therefore listens above 1024.
EXPOSE 8080

# nginxinc/nginx-unprivileged runs as nginx UID 101; keep that exact identity
# after the root-only package update above.
USER 101

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

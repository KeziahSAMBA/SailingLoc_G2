# Multi-stage build for React/Vite application

# Build stage
FROM node:20.19.4-alpine3.21 AS builder

WORKDIR /app

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

# Copy built assets from builder stage
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Nginx runs as the unprivileged `nginx` user and therefore listens above 1024.
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

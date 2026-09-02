# Multi-stage build for React/Vite application.
#
# The Railway service uses the repository root (/) as its build context. Keep
# every source path explicit so `frontend/railway.json` works without requiring
# a mutable service-level root-directory override. Local production/staging
# Compose builds use the same root context and Dockerfile path.

# Build stage
FROM node:20.19.4-alpine3.21 AS builder

WORKDIR /app/frontend

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

# Copy the frontend workspace manifest before installing so Docker can cache
# dependencies independently from application source changes. The frontend has
# its own lockfile, so the static image does not need to install backend
# dependencies merely because Railway sends the monorepo root as its context.
COPY frontend/package*.json ./

# Install the locked workspace graph. Lifecycle scripts are not needed to build
# the frontend and can execute backend tooling during an image build, so keep
# this layer deterministic and side-effect free.
RUN npm ci --ignore-scripts --no-audit --no-fund

# Copy the frontend source only; the backend is not part of the static image.
COPY frontend/ ./

# Build the application
RUN npm run build

# Production stage
FROM nginxinc/nginx-unprivileged:1.27-alpine

# Apply Alpine security updates while retaining the image's documented
# unprivileged runtime identity (UID 101).
USER root
RUN apk upgrade --no-cache

# Copy built assets from builder stage
COPY --from=builder --chown=nginx:nginx /app/frontend/dist /usr/share/nginx/html

# Copy the policy rendered by the validated build step. The runtime image never
# interpolates environment values and cannot fall back to an unrendered template.
COPY --from=builder --chown=root:root /app/frontend/.generated/default.conf /etc/nginx/conf.d/default.conf

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

# Use Node.js 20 Alpine for smaller image size
FROM node:20.19.4-alpine3.21

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Generate Prisma Client for Linux
RUN npx prisma generate

# Create public/private storage directories and hand ownership to the runtime
# user. Named volumes mounted by compose inherit these permissions.
RUN mkdir -p uploads storage/documents storage/disputes \
  && chown -R node:node /app

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4000/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Prisma migrations and the API do not require root privileges.
USER node

# Run migrations, then start the app. Demonstration data is intentionally not
# seeded by a production image; use docker-compose.dev.yml for local fixtures.
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]

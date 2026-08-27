# Use Node.js 20 Alpine for smaller image size
FROM node:20-alpine

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

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

# Run migrations, then start the app. Demonstration data is intentionally not
# seeded by a production image; use docker-compose.dev.yml for local fixtures.
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]

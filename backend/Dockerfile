# Use Node.js 20 Alpine for smaller image size
FROM node:20.19.4-alpine3.21

# Install OpenSSL for Prisma, then apply the latest security updates available
# from the pinned Alpine repository.
RUN apk add --no-cache openssl \
  && apk upgrade --no-cache

# Set working directory
WORKDIR /app

# The production image must not silently start with development semantics when
# a platform omits NODE_ENV. Compose/Railway may override this explicitly for
# staging or tests, but the image-safe default is always production.
ENV NODE_ENV=production

# Copy package files
COPY package*.json ./

# Install only the locked production dependency graph.  Keep npm's cache out
# of every committed image layer; it is not needed at runtime and may contain
# package metadata that unnecessarily increases the attack surface.
RUN npm install --global npm@11.19.1 --no-audit --no-fund \
  && npm ci --omit=dev --no-audit --no-fund \
  && npm cache clean --force \
  && rm -rf /root/.npm /home/node/.npm /tmp/npm-*

# Copy source code
COPY . .

# Generate Prisma Client for Linux.  `npx` resolves the already-installed
# production CLI; clean once more so a future npm/prisma change cannot leave a
# cache in the final image.
RUN npx prisma generate \
  && rm -rf /root/.npm /home/node/.npm /tmp/npm-*

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

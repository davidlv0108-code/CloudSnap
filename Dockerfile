# ========== BUILD STAGE ==========
FROM node:20-alpine AS builder

WORKDIR /build

# Install dependencies with caching layer
COPY package.json package-lock.json ./
RUN npm ci --only=production --silent && npm cache clean --force

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate --schema=prisma/schema.prisma

# ========== RUNTIME STAGE ==========
FROM node:20-alpine

# Add security labels
LABEL maintainer="CloudSnap Team"
LABEL description="CloudSnap Backend Service"

# Create app directory
WORKDIR /usr/src/app

# Copy node_modules and Prisma from builder
COPY --from=builder /build/node_modules ./node_modules
COPY --from=builder /build/prisma ./prisma

# Copy application code
COPY src ./src
COPY package.json package-lock.json ./

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Create uploads directory with proper permissions
RUN mkdir -p /usr/src/app/uploads && \
    chown -R nodejs:nodejs /usr/src/app

USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

EXPOSE 3000

CMD ["node", "src/app.js"]

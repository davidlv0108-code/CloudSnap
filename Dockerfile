# ========== BUILD STAGE - Install dependencies ==========
FROM node:20-alpine AS builder

WORKDIR /build

# Install Android SDK dependencies + Expo CLI
RUN apk add --no-cache \
    bash \
    curl \
    git \
    python3 \
    make \
    g++ \
    openjdk11

# Install Expo CLI globally
RUN npm install -g expo-cli eas-cli --silent && npm cache clean --force

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --silent && npm cache clean --force

# Copy app source
COPY . .

# ========== RUNTIME STAGE - EAS Build Environment ==========
FROM node:20-alpine

LABEL maintainer="CloudSnap Team"
LABEL description="CloudSnap Mobile - Expo EAS Build Environment"

WORKDIR /app

# Install build tools
RUN apk add --no-cache \
    bash \
    curl \
    git \
    jq \
    openssh-client

# Copy from builder
COPY --from=builder /build/node_modules ./node_modules
COPY --from=builder /build/package.json ./package.json
COPY --from=builder /build/package-lock.json ./package-lock.json

# Copy app source
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S expo && \
    adduser -S expo -u 1001 && \
    chown -R expo:expo /app

USER expo

# Health check for container
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD test -f package.json && echo "ready" || exit 1

# Default command: show build options
CMD ["expo", "--version"]

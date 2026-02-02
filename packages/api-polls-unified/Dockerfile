# Multi-stage Dockerfile for api-polls-unified
# Builds from monorepo root to include all workspace dependencies

# Stage 1: Build all necessary packages
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./
COPY packages/shared-types/package*.json ./packages/shared-types/
COPY packages/shared-schemas/package*.json ./packages/shared-schemas/
COPY packages/shared-auth/package*.json ./packages/shared-auth/
COPY packages/shared-computation/package*.json ./packages/shared-computation/
COPY packages/api-polls-admin/package*.json ./packages/api-polls-admin/
COPY packages/api-polls-public/package*.json ./packages/api-polls-public/
COPY packages/api-polls-unified/package*.json ./packages/api-polls-unified/

# Install all dependencies (respects workspace structure)
RUN npm ci

# Copy source code for all necessary packages
COPY packages/shared-types ./packages/shared-types
COPY packages/shared-schemas ./packages/shared-schemas
COPY packages/shared-auth ./packages/shared-auth
COPY packages/shared-computation ./packages/shared-computation
COPY packages/api-polls-admin ./packages/api-polls-admin
COPY packages/api-polls-public ./packages/api-polls-public
COPY packages/api-polls-unified ./packages/api-polls-unified

# Copy workspace configuration
COPY tsconfig.json ./

# Build only the packages we copied (not db, ui, etc.)
RUN npm run build --workspace=shared-types --workspace=shared-schemas --workspace=shared-auth --workspace=shared-computation --workspace=api-polls-admin --workspace=api-polls-public --workspace=api-polls-unified

# Stage 2: Production runtime
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/shared-types/package*.json ./packages/shared-types/
COPY packages/shared-schemas/package*.json ./packages/shared-schemas/
COPY packages/shared-auth/package*.json ./packages/shared-auth/
COPY packages/shared-computation/package*.json ./packages/shared-computation/
COPY packages/api-polls-admin/package*.json ./packages/api-polls-admin/
COPY packages/api-polls-public/package*.json ./packages/api-polls-public/
COPY packages/api-polls-unified/package*.json ./packages/api-polls-unified/

# Install only production dependencies
RUN npm ci --omit=dev

# Copy built artifacts from builder stage
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /app/packages/shared-schemas/dist ./packages/shared-schemas/dist
COPY --from=builder /app/packages/shared-auth/dist ./packages/shared-auth/dist
COPY --from=builder /app/packages/shared-computation/dist ./packages/shared-computation/dist
COPY --from=builder /app/packages/api-polls-admin/dist ./packages/api-polls-admin/dist
COPY --from=builder /app/packages/api-polls-public/dist ./packages/api-polls-public/dist
COPY --from=builder /app/packages/api-polls-unified/dist ./packages/api-polls-unified/dist

# Set production environment
ENV NODE_ENV=production

# Railway injects PORT, but provide default for local testing
ENV PORT=3005

# Expose the port
EXPOSE 3005

# Start the unified API
CMD ["node", "packages/api-polls-unified/dist/main.js"]

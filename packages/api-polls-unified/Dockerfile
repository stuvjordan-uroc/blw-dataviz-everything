FROM node:20-alpine

WORKDIR /app

# Copy workspace files
COPY package*.json ./
COPY packages/api-polls-unified/package*.json ./packages/api-polls-unified/
COPY packages/api-polls-admin/package*.json ./packages/api-polls-admin/
COPY packages/api-polls-public/package*.json ./packages/api-polls-public/
COPY packages/shared-types/package*.json ./packages/shared-types/
COPY packages/shared-schemas/package*.json ./packages/shared-schemas/
COPY packages/shared-auth/package*.json ./packages/shared-auth/
COPY packages/shared-computation/package*.json ./packages/shared-computation/
COPY packages/db/package*.json ./packages/db/

# Install dependencies
RUN npm install

# Copy source code
COPY packages/api-polls-unified/ ./packages/api-polls-unified/
COPY packages/api-polls-admin/ ./packages/api-polls-admin/
COPY packages/api-polls-public/ ./packages/api-polls-public/
COPY packages/shared-types/ ./packages/shared-types/
COPY packages/shared-schemas/ ./packages/shared-schemas/
COPY packages/shared-auth/ ./packages/shared-auth/
COPY packages/shared-computation/ ./packages/shared-computation/
COPY packages/db/ ./packages/db/
COPY tsconfig.json ./

# Build all packages
RUN npm run build

# Expose port
EXPOSE 3005

# Start the unified API
CMD ["npm", "run", "--workspace=api-polls-unified", "start"]

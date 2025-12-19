###################
# BUILD STAGE
# This stage compiles TypeScript and builds all dependencies
###################
FROM node:20-alpine AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy package files from the root and all workspace packages
# We need these to install dependencies correctly in the monorepo structure
COPY package*.json ./
COPY packages/api-polls-admin/package*.json ./packages/api-polls-admin/
COPY packages/shared-auth/package*.json ./packages/shared-auth/
COPY packages/shared-schemas/package*.json ./packages/shared-schemas/
COPY packages/shared-types/package*.json ./packages/shared-types/
COPY packages/shared-computation/package*.json ./packages/shared-computation/

# Install ALL dependencies (including dev dependencies needed for building)
# npm ci is like npm install but faster and more reliable for production
# It installs exactly what's in package-lock.json
RUN npm ci

# Copy the TypeScript configuration files
# These are needed to compile the TypeScript code
COPY tsconfig.json ./
COPY packages/api-polls-admin/tsconfig.json ./packages/api-polls-admin/
COPY packages/shared-auth/tsconfig.json ./packages/shared-auth/
COPY packages/shared-schemas/tsconfig.json ./packages/shared-schemas/
COPY packages/shared-types/tsconfig.json ./packages/shared-types/
COPY packages/shared-computation/tsconfig.json ./packages/shared-computation/

# Copy the source code for all packages
# We only copy packages that api-polls-admin actually depends on
COPY packages/api-polls-admin/src ./packages/api-polls-admin/src
COPY packages/shared-auth/src ./packages/shared-auth/src
COPY packages/shared-schemas/src ./packages/shared-schemas/src
COPY packages/shared-types/src ./packages/shared-types/src
COPY packages/shared-computation/src ./packages/shared-computation/src

# Build all packages
# This compiles TypeScript to JavaScript in the dist/ folders
RUN npm run build

###################
# DEVELOPMENT STAGE
# This stage includes dev dependencies and is used for local development
###################
FROM node:20-alpine AS development

# Set the working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/api-polls-admin/package*.json ./packages/api-polls-admin/
COPY packages/shared-auth/package*.json ./packages/shared-auth/
COPY packages/shared-schemas/package*.json ./packages/shared-schemas/
COPY packages/shared-types/package*.json ./packages/shared-types/
COPY packages/shared-computation/package*.json ./packages/shared-computation/

# Install ALL dependencies (including dev dependencies like tsx)
RUN npm ci

# Copy TypeScript configuration files
COPY tsconfig.json ./
COPY packages/api-polls-admin/tsconfig.json ./packages/api-polls-admin/
COPY packages/shared-auth/tsconfig.json ./packages/shared-auth/
COPY packages/shared-schemas/tsconfig.json ./packages/shared-schemas/
COPY packages/shared-types/tsconfig.json ./packages/shared-types/
COPY packages/shared-computation/tsconfig.json ./packages/shared-computation/

# Copy source code for shared packages (needed to build them)
COPY packages/shared-auth/src ./packages/shared-auth/src
COPY packages/shared-schemas/src ./packages/shared-schemas/src
COPY packages/shared-types/src ./packages/shared-types/src
COPY packages/shared-computation/src ./packages/shared-computation/src

# Build the shared packages in dependency order
# shared-types has no dependencies
RUN npm run build --workspace=shared-types
# shared-computation depends on shared-types
RUN npm run build --workspace=shared-computation
# shared-schemas depends on both shared-types and shared-computation
RUN npm run build --workspace=shared-schemas
# shared-auth depends on shared-schemas
RUN npm run build --workspace=shared-auth

# Copy the development startup script
COPY packages/api-polls-admin/dev-start.sh /app/dev-start.sh
RUN chmod +x /app/dev-start.sh

# Source code will be mounted via volumes in docker-compose
# No need to copy it here since we want live reloading

# Expose port 3003
EXPOSE 3003

# Set the working directory to the root for the startup script
WORKDIR /app

# Start in development mode with the startup script that runs watch modes
CMD ["/app/dev-start.sh"]

###################
# PRODUCTION STAGE
# This stage creates the final lightweight image with only what's needed to run
###################
FROM node:20-alpine AS production

# Set the working directory
WORKDIR /app

# Copy package files again
COPY package*.json ./
COPY packages/api-polls-admin/package*.json ./packages/api-polls-admin/
COPY packages/shared-auth/package*.json ./packages/shared-auth/
COPY packages/shared-schemas/package*.json ./packages/shared-schemas/

# Install ONLY production dependencies (no dev dependencies)
# --omit=dev skips devDependencies like TypeScript, tsx, etc.
RUN npm ci --omit=dev

# Copy the compiled JavaScript from the builder stage
# We're copying ONLY the dist folders, not the TypeScript source
COPY --from=builder /app/packages/api-polls-admin/dist ./packages/api-polls-admin/dist
COPY --from=builder /app/packages/shared-auth/dist ./packages/shared-auth/dist
COPY --from=builder /app/packages/shared-schemas/dist ./packages/shared-schemas/dist

# Expose port 3003
# This documents which port the app listens on (doesn't actually publish it)
EXPOSE 3003

# Set the working directory to the api-polls-admin package
WORKDIR /app/packages/api-polls-admin

# Start the application
# This runs the compiled JavaScript version
CMD ["npm", "start"]

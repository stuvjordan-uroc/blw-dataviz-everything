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
COPY packages/api-polls-public/package*.json ./packages/api-polls-public/
COPY packages/shared-schemas/package*.json ./packages/shared-schemas/

# Install ALL dependencies (including dev dependencies needed for building)
# npm ci is like npm install but faster and more reliable for production
# It installs exactly what's in package-lock.json
RUN npm ci

# Copy the TypeScript configuration files
# These are needed to compile the TypeScript code
COPY tsconfig.json ./
COPY packages/api-polls-public/tsconfig.json ./packages/api-polls-public/
COPY packages/shared-schemas/tsconfig.json ./packages/shared-schemas/

# Copy the source code for all packages
# We only copy packages that api-polls-public actually depends on
COPY packages/api-polls-public/src ./packages/api-polls-public/src
COPY packages/shared-schemas/src ./packages/shared-schemas/src

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
COPY packages/api-polls-public/package*.json ./packages/api-polls-public/
COPY packages/shared-schemas/package*.json ./packages/shared-schemas/

# Install ALL dependencies (including dev dependencies like tsx)
RUN npm ci

# Copy TypeScript configuration files
COPY tsconfig.json ./
COPY packages/api-polls-public/tsconfig.json ./packages/api-polls-public/
COPY packages/shared-schemas/tsconfig.json ./packages/shared-schemas/

# Copy source code for shared packages (needed to build them)
COPY packages/shared-schemas/src ./packages/shared-schemas/src

# Build the shared packages so they're available to api-polls-public
RUN npm run build --workspace=shared-schemas

# Source code will be mounted via volumes in docker-compose
# No need to copy it here since we want live reloading

# Expose port 3004
EXPOSE 3004

# Set the working directory to the api-polls-public package
WORKDIR /app/packages/api-polls-public

# Start in development mode with watch mode for live reloading
CMD ["npm", "run", "start:dev"]

###################
# PRODUCTION STAGE
# This stage creates the final lightweight image with only what's needed to run
###################
FROM node:20-alpine AS production

# Set the working directory
WORKDIR /app

# Copy package files again
COPY package*.json ./
COPY packages/api-polls-public/package*.json ./packages/api-polls-public/
COPY packages/shared-schemas/package*.json ./packages/shared-schemas/

# Install ONLY production dependencies (no dev dependencies)
# --omit=dev skips devDependencies like TypeScript, tsx, etc.
RUN npm ci --omit=dev

# Copy the compiled JavaScript from the builder stage
# We're copying ONLY the dist folders, not the TypeScript source
COPY --from=builder /app/packages/api-polls-public/dist ./packages/api-polls-public/dist
COPY --from=builder /app/packages/shared-schemas/dist ./packages/shared-schemas/dist

# Expose port 3004
# This documents which port the app listens on (doesn't actually publish it)
EXPOSE 3004

# Set the working directory to the api-polls-public package
WORKDIR /app/packages/api-polls-public

# Start the application
# This runs the compiled JavaScript version
CMD ["npm", "start"]

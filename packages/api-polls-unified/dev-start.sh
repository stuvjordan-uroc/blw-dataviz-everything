#!/bin/bash

# Development startup script for unified polls API
# This script starts the unified API in development mode with auto-reload

echo "🚀 Starting Unified Polls API in development mode..."

# Navigate to the unified package directory
cd "$(dirname "$0")"

# Start with ts-node in watch mode
npm run start:dev:watch

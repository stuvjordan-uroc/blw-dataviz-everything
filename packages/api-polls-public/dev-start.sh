#!/bin/sh

# Auto-discover and start watch mode for all workspace packages with build:watch script
echo "🔍 Discovering workspace packages with build:watch..."

# Get all workspace packages
WORKSPACES=$(npm query .workspace | grep -o '"name":"[^"]*"' | cut -d'"' -f4)

# Start watch mode for each package that has build:watch script (excluding api-polls-public)
for workspace in $WORKSPACES; do
  if [ "$workspace" != "api-polls-public" ]; then
    # Check if package has build:watch script
    HAS_WATCH=$(npm run --workspace="$workspace" 2>&1 | grep -c "build:watch")
    if [ "$HAS_WATCH" -gt 0 ]; then
      echo "🔄 Starting watch mode for $workspace..."
      npm run build:watch --workspace="$workspace" &
    fi
  fi
done

# Wait for dependencies to build initially
echo "⏳ Waiting 5 seconds for dependencies to build..."
sleep 5

# Start this API in development mode
echo "🚀 Starting api-polls-public in development mode..."
npm run start:dev

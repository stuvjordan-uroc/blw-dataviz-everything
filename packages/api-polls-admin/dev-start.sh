#!/bin/sh

# Auto-discover and start watch mode for all workspace packages with build:watch script
echo "🔍 Discovering workspace packages with build:watch..."

# Get all workspace packages
WORKSPACES=$(npm query .workspace | grep -o '"name":"[^"]*"' | cut -d'"' -f4)

# Start watch mode for each package that has build:watch script (excluding api-polls-admin)
for workspace in $WORKSPACES; do
  if [ "$workspace" != "api-polls-admin" ]; then
    # Check if package has build:watch script
    HAS_WATCH=$(npm run --workspace="$workspace" 2>&1 | grep -c "build:watch")
    if [ "$HAS_WATCH" -gt 0 ]; then
      echo "🔄 Starting watch mode for $workspace..."
      npm run build:watch --workspace="$workspace" &
    fi
  fi
done

# Wait a moment for initial builds to complete
sleep 3

# Start the main application with ts-node via nodemon for auto-reload
echo "🚀 Starting api-polls-admin..."
cd /app/packages/api-polls-admin
npx nodemon --watch src --ext ts --exec "ts-node --transpile-only src/main.ts"

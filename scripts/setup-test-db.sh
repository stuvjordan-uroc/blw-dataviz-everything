#!/bin/bash
# Setup Test Database
# 
# This script creates the test database if it doesn't exist.
# The test database is automatically populated with migrations when tests run.

set -e

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Extract database details from TEST_DATABASE_URL or use defaults
TEST_DB_NAME="${TEST_DB_NAME:-blw_dataviz_test}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-password}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"

echo "🔧 Setting up test database: ${TEST_DB_NAME}"

# Check if PostgreSQL is running
if ! docker ps | grep -q blw-postgres; then
  echo "❌ PostgreSQL container is not running!"
  echo "   Start it with: npm run db:start"
  exit 1
fi

# Create test database if it doesn't exist
echo "📦 Creating test database..."
docker exec blw-postgres psql -U "${POSTGRES_USER}" -tc \
  "SELECT 1 FROM pg_database WHERE datname = '${TEST_DB_NAME}'" | \
  grep -q 1 || \
  docker exec blw-postgres psql -U "${POSTGRES_USER}" -c \
  "CREATE DATABASE ${TEST_DB_NAME}"

echo "✅ Test database ready!"
echo ""
echo "You can now run integration tests with:"
echo "  npm run test:integration"

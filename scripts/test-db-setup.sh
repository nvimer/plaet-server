#!/bin/bash

# Script to setup test database using Docker
# This script creates and manages a separate PostgreSQL database for testing

set -e

CONTAINER_NAME="sazonarte-test-db"
COMPOSE_FILE="docker-compose.test.yml"

echo "🧪 Setting up test database..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running. Please start Docker and try again."
  exit 1
fi

# Function to start test database
start_db() {
  echo "🚀 Starting test database container..."
  docker compose -f $COMPOSE_FILE up -d
  
  echo "⏳ Waiting for database to be ready..."
  sleep 3
  
  # Wait for PostgreSQL to be ready
  until docker exec $CONTAINER_NAME pg_isready -U postgres > /dev/null 2>&1; do
    echo "   Waiting for PostgreSQL..."
    sleep 1
  done
  
  echo "✅ Test database is ready!"
  echo "   Connection: postgresql://postgres:test_password@localhost:5433/sazonarte_test"
}

# Function to stop test database
stop_db() {
  echo "🛑 Stopping test database container..."
  docker compose -f $COMPOSE_FILE down
  echo "✅ Test database stopped"
}

# Function to reset test database
reset_db() {
  echo "🔄 Resetting test database..."
  docker compose -f $COMPOSE_FILE down -v
  docker compose -f $COMPOSE_FILE up -d
  
  echo "⏳ Waiting for database to be ready..."
  sleep 3
  
  until docker exec $CONTAINER_NAME pg_isready -U postgres > /dev/null 2>&1; do
    echo "   Waiting for PostgreSQL..."
    sleep 1
  done
  
  echo "✅ Test database reset complete"
}

# Function to run migrations on test database
migrate_db() {
  echo "📦 Running migrations on test database..."
  export DATABASE_URL="postgresql://postgres:test_password@localhost:5433/sazonarte_test"
  npx prisma migrate deploy
  echo "✅ Migrations completed"
}

# Function to show database status
status_db() {
  if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "✅ Test database is running"
    docker ps --filter "name=${CONTAINER_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
  else
    echo "❌ Test database is not running"
  fi
}

# Main command handler
case "${1:-}" in
  start)
    start_db
    ;;
  stop)
    stop_db
    ;;
  reset)
    reset_db
    ;;
  migrate)
    migrate_db
    ;;
  status)
    status_db
    ;;
  *)
    echo "Usage: $0 {start|stop|reset|migrate|status}"
    echo ""
    echo "Commands:"
    echo "  start   - Start the test database container"
    echo "  stop    - Stop the test database container"
    echo "  reset   - Reset the test database (removes all data)"
    echo "  migrate - Run Prisma migrations on test database"
    echo "  status  - Show test database status"
    exit 1
    ;;
esac

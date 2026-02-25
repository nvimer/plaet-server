#!/bin/bash

# Script to resolve failed migrations in production (Railway)
# Use this when you get Error: P3009

set -e

if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL environment variable is not set."
  echo "Usage: DATABASE_URL=your_prod_url ./scripts/railway-resolve-migration.sh"
  exit 1
fi

MIGRATION_NAME="20260224035315_add_multi_tenant_support"

echo "🚀 Attempting to resolve failed migration: $MIGRATION_NAME"
echo ""

# We mark it as applied if we know the schema was eventually corrected 
# or if we are going to run a fix afterwards.
# In this case, marking it as rolled-back allows 'migrate deploy' to try again 
# BUT if it failed because of NOT NULL constraints on non-empty tables, 
# it will just fail again.

echo "📋 Marking migration as rolled-back to allow a clean retry or deploy..."
npx prisma migrate resolve --rolled-back "$MIGRATION_NAME"

echo ""
echo "✅ Resolution command completed."
echo "🔄 Now you can try to deploy again or run 'npx prisma migrate deploy'."

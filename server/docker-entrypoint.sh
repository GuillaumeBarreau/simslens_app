#!/bin/sh
set -e

echo "🚀 Starting Droptimizer Server..."

# Generate Prisma Client only if not already pre-built in the image
if [ ! -d "/app/node_modules/.prisma/client" ]; then
  echo "📦 Generating Prisma Client..."
  npx prisma generate
else
  echo "📦 Prisma Client already generated in image, skipping."
fi

# Apply migrations with automatic baseline for existing databases
echo "🔄 Applying database migrations..."
if npx prisma migrate deploy 2>&1 | grep -q "P3005"; then
  echo "⚠️  Existing database detected without migration history"
  echo "🔧 Baselining existing schema..."
  
  # Mark all existing migrations as applied (baseline)
  for migration in /app/prisma/migrations/*/; do
    migration_name=$(basename "$migration")
    if [ "$migration_name" != "migration_lock.toml" ]; then
      echo "  ✓ Marking $migration_name as applied"
      npx prisma migrate resolve --applied "$migration_name" 2>/dev/null || true
    fi
  done
  
  # Now apply any new migrations
  echo "🔄 Applying new migrations..."
  npx prisma migrate deploy
else
  echo "✅ Migrations applied successfully"
fi

# Initialize data if requested
if [ "$INIT_DATA_ON_START" = "1" ] || [ "$INIT_DATA_ON_START" = "true" ]; then
  echo "🌱 Initializing database with seed data..."
  node ./dist/scripts/initData.js
fi

echo "✅ Startup complete, launching application..."

# Execute the main command (passed as arguments to this script)
exec "$@"

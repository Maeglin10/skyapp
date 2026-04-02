#!/usr/bin/env bash
set -e

echo "🚀 SkyApp Database Setup"
echo "========================"

# Check if docker compose is available
if ! command -v docker &> /dev/null; then
  echo "❌ Docker not found. Please install Docker first."
  exit 1
fi

echo "📦 Starting PostgreSQL + pgvector..."
docker compose up -d postgres

echo "⏳ Waiting for PostgreSQL to be ready..."
until docker compose exec -T postgres pg_isready -U skyapp &>/dev/null; do
  sleep 1
done
echo "✅ PostgreSQL is ready!"

echo "🗃️  Running Prisma migrations..."
npx prisma migrate deploy

echo "🌱 Seeding database..."
npm run db:seed

echo ""
echo "✅ Database setup complete!"
echo "   DATABASE_URL=postgresql://skyapp:skyapp@localhost:5432/skyapp"

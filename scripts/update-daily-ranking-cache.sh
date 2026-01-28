#!/bin/bash

# Daily Ranking Cache Update Script
# Usage: ./scripts/update-daily-ranking-cache.sh

echo "📊 Updating daily ranking cache..."

# Load VERCEL_URL and CRON_SECRET from .env.local
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
fi

# Check if required environment variables are set
if [ -z "$VERCEL_URL" ]; then
  echo "❌ Error: VERCEL_URL not set"
  echo "Please set VERCEL_URL in .env.local or run:"
  echo "  VERCEL_URL=https://your-deployment.vercel.app ./scripts/update-daily-ranking-cache.sh"
  exit 1
fi

if [ -z "$CRON_SECRET" ]; then
  echo "❌ Error: CRON_SECRET not set"
  echo "Please set CRON_SECRET in .env.local"
  exit 1
fi

# Update daily ranking cache
echo "Calling: POST $VERCEL_URL/api/cron/ranking/daily"

response=$(curl -L -X POST "$VERCEL_URL/api/cron/ranking/daily" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -w "\n%{http_code}" \
  -s)

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

echo ""
echo "HTTP Status: $http_code"
echo "Response:"
echo "$body" | jq '.' 2>/dev/null || echo "$body"

if [ "$http_code" = "200" ]; then
  echo ""
  echo "✅ Daily ranking cache updated successfully!"
  exit 0
else
  echo ""
  echo "❌ Daily ranking cache update failed"
  exit 1
fi

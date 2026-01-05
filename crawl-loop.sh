#!/bin/bash
# VocaDB Crawler Loop Script

CRON_SECRET="I7NdSq2hIxKJedau1rA0//nP6wokwMZ5VzMxJF2/Htk="
API_URL="http://localhost:3000"

echo "🚀 Starting VocaDB crawler loop..."
echo ""

batch=1
total_processed=0
total_inserted=0

while true; do
    echo "📦 Batch #$batch"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    response=$(curl -s -X POST "$API_URL/api/cron/vocadb" \
        -H "Authorization: Bearer $CRON_SECRET")

    if [ $? -ne 0 ]; then
        echo "❌ Curl failed"
        break
    fi

    success=$(echo $response | grep -o '"success":true')

    if [ -z "$success" ]; then
        echo "❌ Crawler failed:"
        echo "$response"
        break
    fi

    processed=$(echo $response | grep -o '"songsProcessed":[0-9]*' | grep -o '[0-9]*')
    inserted=$(echo $response | grep -o '"songsInserted":[0-9]*' | grep -o '[0-9]*')
    skipped=$(echo $response | grep -o '"songsSkipped":[0-9]*' | grep -o '[0-9]*')
    completed=$(echo $response | grep -o '"completed":true')

    total_processed=$((total_processed + processed))
    total_inserted=$((total_inserted + inserted))

    echo "   Processed: $processed songs"
    echo "   Inserted: $inserted songs"
    echo "   Skipped: $skipped songs"
    echo ""
    echo "📊 Total: $total_processed processed, $total_inserted inserted"
    echo ""

    if [ -n "$completed" ]; then
        echo "✅ Crawl completed!"
        break
    fi

    batch=$((batch + 1))
    echo "⏳ Waiting 2 seconds..."
    echo ""
    sleep 2
done

echo ""
echo "==================================================  "
echo "🎉 FINAL RESULTS"
echo "==================================================  "
echo "Total batches: $batch"
echo "Total processed: $total_processed"
echo "Total inserted: $total_inserted"
echo "=================================================="

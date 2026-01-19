#!/bin/bash

# GitHub Actions에서 사용하는 것과 동일한 로직 테스트

body='{"success":true,"message":"Unified YouTube crawler completed successfully","data":{"mode":"all","updateLocalizations":true,"pvsProcessed":2000,"pvsUpdated":1704,"titlesUpdated":50,"pvsFailed":296,"last_offset":0,"completed":false,"duration":"38.4s"}}'

echo "Response body:"
echo "$body"
echo ""

echo "Testing grep pattern:"
if echo "$body" | grep -q '"completed":true'; then
  echo "✅ MATCHED: completed is true"
else
  echo "❌ NOT MATCHED: completed is NOT true"
  echo "This should trigger the next round..."
fi

echo ""
echo "Let's check what grep finds:"
echo "$body" | grep -o '"completed":[^,}]*'

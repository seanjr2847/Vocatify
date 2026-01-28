# Daily Ranking Cache Update Script (PowerShell)
# Usage: .\scripts\update-daily-ranking-cache.ps1

Write-Host "📊 Updating daily ranking cache..." -ForegroundColor Cyan

# Load environment variables from .env.local
if (Test-Path .env.local) {
    Get-Content .env.local | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

# Get environment variables
$VERCEL_URL = $env:VERCEL_URL
$CRON_SECRET = $env:CRON_SECRET

# Check if required environment variables are set
if (-not $VERCEL_URL) {
    Write-Host "❌ Error: VERCEL_URL not set" -ForegroundColor Red
    Write-Host "Please set VERCEL_URL in .env.local or run:" -ForegroundColor Yellow
    Write-Host '  $env:VERCEL_URL="https://your-deployment.vercel.app"; .\scripts\update-daily-ranking-cache.ps1' -ForegroundColor Yellow
    exit 1
}

if (-not $CRON_SECRET) {
    Write-Host "❌ Error: CRON_SECRET not set" -ForegroundColor Red
    Write-Host "Please set CRON_SECRET in .env.local" -ForegroundColor Yellow
    exit 1
}

# Update daily ranking cache
Write-Host "Calling: POST $VERCEL_URL/api/cron/ranking/daily"

try {
    $headers = @{
        "Authorization" = "Bearer $CRON_SECRET"
        "Content-Type" = "application/json"
    }

    $response = Invoke-WebRequest -Uri "$VERCEL_URL/api/cron/ranking/daily" `
        -Method POST `
        -Headers $headers `
        -UseBasicParsing

    Write-Host ""
    Write-Host "HTTP Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response:"
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10

    if ($response.StatusCode -eq 200) {
        Write-Host ""
        Write-Host "✅ Daily ranking cache updated successfully!" -ForegroundColor Green
        exit 0
    }
} catch {
    Write-Host ""
    Write-Host "HTTP Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "❌ Daily ranking cache update failed" -ForegroundColor Red
    exit 1
}

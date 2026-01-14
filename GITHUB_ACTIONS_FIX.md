# GitHub Actions Database Connection Fix

## Problem

GitHub Actions workflow failing with:
```
Can't reach database server at `ep-falling-resonance-ahi8yvf4-pooler.c-3.us-east-1.aws.neon.tech:5432`
```

## Root Cause

The `DATABASE_URL` secret in GitHub needs to be updated with the new connection format that includes `pgbouncer=true`.

## Solution: Update GitHub Repository Secrets

### Step 1: Go to GitHub Repository Settings

1. Navigate to your repository: https://github.com/YOUR_USERNAME/Vocatify
2. Click **Settings** (top right)
3. In left sidebar, click **Secrets and variables** → **Actions**

### Step 2: Update DATABASE_URL Secret

Find the `DATABASE_URL` secret and update it to:

```
postgresql://neondb_owner:npg_IL2HcUfuR6FG@ep-falling-resonance-ahi8yvf4-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connect_timeout=10
```

**Important Changes:**
- ✅ Added `pgbouncer=true` (required for Neon PgBouncer pooler)
- ✅ Added `connect_timeout=10` (connection establishment timeout)
- ❌ Removed `connection_limit=100` (not supported by PgBouncer)
- ❌ Removed `pool_timeout=0` (not supported by PgBouncer)

### Step 3: Verify Other Secrets

Make sure these secrets are also set:
- ✅ `YOUTUBE_API_KEY` - Your YouTube Data API v3 key
- ✅ `CRON_SECRET` - Your cron endpoint authorization token
- ✅ `VERCEL_URL` - Your Vercel deployment URL (e.g., https://vocatify.vercel.app)

### Step 4: Test the Workflow

#### Option A: Manual Trigger (Recommended)
1. Go to **Actions** tab in your repository
2. Select **Daily Crawlers** workflow
3. Click **Run workflow** dropdown
4. Select `youtube` or `vocadb`
5. Click **Run workflow** button
6. Monitor the job logs

#### Option B: Wait for Scheduled Run
- VocaDB crawler: Daily at 2:00 AM UTC (11:00 AM KST)
- YouTube crawler: Daily at 15:00 UTC (00:00 KST, 자정)

## Additional Neon Configuration (If Connection Still Fails)

### Check IP Allowlist in Neon Dashboard

If GitHub Actions still can't connect after updating the secret:

1. Log into Neon dashboard: https://console.neon.tech
2. Select your project
3. Go to **Settings** → **IP Allow**
4. Check if IP restrictions are enabled

**Options:**
- **Option 1 (Recommended)**: Disable IP restrictions
  - Relies on authentication (username/password) only
  - Easier for CI/CD

- **Option 2**: Add GitHub Actions IP ranges
  - More secure but requires maintenance
  - GitHub Actions IPs: https://api.github.com/meta → `actions` field
  - Warning: GitHub's IP ranges change frequently!

### Verify Connection from GitHub Actions

Add a test step to your workflow to debug connection issues:

```yaml
- name: Test Database Connection
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
  run: |
    npx prisma db execute --stdin <<EOF
    SELECT 1;
    EOF
```

## Workflow Architecture

Your GitHub Actions workflow uses **2 different approaches**:

### 1. VocaDB Crawler (HTTP API Call)
```yaml
- Runs: curl POST to /api/cron/vocadb
- Connects: GitHub → Vercel → Neon
- DATABASE_URL: Used by Vercel serverless function
```

### 2. YouTube Crawler (Direct Database)
```yaml
- Runs: npx tsx scripts/youtube/update-chunked.ts
- Connects: GitHub → Neon (direct)
- DATABASE_URL: Used by GitHub Actions runner
- Strategy: 10 parallel jobs (matrix)
```

**Why Direct Connection?**
- The YouTube crawler processes 200K+ songs
- Too large for Vercel's 60-second function limit
- Runs as 10 parallel jobs (4-hour timeout each)

## Troubleshooting Checklist

- [ ] Updated DATABASE_URL in GitHub Secrets with `pgbouncer=true`
- [ ] Verified YOUTUBE_API_KEY is set in GitHub Secrets
- [ ] Verified CRON_SECRET is set in GitHub Secrets
- [ ] Checked Neon IP allowlist (disabled or includes GitHub IPs)
- [ ] Tested manual workflow trigger
- [ ] Verified database is accessible from external IPs

## Common Errors and Solutions

### Error: "Can't reach database server"
**Solution:** Update DATABASE_URL in GitHub Secrets (see above)

### Error: "Invalid connection string"
**Solution:** Ensure DATABASE_URL has format:
```
postgresql://user:pass@host/db?sslmode=require&pgbouncer=true&connect_timeout=10
```

### Error: "Authentication failed"
**Solution:** Check username/password in DATABASE_URL
- Get from Neon dashboard: Settings → Connection Details

### Error: "Too many connections"
**Solution:** The new `pgbouncer=true` parameter should fix this
- PgBouncer handles connection pooling automatically

### Error: "Matrix job failed: Chunk X"
**Solution:** Individual chunk failures are OK (fail-fast: false)
- Check logs for specific error
- Failed chunks will retry on next scheduled run

## Security Best Practices

### Rotating Secrets

If you need to rotate DATABASE_URL:
1. Get new connection string from Neon dashboard
2. Add `?sslmode=require&pgbouncer=true&connect_timeout=10`
3. Update in both:
   - GitHub Secrets (for Actions)
   - Vercel Environment Variables (for serverless)
   - Local `.env` (for development)

### Protecting Sensitive Data

GitHub Secrets are encrypted and:
- ✅ Never appear in workflow logs
- ✅ Accessible only to workflow runs
- ✅ Cannot be viewed after creation (only updated)
- ❌ Not accessible in forks (protects against PR attacks)

## Monitoring Workflow Runs

### View Recent Runs
1. Go to **Actions** tab
2. Select **Daily Crawlers** workflow
3. View run history and logs

### Workflow Notifications
Enable notifications for workflow failures:
1. GitHub Settings (personal) → Notifications
2. Actions → Check "Failed workflows only"
3. Choose email or web notifications

### Vercel Cron Logs
For VocaDB crawler (HTTP API approach):
1. Vercel Dashboard → Your Project
2. Logs tab → Filter by `/api/cron/vocadb`
3. Check for errors or successes

## Expected Behavior After Fix

### Successful VocaDB Crawler Run
```json
{
  "success": true,
  "message": "VocaDB crawler completed successfully",
  "data": {
    "songsProcessed": 1000,
    "songs_inserted": 150,
    "songs_skipped": 850,
    "completed": false,
    "duration": "45.2s"
  }
}
```

### Successful YouTube Crawler Run (Per Chunk)
```
✅ Chunk 4/10 completed successfully
📊 Statistics:
  - Songs in range: 20,543
  - PVs processed: 18,234
  - PVs updated: 17,891
  - Titles updated: 12,456
  - Failed: 343
⏱️  Duration: 187.3s
```

## Next Steps

1. **Immediate:** Update DATABASE_URL in GitHub Secrets
2. **Verify:** Run manual workflow trigger to test
3. **Monitor:** Check next scheduled run succeeds
4. **Optimize:** Consider moving to full API-based approach (remove direct DB access)

## Migration to API-Only Approach (Future)

To eliminate direct database access from GitHub Actions:

### Current Architecture:
```
GitHub Actions → Neon (direct connection)
```

### Proposed Architecture:
```
GitHub Actions → Vercel Cron API → Neon (pooled)
```

**Benefits:**
- ✅ Single DATABASE_URL configuration (Vercel only)
- ✅ Consistent connection pooling
- ✅ Better security (no DB credentials in GitHub)
- ✅ Easier to maintain

**Implementation:**
- Modify YouTube crawler to support chunked execution via API
- Add chunk index parameter to `/api/cron/youtube?chunk=4`
- Update GitHub workflow to call API instead of running script

Would you like me to implement this API-based approach?

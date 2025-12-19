# PostgreSQL Setup for Vercel Deployment

## Recommended: Neon (Serverless PostgreSQL)

Neon is recommended for Vercel deployments due to:
- ✅ Serverless architecture (perfect for Vercel)
- ✅ Generous free tier (0.5GB storage, 10GB transfer/month)
- ✅ Excellent Vercel integration
- ✅ Automatic connection pooling
- ✅ Instant database branching

## Quick Setup (5 minutes)

### 1. Create Neon Account

Visit: https://console.neon.tech/signup

1. Sign up with GitHub (recommended) or email
2. Verify your email if needed

### 2. Create Project

1. Click **"Create a project"**
2. Project settings:
   - **Name**: `vocatify` (or any name you prefer)
   - **Region**: Choose closest to your users (e.g., `Asia Pacific (Singapore)` for Korean users)
   - **PostgreSQL version**: 16 (latest)
3. Click **"Create project"**

### 3. Get Connection String

After project creation, you'll see the connection details:

```
Connection string:
postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require
```

**Important**: Copy this string immediately - the password is only shown once!

### 4. Update .env File

Replace the DATABASE_URL in your `.env` file:

```env
DATABASE_URL="postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require"
```

**DO NOT commit this to git** - it contains your password!

### 5. Test Connection

Run in your terminal:

```bash
# This will validate your connection string
npx prisma db pull
```

If successful, you'll see:
```
✔ Introspected 0 models and wrote them into prisma\schema.prisma
```

## Running Migrations

Once DATABASE_URL is configured:

```bash
# Create migration and apply to database
npx prisma migrate dev --name init_vocatify_schema

# Generate Prisma Client
npx prisma generate
```

## Connection String Format

```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
```

- **USER**: Your Neon username (usually starts with your project name)
- **PASSWORD**: Auto-generated password (shown once)
- **HOST**: Neon endpoint (format: `ep-xxx-xxx.region.aws.neon.tech`)
- **PORT**: 5432 (default PostgreSQL port)
- **DATABASE**: `neondb` (Neon's default database name)
- **sslmode=require**: Required for secure connections

## Neon Dashboard Features

### Database Browser
- View tables and data directly in browser
- Run SQL queries
- Monitor database size

### Connection Pooling
Neon automatically provides connection pooling, important for serverless:

```
# Pooled connection (use for Vercel)
postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require&pgbouncer=true
```

### Branching
Create database branches for development:
```bash
# In Neon dashboard, create a "dev" branch
# Get separate connection string for development
```

## Vercel Integration

### Environment Variables

In Vercel Dashboard:

1. Go to your project → **Settings** → **Environment Variables**
2. Add:
   ```
   Name: DATABASE_URL
   Value: postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require&pgbouncer=true
   Environments: Production, Preview, Development
   ```

3. Add CRON_SECRET (for API authentication):
   ```
   Name: CRON_SECRET
   Value: [generate random 32-char string]
   Environments: Production
   ```

Generate CRON_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Connection Limit

For Vercel, limit Prisma connections:

Update `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  // Add connection_limit for serverless
  // url      = env("DATABASE_URL") + "?connection_limit=10"
}
```

**Note**: Connection limit should be configured in DATABASE_URL itself:
```
postgresql://...?sslmode=require&connection_limit=10&pool_timeout=0
```

## Alternative Providers

### Supabase (if you want more features)

1. Visit: https://supabase.com/dashboard
2. Create project
3. Get connection string from **Settings** → **Database**
4. Format: `postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres`

**Pros**:
- Free tier: 500MB database
- Includes Auth, Storage, Realtime
- Generous API limits

**Cons**:
- Slightly more complex than Neon
- Larger free tier but with more features you may not need

### Railway (if you prefer simpler pricing)

1. Visit: https://railway.app/
2. Create project → **Add PostgreSQL**
3. Get connection string from **Variables** tab

**Pros**:
- Simple usage-based pricing
- Easy to use

**Cons**:
- No free tier (pay as you go)
- $5 minimum

### Local PostgreSQL (for development only)

**Windows Installation**:

1. Download: https://www.postgresql.org/download/windows/
2. Run installer, follow wizard
3. Remember the password you set for `postgres` user
4. Connection string:
   ```
   DATABASE_URL="postgresql://postgres:your_password@localhost:5432/vocatify"
   ```

**Create database**:
```sql
-- In psql or pgAdmin
CREATE DATABASE vocatify;
```

## Troubleshooting

### "SSL connection required"
Add `?sslmode=require` to connection string

### "Connection timeout"
Check:
1. DATABASE_URL is correct
2. No firewall blocking port 5432
3. Neon endpoint is accessible from your network

### "Too many connections"
Add connection limit:
```
?connection_limit=10&pool_timeout=0
```

### "Database does not exist"
Neon creates `neondb` by default. Use that or create your database:
```sql
CREATE DATABASE vocatify;
```

Then update connection string to use `vocatify` instead of `neondb`.

## Next Steps

After PostgreSQL is set up:

1. ✅ Run migrations: `npx prisma migrate dev --name init_vocatify_schema`
2. ✅ Generate client: `npx prisma generate`
3. ✅ Migrate data from SQLite: `npm run db:migrate-to-postgresql` (coming next)
4. ✅ Test connection: `npx prisma studio` (opens GUI to browse database)

## Cost Estimate

**Neon Free Tier** (recommended):
- Storage: 0.5GB (sufficient for ~500K-1M songs)
- Transfer: 10GB/month
- Compute: Always available
- **Cost**: $0/month

**Neon Pro** (if you outgrow free tier):
- Storage: $0.000164/GB-hour (~$3.60/month for 1GB)
- Compute: $0.102/hour when active
- **Estimated cost**: ~$10-15/month for Vocatify usage

For 270K songs with metadata, expect ~200-300MB database size = **FREE** ✅

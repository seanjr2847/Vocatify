# Next Steps: PostgreSQL Migration & Vercel Deployment

This guide walks you through completing the PostgreSQL setup and preparing for Vercel deployment.

## ✅ Completed So Far

1. ✅ Prisma schema updated with:
   - `titleKorean`, `titleOriginal`, `defaultLanguage` fields
   - DateTime conversion for dates
   - `CrawlerProgress` model for chunked execution tracking

2. ✅ Data migration script created:
   - `scripts/db/migrate-to-postgresql.ts`
   - Handles batch processing, date conversion, validation

3. ✅ Documentation created:
   - [POSTGRESQL_SETUP.md](./POSTGRESQL_SETUP.md) - Complete PostgreSQL setup guide
   - [POSTGRESQL_MIGRATION.md](./POSTGRESQL_MIGRATION.md) - Migration reference

## 📋 Next Steps (In Order)

### Step 1: Set Up PostgreSQL Database (5 minutes)

**Recommended: Neon (Free tier, perfect for Vercel)**

1. **Create Neon account**: https://console.neon.tech/signup
   - Sign up with GitHub or email

2. **Create project**:
   - Name: `vocatify`
   - Region: `Asia Pacific (Singapore)` (recommended for Korean users)
   - PostgreSQL version: 16

3. **Copy connection string**:
   - After project creation, you'll see the connection string
   - Format: `postgresql://username:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`
   - ⚠️ **Copy immediately** - password is shown only once!

4. **Update .env file**:
   ```bash
   # Open .env and replace DATABASE_URL
   DATABASE_URL="postgresql://username:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require&connection_limit=10"
   ```

5. **Test connection**:
   ```bash
   npx prisma db pull
   ```
   Should show: `✔ Introspected 0 models`

**Full guide**: See [POSTGRESQL_SETUP.md](./POSTGRESQL_SETUP.md) for detailed instructions

---

### Step 2: Run Prisma Migration (1 minute)

This creates the database tables based on your Prisma schema.

```bash
# Create and apply migration
npx prisma migrate dev --name init_vocatify_schema

# Generate Prisma Client
npx prisma generate
```

**Expected output**:
```
✔ Generated Prisma Client
✔ Migration applied: 20241219_init_vocatify_schema
```

**What this does**:
- Creates `songs` table with all fields including `titleKorean`
- Creates `daily_view_counts` table
- Creates `crawler_progress` table
- Adds all indexes for performance

---

### Step 3: Migrate Data from SQLite (5-10 minutes)

Transfer your existing 270K songs from SQLite to PostgreSQL.

```bash
npm run db:migrate-to-postgresql
```

**Progress indicators**:
```
📦 Migrating Songs Table
Total songs to migrate: 276,999

📥 Reading batch: 0 - 10,000
  ✅ Inserted: 1,000/276,999 (0.4%) | 0.1min
  ✅ Inserted: 2,000/276,999 (0.7%) | 0.2min
  ...
✅ Songs migration complete: 276,999 records in 5.2 minutes

📦 Migrating DailyViewCounts Table
...

🔍 Validating Migration
Songs: SQLite=276,999, PostgreSQL=276,999
✅ Song count matches
```

**Expected duration**: 5-10 minutes for 270K songs

**What this does**:
- Reads SQLite data in 10K batches
- Converts date strings to DateTime objects
- Inserts into PostgreSQL in 1K batches
- Validates counts match
- Shows sample data

---

### Step 4: Verify Migration (1 minute)

Check that your data migrated correctly:

```bash
# Open Prisma Studio (database GUI)
npx prisma studio
```

This opens a web interface at http://localhost:5555 where you can:
- Browse all songs
- Check Korean titles are present
- Verify view counts
- Inspect daily_view_counts records

**Manual verification**:
1. Click "Song" in left sidebar
2. Check total count matches SQLite count
3. Look for some records with `titleKorean` populated
4. Verify `viewCount` and dates look correct

---

### Step 5: Update Application Code (Next phase)

After successful migration, we'll update your Next.js app to use PostgreSQL:

1. Replace SQLite database imports with Prisma
2. Update all database queries to use Prisma syntax
3. Test the application locally

**This will be done in the next phase of implementation.**

---

## 🔄 Current vs Future Database Usage

### Current (SQLite)
```typescript
// scripts/youtube/update-viewcounts.ts
import Database from 'better-sqlite3';
const db = new Database('data/vocadb/vocatify.db');
const songs = db.prepare('SELECT * FROM songs').all();
```

### Future (PostgreSQL + Prisma)
```typescript
// lib/crawlers/youtube-crawler.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const songs = await prisma.song.findMany();
```

**Benefits**:
- ✅ Type-safe queries (TypeScript autocomplete)
- ✅ Works on Vercel (serverless)
- ✅ Better performance with proper connection pooling
- ✅ Automatic migrations

---

## 🚀 After Migration Complete

Once your data is in PostgreSQL, we'll implement:

### Week 2: Chunked Crawlers
- `lib/crawlers/vocadb-crawler.ts` - VocaDB in 500-song chunks
- `lib/crawlers/youtube-crawler.ts` - YouTube in 2K-song chunks
- `lib/crawlers/localized-titles-crawler.ts` - Korean titles in 600-song chunks

### Week 3: Vercel API Routes
- `app/api/cron/vocadb/route.ts` - VocaDB cron endpoint
- `app/api/cron/youtube/route.ts` - YouTube cron endpoint
- `app/api/cron/localized/route.ts` - Korean titles cron endpoint

### Week 4: Deployment
- `vercel.json` - Cron schedules
- `.github/workflows/daily-crawlers.yml` - GitHub Actions orchestrator
- Environment variables in Vercel Dashboard

---

## 📊 Database Size Estimates

**Current SQLite database**: ~200-300MB

**PostgreSQL estimates**:
- 270K songs: ~150MB
- Indexes: ~50MB
- Daily view counts: ~20MB (grows ~500KB/day)
- **Total**: ~220MB

**Neon Free Tier**: 0.5GB (500MB) - plenty of room! ✅

---

## ⚠️ Important Notes

### DO NOT Commit These Files
```
.env                    # Contains your DATABASE_URL with password
data/vocadb/*.db       # SQLite databases (use PostgreSQL instead)
```

### Keep These in Git
```
.env.example           # Template for environment variables
prisma/schema.prisma   # Database schema definition
prisma/migrations/     # Migration history
```

### After Migration
- ✅ You can keep SQLite as backup
- ✅ But use PostgreSQL for all new operations
- ✅ Vercel deployment will only use PostgreSQL

---

## 🆘 Troubleshooting

### "Connection timeout"
- Check DATABASE_URL is correct
- Verify Neon project is active
- Check your internet connection

### "Migration failed: table already exists"
```bash
# Reset database (⚠️ deletes all data)
npx prisma migrate reset

# Then re-run migration
npx prisma migrate dev --name init_vocatify_schema
```

### "Count mismatch after migration"
```bash
# Re-run migration script (safe - skips duplicates)
npm run db:migrate-to-postgresql
```

### "SSL required" error
Add `?sslmode=require` to your DATABASE_URL

---

## 📞 Support

If you encounter issues:

1. Check [POSTGRESQL_SETUP.md](./POSTGRESQL_SETUP.md) for detailed troubleshooting
2. Verify .env file has correct DATABASE_URL
3. Test connection: `npx prisma db pull`
4. Check Neon dashboard for database status

---

## ✅ Ready to Proceed?

Execute these commands in order:

```bash
# 1. Set up Neon (manual - see Step 1)
# Update .env with your DATABASE_URL

# 2. Run migration
npx prisma migrate dev --name init_vocatify_schema
npx prisma generate

# 3. Migrate data
npm run db:migrate-to-postgresql

# 4. Verify
npx prisma studio
```

After these steps, you'll be ready for implementing the chunked crawlers and Vercel API routes! 🚀

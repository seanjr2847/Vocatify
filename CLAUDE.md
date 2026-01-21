# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vocatify is a Vocaloid YouTube chart system that automatically collects view counts from YouTube and visualizes real-time rankings. Built with Next.js 15 (App Router) and PostgreSQL (Prisma ORM), it aggregates data from VocaDB and YouTube Data API v3.

**Tech Stack**: Next.js 15, TypeScript, Prisma, PostgreSQL (Neon), Tailwind CSS, shadcn/ui

## Essential Commands

### Development
```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint
```

### Data Collection
```bash
# VocaDB Crawling (legacy SQLite scripts - replaced by cron jobs)
npm run crawl              # Full crawl (270K+ songs)
npm run crawl:test         # Test mode (50-100 songs)

# YouTube View Count Updates (legacy - use cron endpoints instead)
npm run youtube:new        # New songs (<30 days or never updated)
npm run youtube:old        # Old songs (not updated in 90 days)
npm run youtube:top        # Popular songs (>1M views or >100 favorites)
npm run youtube:all        # All songs ordered by last update

# Korean Titles from YouTube Localizations
npm run youtube:localized  # Fetch Korean titles

# Database Maintenance (legacy SQLite)
npm run db:add-daily       # Create daily_view_counts table
npm run db:seed-daily      # Initialize daily stats
npm run db:migrate-daily   # Migrate daily counts
```

### Prisma (PostgreSQL)
```bash
npm run postinstall        # Auto-runs after npm install (generates Prisma Client)
npx prisma generate        # Generate Prisma Client
npx prisma migrate dev     # Create and apply migrations
npx prisma studio          # Database GUI browser
npx prisma db push         # Push schema changes (development)
```

## Architecture

### Database Architecture (PostgreSQL + Prisma)

**Primary Models**:
- **Song**: Core song metadata (vocadbId, titles in multiple languages, artist, YouTube info, view counts)
- **DailyViewCount**: Time-series tracking of view counts (composite PK: songId + recordedDate)
- **CrawlerProgress**: Progress tracking for resumable chunked crawlers

**Key Design Decisions**:
- PostgreSQL with Prisma ORM (migrated from SQLite for Vercel serverless compatibility)
- BigInt support for view counts exceeding 2 billion
- Multi-language title support (English, Japanese, Romaji, Korean, Original)
- Artist type filtering (`artistType = 'Vocaloid'`) for all rankings
- Composite indexes for optimized ranking queries

**Database Location**:
- Production: Neon serverless PostgreSQL (configured via `DATABASE_URL`)
- Legacy: SQLite at `data/vocadb/vocatify.db` (deprecated)

### Application Architecture (Next.js App Router)

**Server Components** (`app/`):
- `page.tsx`: Main page - fetches initial ranking data server-side (SSR)
- `layout.tsx`: Root layout with font configuration (Noto Sans KR + Quicksand)

**Client Components** (`components/`):
- `HomeClient.tsx`: Main interactive client component
- `NavigationSection.tsx`: Chart section with real data
- `MusicPlayerSection.tsx`: YouTube player UI
- `ui/`: shadcn/ui Radix components

**API Routes** (`app/api/`):
```
ranking/
├── total/      # Total view count rankings
├── daily/      # Daily increase rankings (uses LAG window function)
├── weekly/     # Weekly increase rankings (7-day comparison)
└── new/        # New songs (<30 days, <5M views)

songs/
├── route.ts              # Song search endpoint
└── [vocadbId]/route.ts  # Song details + 30-day view history

stats/route.ts            # Overall statistics

cron/                     # Automated crawler endpoints (Vercel Cron + GitHub Actions)
├── vocadb/route.ts      # Daily VocaDB crawler (2:00 AM UTC)
├── youtube/route.ts     # Daily YouTube view updates (3:00 AM UTC)
└── localized/route.ts   # Weekly Korean title fetching (Sunday 4:00 AM UTC)
```

### Crawler System (lib/crawlers/)

**Modern Chunked Crawlers** (Production - PostgreSQL):
- `vocadb-crawler.ts`: Fetches new songs from VocaDB API (max 1000/execution)
  - **Date-based filtering**: Automatically queries only songs published after the latest `publish_date` in DB
  - **Initial crawl**: No date filter when DB is empty (fetches all songs)
  - **Incremental crawl**: Uses `afterDate` parameter to fetch only new songs
  - **Resume support**: Preserves original session's `afterDate` filter when resuming
- `youtube-crawler.ts`: Updates YouTube view counts (4 modes: new/old/top/all, max 500/execution)
- `localized-titles-crawler.ts`: Fetches Korean titles from YouTube (max 200/execution)

**Features**:
- Progress tracking with database-backed resume capability
- Chunk-based processing for serverless function limits
- Batch API requests (VocaDB: 100/request, YouTube: 50/request)
- Authorization via `CRON_SECRET` bearer token
- Intelligent date filtering for efficient incremental updates

**Legacy Scripts** (scripts/ - SQLite):
- `scripts/crawler/sqlite-crawler.ts`: Original SQLite crawler
- `scripts/youtube/update-viewcounts.ts`: Original YouTube updater
- `scripts/db/`: Database utility scripts

**Execution Schedule** (vercel.json + GitHub Actions):
```
Daily 2:00 AM UTC:  VocaDB crawler
Daily 3:00 AM UTC:  YouTube view counts
Weekly Sunday 4AM:  Korean titles
```

### Data Flow

```
VocaDB API → vocadb-crawler → PostgreSQL (songs table)
                                    ↓
YouTube API → youtube-crawler → update viewCount + viewCountUpdatedAt
                                    ↓
YouTube API → localized-titles → update titleKorean
                                    ↓
                            daily_view_counts (time-series)
                                    ↓
                            API routes (SQL queries with window functions)
                                    ↓
                            Next.js pages (SSR + client hydration)
```

### Ranking Query Pattern

All ranking functions in `lib/db.ts` use PostgreSQL window functions:
- `ROW_NUMBER() OVER (ORDER BY ...)` for ranking
- `LAG() OVER (PARTITION BY song_id ORDER BY recorded_date)` for daily increases
- `INTERVAL` date arithmetic for time-based filtering
- Always filter `artistType = 'Vocaloid'` for consistency

**Example** (daily ranking):
```sql
WITH daily_changes AS (
  SELECT song_id, total_views - LAG(total_views) OVER (...) as daily_increase
  FROM daily_view_counts WHERE recorded_date >= CURRENT_DATE - INTERVAL '2 days'
)
SELECT ROW_NUMBER() OVER (ORDER BY daily_increase DESC) as rank, ...
WHERE artist_type = 'Vocaloid'
```

## Development Guidelines

### When Adding Features

1. **Ranking Queries**: Always include `artistType = 'Vocaloid'` filter in WHERE clauses
2. **BigInt Handling**: YouTube view counts are BigInt - convert to Number/String for JSON serialization
3. **Multi-Language**: Use `titleKorean ?? titleEnglish ?? titleJapanese ?? title` for display priority
4. **Prisma Queries**: Prefer Prisma Client methods over raw SQL where possible for type safety
5. **Database Changes**: Always create migrations (`npx prisma migrate dev --name <description>`)

### When Modifying Crawlers

1. **Respect Limits**: VocaDB batch size = 100, YouTube batch size = 50 (API limit)
2. **Progress Tracking**: Update `CrawlerProgress` after each batch for resumability
3. **Error Handling**: Log errors to `errorMessage` but continue processing remaining items
4. **Authorization**: All cron endpoints require `Authorization: Bearer <CRON_SECRET>`

### Testing Cron Endpoints Locally

```bash
# Set CRON_SECRET in .env first
curl -X POST http://localhost:3000/api/cron/vocadb \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

curl -X POST "http://localhost:3000/api/cron/youtube?mode=new" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Check status (no auth required)
curl http://localhost:3000/api/cron/vocadb
```

## Environment Variables

Required in `.env`:
```env
# Database (Neon serverless PostgreSQL)
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require&pgbouncer=true"

# YouTube Data API v3 (https://console.cloud.google.com/apis/credentials)
YOUTUBE_API_KEY="..."

# Cron endpoint security (generate: openssl rand -base64 32)
CRON_SECRET="..."
```

## Common Patterns

### Reading Song Data
```typescript
import { getTotalRanking, getSongById } from '@/lib/db';

// Rankings always return RankingItem[] with rank property
const songs = await getTotalRanking(100, 0);

// Song details include all multi-language titles
const song = await getSongById(12345);
```

### API Route Structure
```typescript
import { NextRequest } from 'next/server';
import { getTotalRanking } from '@/lib/db';

export async function GET(request: NextRequest) {
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '100');
  const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0');

  const ranking = await getTotalRanking(limit, offset);

  // Convert BigInt to string for JSON serialization
  return Response.json(
    ranking.map(song => ({
      ...song,
      viewCount: song.viewCount?.toString(),
    }))
  );
}
```

### Crawler Progress Pattern
```typescript
import { prisma } from '@/lib/prisma';

// Check for running progress
const existing = await prisma.crawlerProgress.findFirst({
  where: { crawlerType: 'vocadb', status: 'running' },
});

// Create or resume
const progress = existing ?? await prisma.crawlerProgress.create({
  data: { crawlerType: 'vocadb', status: 'running', startedAt: new Date() },
});

// Update after batch
await prisma.crawlerProgress.update({
  where: { id: progress.id },
  data: { lastOffset: newOffset, totalProcessed: count },
});

// Mark complete
await prisma.crawlerProgress.update({
  where: { id: progress.id },
  data: { status: 'completed', completedAt: new Date() },
});
```

## Project-Specific Conventions

- **Language Priority**: Korean → English → Japanese → Romaji → Original title
- **Date Handling**: Use PostgreSQL `INTERVAL` for time calculations, not JavaScript Date math
- **Ranking Offset**: Front-end rankings are 1-indexed (rank = offset + idx + 1)
- **BigInt Serialization**: Always convert BigInt to string in API responses
- **Component Organization**: Server components in `app/`, client components in `components/`
- **API Response Format**: JSON with consistent structure, no XML or plain text
- **Font Loading**: Noto Sans KR (Korean) + Quicksand (English) via Google Fonts in layout.tsx

## Troubleshooting

### Database Connection Issues
- Check `DATABASE_URL` format includes `?sslmode=require&pgbouncer=true` for Neon
- Verify Prisma Client is generated: `npx prisma generate`
- For "too many connections": add `connection_limit=10` to DATABASE_URL

### Crawler Failures
- Check `crawler_progress` table for error messages
- Reset stuck crawlers: Delete running progress records
- Verify API keys are valid and have quota

### BigInt Serialization Errors
- Always convert to string before JSON.stringify(): `viewCount.toString()`
- Use `BigInt()` constructor when reading from JSON/query params

### Korean Font Not Loading
- Verify Google Fonts link in app/layout.tsx
- Check browser network tab for font loading
- Restart dev server to reload layout changes

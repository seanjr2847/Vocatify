# Vocatify API 명세서 v1.0

## 문서 정보
- **프로젝트**: Vocatify - 보컬로이드 YouTube 차트 API
- **API 버전**: v1
- **베이스 URL**: `https://vocatify.com/api` (프로덕션)
- **베이스 URL**: `http://localhost:3000/api` (개발)
- **프레임워크**: Next.js 14 App Router
- **인증**: API Key (Admin 엔드포인트만)
- **응답 형식**: JSON
- **작성일**: 2025-12-16

---

## 목차
1. [개요](#1-개요)
2. [인증](#2-인증)
3. [공통 응답 형식](#3-공통-응답-형식)
4. [에러 처리](#4-에러-처리)
5. [엔드포인트](#5-엔드포인트)
   - [랭킹 API](#51-랭킹-api)
   - [곡 API](#52-곡-api)
   - [차트 API](#53-차트-api)
   - [통계 API](#54-통계-api)
   - [관리자 API](#55-관리자-api)
   - [Cron API](#56-cron-api)
6. [타입 정의](#6-타입-정의)
7. [Rate Limiting](#7-rate-limiting)
8. [캐싱 전략](#8-캐싱-전략)
9. [예시 코드](#9-예시-코드)

---

## 1. 개요

### 1.1 API 아키텍처

```
Client (Browser/Mobile)
    ↓
Next.js API Routes (/api/*)
    ↓
Prisma ORM
    ↓
PostgreSQL Database
```

### 1.2 API 특징

- ✅ **RESTful 설계**: 명확한 리소스 기반 URL
- ✅ **타입 안전**: TypeScript + Zod 스키마 검증
- ✅ **캐싱**: Next.js 자동 캐싱 + Revalidate
- ✅ **에러 핸들링**: 일관된 에러 응답 구조
- ✅ **페이지네이션**: Cursor 기반 페이징 지원
- ✅ **필터링**: 다양한 쿼리 파라미터 지원

### 1.3 응답 시간 목표

| 엔드포인트 | 목표 응답시간 | 캐시 여부 |
|-----------|--------------|----------|
| GET /ranking/* | < 100ms | 5분 |
| GET /songs | < 150ms | 1분 |
| GET /song/[id] | < 200ms | 5분 |
| GET /chart/* | < 300ms | 5분 |
| POST /admin/* | < 2s | 없음 |

---

## 2. 인증

### 2.1 공개 엔드포인트 (인증 불필요)

```typescript
GET  /api/ranking/*      // 랭킹 조회
GET  /api/songs          // 곡 목록
GET  /api/songs/[id]     // 곡 상세
GET  /api/chart/*        // 차트 데이터
GET  /api/stats          // 통계
```

### 2.2 관리자 엔드포인트 (API Key 필요)

```typescript
POST /api/admin/*        // 관리 작업
POST /api/cron/*         // Cron 작업 (Vercel Cron Secret)
```

**인증 방법**:
```bash
# Header에 API Key 포함
curl -H "Authorization: Bearer YOUR_API_KEY" \
     https://vocatify.com/api/admin/sync
```

**환경 변수**:
```env
# .env
ADMIN_API_KEY=your_secret_admin_key_here
CRON_SECRET=your_cron_secret_here
```

**검증 로직**:
```typescript
// lib/auth.ts
export function validateAdminAuth(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  return token === process.env.ADMIN_API_KEY;
}
```

---

## 3. 공통 응답 형식

### 3.1 성공 응답

```typescript
interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}
```

**예시**:
```json
{
  "success": true,
  "data": [
    {
      "videoId": "dQw4w9WgXcQ",
      "title": "千本桜",
      "artist": "黒うさP",
      "viewCount": 1234567,
      "dailyIncrease": 12500,
      "rank": 1
    }
  ],
  "meta": {
    "page": 1,
    "limit": 100,
    "total": 1000
  }
}
```

### 3.2 에러 응답

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
```

**예시**:
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "곡을 찾을 수 없습니다",
    "details": {
      "videoId": "invalid_id"
    }
  }
}
```

---

## 4. 에러 처리

### 4.1 HTTP 상태 코드

| 코드 | 의미 | 사용 케이스 |
|------|------|------------|
| 200 | OK | 성공 |
| 201 | Created | 리소스 생성 성공 |
| 400 | Bad Request | 잘못된 요청 파라미터 |
| 401 | Unauthorized | 인증 실패 |
| 403 | Forbidden | 권한 없음 |
| 404 | Not Found | 리소스 없음 |
| 429 | Too Many Requests | Rate Limit 초과 |
| 500 | Internal Server Error | 서버 에러 |
| 503 | Service Unavailable | 일시적 서비스 중단 |

### 4.2 에러 코드

```typescript
enum ErrorCode {
  // 클라이언트 에러 (4xx)
  INVALID_REQUEST = 'INVALID_REQUEST',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // 서버 에러 (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
}
```

### 4.3 에러 핸들러

```typescript
// app/api/error-handler.ts
import { NextResponse } from 'next/server';

export function handleApiError(error: unknown) {
  console.error('API Error:', error);

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: '잘못된 요청 형식입니다',
          details: error.errors
        }
      },
      { status: 400 }
    );
  }

  if (error instanceof PrismaClientKnownRequestError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: '데이터베이스 오류가 발생했습니다'
        }
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '서버 오류가 발생했습니다'
      }
    },
    { status: 500 }
  );
}
```

---

## 5. 엔드포인트

### 5.1 랭킹 API

#### 5.1.1 일간 랭킹 조회

**요청**:
```http
GET /api/ranking/daily?page=1&limit=100&date=2024-12-16
```

**쿼리 파라미터**:
| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| page | number | ❌ | 1 | 페이지 번호 |
| limit | number | ❌ | 100 | 항목 수 (max: 100) |
| date | string | ❌ | 오늘 | 날짜 (YYYY-MM-DD) |

**응답**:
```typescript
interface DailyRankingResponse {
  success: true;
  data: RankingItem[];
  meta: {
    page: number;
    limit: number;
    date: string;
    total: number;
  };
}

interface RankingItem {
  rank: number;
  videoId: string;
  title: string;
  artist: string | null;
  thumbnailUrl: string | null;
  viewCount: number;
  dailyIncrease: number;
  rankChange: number | null;  // null = 신규, 0 = 변동없음
}
```

**예시 응답**:
```json
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "videoId": "dQw4w9WgXcQ",
      "title": "千本桜",
      "artist": "黒うさP feat. 初音ミク",
      "thumbnailUrl": "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
      "viewCount": 123456789,
      "dailyIncrease": 125000,
      "rankChange": 3
    },
    {
      "rank": 2,
      "videoId": "abc123xyz",
      "title": "メルト",
      "artist": "ryo",
      "thumbnailUrl": "https://i.ytimg.com/vi/abc123xyz/mqdefault.jpg",
      "viewCount": 98765432,
      "dailyIncrease": 98000,
      "rankChange": -1
    }
  ],
  "meta": {
    "page": 1,
    "limit": 100,
    "date": "2024-12-16",
    "total": 25000
  }
}
```

**구현 예시**:
```typescript
// app/api/ranking/daily/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(100),
  date: z.string().optional()
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, date } = querySchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      date: searchParams.get('date')
    });

    const targetDate = date ? new Date(date) : new Date();
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.dailyStat.findMany({
        where: {
          date: targetDate,
          song: { isActive: true }
        },
        orderBy: { dailyIncrease: 'desc' },
        skip,
        take: limit,
        include: {
          song: {
            select: {
              videoId: true,
              title: true,
              artist: true,
              thumbnailUrl: true
            }
          }
        }
      }),
      prisma.dailyStat.count({
        where: {
          date: targetDate,
          song: { isActive: true }
        }
      })
    ]);

    const rankings = data.map((item, index) => ({
      rank: skip + index + 1,
      videoId: item.song.videoId,
      title: item.song.title,
      artist: item.song.artist,
      thumbnailUrl: item.song.thumbnailUrl,
      viewCount: Number(item.viewCount),
      dailyIncrease: Number(item.dailyIncrease),
      rankChange: null // TODO: 계산 로직
    }));

    return NextResponse.json({
      success: true,
      data: rankings,
      meta: {
        page,
        limit,
        date: targetDate.toISOString().split('T')[0],
        total
      }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      }
    });

  } catch (error) {
    return handleApiError(error);
  }
}
```

#### 5.1.2 주간 랭킹 조회

**요청**:
```http
GET /api/ranking/weekly?page=1&limit=100
```

**쿼리 파라미터**:
| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| page | number | ❌ | 1 | 페이지 번호 |
| limit | number | ❌ | 100 | 항목 수 |

**응답**:
```typescript
interface WeeklyRankingResponse {
  success: true;
  data: WeeklyRankingItem[];
  meta: {
    page: number;
    limit: number;
    startDate: string;
    endDate: string;
    total: number;
  };
}

interface WeeklyRankingItem {
  rank: number;
  videoId: string;
  title: string;
  artist: string | null;
  thumbnailUrl: string | null;
  currentViewCount: number;
  weeklyIncrease: number;      // 7일 합산
  averageDailyIncrease: number; // 일평균
}
```

#### 5.1.3 월간 랭킹 조회

**요청**:
```http
GET /api/ranking/monthly?page=1&limit=100
```

**응답**: 주간과 동일, `weeklyIncrease` → `monthlyIncrease`

---

### 5.2 곡 API

#### 5.2.1 곡 목록 조회

**요청**:
```http
GET /api/songs?page=1&limit=20&search=千本桜&sortBy=viewCount
```

**쿼리 파라미터**:
| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| page | number | ❌ | 1 | 페이지 번호 |
| limit | number | ❌ | 20 | 항목 수 (max: 50) |
| search | string | ❌ | - | 검색어 (제목/아티스트) |
| sortBy | string | ❌ | viewCount | `viewCount`, `publishedAt`, `title` |
| order | string | ❌ | desc | `asc`, `desc` |

**응답**:
```typescript
interface SongsResponse {
  success: true;
  data: SongItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

interface SongItem {
  videoId: string;
  title: string;
  artist: string | null;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  currentViewCount: number | null;
  latestDailyIncrease: number | null;
}
```

**구현 예시**:
```typescript
// app/api/songs/route.ts
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const { page, limit, search, sortBy, order } = querySchema.parse({
    page: searchParams.get('page'),
    limit: searchParams.get('limit'),
    search: searchParams.get('search'),
    sortBy: searchParams.get('sortBy'),
    order: searchParams.get('order')
  });

  const skip = (page - 1) * limit;

  const where = {
    isActive: true,
    ...(search && {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { artist: { contains: search, mode: 'insensitive' } }
      ]
    })
  };

  const [songs, total] = await Promise.all([
    prisma.song.findMany({
      where,
      orderBy: { [sortBy]: order },
      skip,
      take: limit,
      include: {
        dailyStats: {
          orderBy: { date: 'desc' },
          take: 1
        }
      }
    }),
    prisma.song.count({ where })
  ]);

  const data = songs.map(song => ({
    videoId: song.videoId,
    title: song.title,
    artist: song.artist,
    thumbnailUrl: song.thumbnailUrl,
    publishedAt: song.publishedAt?.toISOString(),
    currentViewCount: song.dailyStats[0]
      ? Number(song.dailyStats[0].viewCount)
      : null,
    latestDailyIncrease: song.dailyStats[0]
      ? Number(song.dailyStats[0].dailyIncrease)
      : null
  }));

  return NextResponse.json({
    success: true,
    data,
    meta: {
      page,
      limit,
      total,
      hasMore: skip + limit < total
    }
  });
}
```

#### 5.2.2 곡 상세 조회

**요청**:
```http
GET /api/songs/[videoId]?range=30d
```

**쿼리 파라미터**:
| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| range | string | ❌ | 30d | `7d`, `30d`, `90d`, `all` |

**응답**:
```typescript
interface SongDetailResponse {
  success: true;
  data: {
    song: {
      videoId: string;
      title: string;
      artist: string | null;
      thumbnailUrl: string | null;
      publishedAt: string | null;
      vocadbId: number | null;
    };
    stats: {
      currentViewCount: number;
      dailyIncrease: number;
      weeklyIncrease: number;
      monthlyIncrease: number;
    };
    rankings: {
      daily: { rank: number | null; best: number | null };
      weekly: { rank: number | null; best: number | null };
      monthly: { rank: number | null; best: number | null };
    };
    history: DailyDataPoint[];
  };
}

interface DailyDataPoint {
  date: string;
  viewCount: number;
  dailyIncrease: number;
}
```

**예시 응답**:
```json
{
  "success": true,
  "data": {
    "song": {
      "videoId": "dQw4w9WgXcQ",
      "title": "千本桜",
      "artist": "黒うさP feat. 初音ミク",
      "thumbnailUrl": "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
      "publishedAt": "2011-09-17T12:00:00.000Z",
      "vocadbId": 3183
    },
    "stats": {
      "currentViewCount": 123456789,
      "dailyIncrease": 12500,
      "weeklyIncrease": 98000,
      "monthlyIncrease": 420000
    },
    "rankings": {
      "daily": { "rank": 3, "best": 1 },
      "weekly": { "rank": 5, "best": 2 },
      "monthly": { "rank": 12, "best": 4 }
    },
    "history": [
      {
        "date": "2024-11-16",
        "viewCount": 123444289,
        "dailyIncrease": 11000
      },
      {
        "date": "2024-11-17",
        "viewCount": 123456789,
        "dailyIncrease": 12500
      }
    ]
  }
}
```

#### 5.2.3 신곡 조회

**요청**:
```http
GET /api/songs/new?days=30&limit=100
```

**쿼리 파라미터**:
| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| days | number | ❌ | 30 | 최근 N일 (7, 30) |
| limit | number | ❌ | 100 | 항목 수 |
| sortBy | string | ❌ | viewCount | `viewCount`, `publishedAt` |

**응답**: `SongsResponse`와 동일

---

### 5.3 차트 API

#### 5.3.1 곡 차트 데이터 조회

**요청**:
```http
GET /api/chart/[videoId]?range=30d&type=viewCount
```

**쿼리 파라미터**:
| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| range | string | ❌ | 30d | `7d`, `30d`, `90d`, `all` |
| type | string | ❌ | viewCount | `viewCount`, `dailyIncrease` |

**응답**:
```typescript
interface ChartDataResponse {
  success: true;
  data: {
    videoId: string;
    title: string;
    dataPoints: ChartDataPoint[];
  };
}

interface ChartDataPoint {
  date: string;
  value: number;
}
```

**예시 응답**:
```json
{
  "success": true,
  "data": {
    "videoId": "dQw4w9WgXcQ",
    "title": "千本桜",
    "dataPoints": [
      { "date": "2024-11-16", "value": 123000000 },
      { "date": "2024-11-17", "value": 123012500 },
      { "date": "2024-11-18", "value": 123025000 }
    ]
  }
}
```

#### 5.3.2 여러 곡 비교 차트

**요청**:
```http
GET /api/chart/compare?videoIds=abc,def,ghi&range=30d
```

**쿼리 파라미터**:
| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| videoIds | string | ✅ | - | 쉼표로 구분 (최대 5개) |
| range | string | ❌ | 30d | `7d`, `30d`, `90d` |

**응답**:
```typescript
interface CompareChartResponse {
  success: true;
  data: {
    songs: {
      videoId: string;
      title: string;
      color: string; // 차트 색상 (hex)
    }[];
    dataPoints: {
      date: string;
      values: { [videoId: string]: number };
    }[];
  };
}
```

---

### 5.4 통계 API

#### 5.4.1 전체 통계 조회

**요청**:
```http
GET /api/stats
```

**응답**:
```typescript
interface StatsResponse {
  success: true;
  data: {
    totalSongs: number;
    activeSongs: number;
    newSongsToday: number;
    newSongsThisWeek: number;
    totalViewsTracked: number;
    lastUpdateAt: string;
    nextUpdateAt: string;
  };
}
```

**예시 응답**:
```json
{
  "success": true,
  "data": {
    "totalSongs": 25847,
    "activeSongs": 25620,
    "newSongsToday": 12,
    "newSongsThisWeek": 89,
    "totalViewsTracked": 15234567890,
    "lastUpdateAt": "2024-12-16T03:05:00.000Z",
    "nextUpdateAt": "2024-12-17T03:00:00.000Z"
  }
}
```

---

### 5.5 관리자 API

#### 5.5.1 VocaDB 동기화

**요청**:
```http
POST /api/admin/sync-vocadb
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "limit": 1000,
  "daysAgo": 7
}
```

**Body**:
```typescript
interface SyncVocaDBRequest {
  limit?: number;    // 최대 곡 수 (기본: 1000)
  daysAgo?: number;  // 최근 N일 (기본: 7)
}
```

**응답**:
```typescript
interface SyncResponse {
  success: true;
  data: {
    newSongs: number;
    updatedSongs: number;
    skippedSongs: number;
    errors: number;
  };
}
```

#### 5.5.2 조회수 수동 수집

**요청**:
```http
POST /api/admin/collect-views
Authorization: Bearer YOUR_API_KEY
```

**응답**:
```typescript
interface CollectResponse {
  success: true;
  data: {
    totalSongs: number;
    successCount: number;
    failedCount: number;
    duration: number; // ms
  };
}
```

#### 5.5.3 일별 집계 수동 실행

**요청**:
```http
POST /api/admin/aggregate-daily
Authorization: Bearer YOUR_API_KEY

{
  "date": "2024-12-16"
}
```

---

### 5.6 Cron API

#### 5.6.1 조회수 수집 Cron

**요청**:
```http
POST /api/cron/collect-views
Authorization: Bearer CRON_SECRET
```

**Vercel Cron 설정**:
```json
{
  "crons": [
    {
      "path": "/api/cron/collect-views",
      "schedule": "0 3 * * *"
    }
  ]
}
```

**구현**:
```typescript
// app/api/cron/collect-views/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Cron Secret 검증
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED' } },
      { status: 401 }
    );
  }

  try {
    const startTime = Date.now();

    // CrawlLog 시작
    const crawlLog = await prisma.crawlLog.create({
      data: {
        type: 'youtube_collect',
        status: 'running',
        startedAt: new Date()
      }
    });

    // 수집 로직
    const result = await collectAllViewCounts();

    // CrawlLog 완료
    await prisma.crawlLog.update({
      where: { id: crawlLog.id },
      data: {
        status: result.failedCount > 0 ? 'partial' : 'success',
        songsCount: result.successCount,
        message: `성공: ${result.successCount}, 실패: ${result.failedCount}`,
        finishedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        duration: Date.now() - startTime
      }
    });

  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR' } },
      { status: 500 }
    );
  }
}
```

#### 5.6.2 일별 집계 Cron

**요청**:
```http
POST /api/cron/daily-aggregate
```

**스케줄**: 매일 03:05 (조회수 수집 5분 후)

#### 5.6.3 VocaDB 동기화 Cron

**요청**:
```http
POST /api/cron/sync-vocadb
```

**스케줄**: 매일 04:00

---

## 6. 타입 정의

### 6.1 TypeScript 타입

```typescript
// types/api.ts

// ============================================
// Common Types
// ============================================
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
  hasMore?: boolean;
}

// ============================================
// Song Types
// ============================================
export interface Song {
  videoId: string;
  title: string;
  artist: string | null;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  vocadbId: number | null;
}

export interface SongWithStats extends Song {
  currentViewCount: number | null;
  latestDailyIncrease: number | null;
}

export interface SongDetail extends Song {
  stats: SongStats;
  rankings: SongRankings;
  history: DailyDataPoint[];
}

export interface SongStats {
  currentViewCount: number;
  dailyIncrease: number;
  weeklyIncrease: number;
  monthlyIncrease: number;
}

export interface SongRankings {
  daily: { rank: number | null; best: number | null };
  weekly: { rank: number | null; best: number | null };
  monthly: { rank: number | null; best: number | null };
}

// ============================================
// Ranking Types
// ============================================
export interface RankingItem {
  rank: number;
  videoId: string;
  title: string;
  artist: string | null;
  thumbnailUrl: string | null;
  viewCount: number;
  dailyIncrease: number;
  rankChange: number | null;
}

export interface WeeklyRankingItem extends Omit<RankingItem, 'dailyIncrease'> {
  weeklyIncrease: number;
  averageDailyIncrease: number;
}

// ============================================
// Chart Types
// ============================================
export interface ChartDataPoint {
  date: string;
  value: number;
}

export interface ChartData {
  videoId: string;
  title: string;
  dataPoints: ChartDataPoint[];
}

export interface CompareChartData {
  songs: {
    videoId: string;
    title: string;
    color: string;
  }[];
  dataPoints: {
    date: string;
    values: Record<string, number>;
  }[];
}

// ============================================
// Stats Types
// ============================================
export interface GlobalStats {
  totalSongs: number;
  activeSongs: number;
  newSongsToday: number;
  newSongsThisWeek: number;
  totalViewsTracked: number;
  lastUpdateAt: string;
  nextUpdateAt: string;
}
```

### 6.2 Zod 스키마

```typescript
// lib/validation.ts
import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const dateRangeSchema = z.enum(['7d', '30d', '90d', 'all']).default('30d');

export const sortOrderSchema = z.enum(['asc', 'desc']).default('desc');

export const videoIdSchema = z.string().length(11).regex(/^[a-zA-Z0-9_-]{11}$/);

export const searchQuerySchema = z.object({
  ...paginationSchema.shape,
  search: z.string().optional(),
  sortBy: z.enum(['viewCount', 'publishedAt', 'title']).default('viewCount'),
  order: sortOrderSchema
});

export const chartQuerySchema = z.object({
  range: dateRangeSchema,
  type: z.enum(['viewCount', 'dailyIncrease']).default('viewCount')
});

export const compareQuerySchema = z.object({
  videoIds: z.string().transform(str => str.split(',').slice(0, 5)),
  range: dateRangeSchema
});
```

---

## 7. Rate Limiting

### 7.1 제한 정책

| 엔드포인트 | 제한 | 윈도우 |
|-----------|------|--------|
| GET /api/* | 100 req/min | 1분 |
| POST /api/admin/* | 10 req/min | 1분 |
| POST /api/cron/* | 무제한 | - |

### 7.2 구현 (Upstash Rate Limit)

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!
});

export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  analytics: true
});

// 미들웨어
export async function checkRateLimit(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? 'anonymous';
  const { success, remaining, reset } = await ratelimit.limit(ip);

  if (!success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: '요청 한도를 초과했습니다'
        }
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString()
        }
      }
    );
  }

  return null; // 통과
}
```

---

## 8. 캐싱 전략

### 8.1 Next.js Cache Headers

```typescript
// 5분 캐시, 10분 stale-while-revalidate
export async function GET() {
  const data = await fetchData();

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
    }
  });
}
```

### 8.2 캐싱 정책

| 엔드포인트 | Cache-Control | 이유 |
|-----------|--------------|------|
| /ranking/* | s-maxage=300 | 5분마다 업데이트 충분 |
| /songs | s-maxage=60 | 검색은 자주 변경 |
| /songs/[id] | s-maxage=300 | 곡 정보는 안정적 |
| /chart/* | s-maxage=300 | 차트 데이터는 일별 |
| /stats | s-maxage=60 | 통계는 자주 조회 |

### 8.3 Revalidate (ISR)

```typescript
// app/ranking/daily/page.tsx
export const revalidate = 300; // 5분마다 재생성
```

---

## 9. 예시 코드

### 9.1 클라이언트 (React/TypeScript)

```typescript
// hooks/useRanking.ts
import useSWR from 'swr';
import type { ApiResponse, RankingItem } from '@/types/api';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useDailyRanking(page = 1, limit = 100) {
  const { data, error, isLoading } = useSWR<ApiResponse<RankingItem[]>>(
    `/api/ranking/daily?page=${page}&limit=${limit}`,
    fetcher,
    {
      refreshInterval: 60000, // 1분마다 갱신
      revalidateOnFocus: false
    }
  );

  return {
    rankings: data?.data ?? [],
    meta: data?.meta,
    isLoading,
    error
  };
}

// components/RankingTable.tsx
export function RankingTable() {
  const { rankings, meta, isLoading } = useDailyRanking(1, 100);

  if (isLoading) return <SkeletonTable />;

  return (
    <table>
      <thead>
        <tr>
          <th>순위</th>
          <th>곡 정보</th>
          <th>조회수</th>
          <th>증가량</th>
        </tr>
      </thead>
      <tbody>
        {rankings.map(item => (
          <tr key={item.videoId}>
            <td>{item.rank}</td>
            <td>
              <div>
                <img src={item.thumbnailUrl} alt={item.title} />
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.artist}</p>
                </div>
              </div>
            </td>
            <td>{item.viewCount.toLocaleString()}</td>
            <td>+{item.dailyIncrease.toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### 9.2 cURL 예시

```bash
# 일간 랭킹 조회
curl "https://vocatify.com/api/ranking/daily?page=1&limit=10"

# 곡 검색
curl "https://vocatify.com/api/songs?search=千本桜&limit=5"

# 곡 상세
curl "https://vocatify.com/api/songs/dQw4w9WgXcQ?range=30d"

# 관리자: VocaDB 동기화
curl -X POST "https://vocatify.com/api/admin/sync-vocadb" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"limit": 1000}'
```

### 9.3 Python 예시

```python
import requests

# 일간 랭킹 조회
def get_daily_ranking(page=1, limit=100):
    url = f"https://vocatify.com/api/ranking/daily"
    params = {"page": page, "limit": limit}

    response = requests.get(url, params=params)
    response.raise_for_status()

    data = response.json()
    if data["success"]:
        return data["data"]
    else:
        raise Exception(data["error"]["message"])

# 사용 예시
rankings = get_daily_ranking(page=1, limit=10)
for item in rankings:
    print(f"{item['rank']}. {item['title']} - {item['artist']}")
    print(f"   조회수: {item['viewCount']:,}")
    print(f"   증가량: +{item['dailyIncrease']:,}")
```

---

## 10. OpenAPI (Swagger) 스펙

```yaml
openapi: 3.0.0
info:
  title: Vocatify API
  version: 1.0.0
  description: 보컬로이드 YouTube 차트 API

servers:
  - url: https://vocatify.com/api
    description: 프로덕션
  - url: http://localhost:3000/api
    description: 개발

paths:
  /ranking/daily:
    get:
      summary: 일간 랭킹 조회
      tags: [Ranking]
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 100
            maximum: 100
        - name: date
          in: query
          schema:
            type: string
            format: date
      responses:
        '200':
          description: 성공
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DailyRankingResponse'

components:
  schemas:
    DailyRankingResponse:
      type: object
      properties:
        success:
          type: boolean
        data:
          type: array
          items:
            $ref: '#/components/schemas/RankingItem'
        meta:
          $ref: '#/components/schemas/ResponseMeta'

    RankingItem:
      type: object
      properties:
        rank:
          type: integer
        videoId:
          type: string
        title:
          type: string
        artist:
          type: string
          nullable: true
        viewCount:
          type: integer
        dailyIncrease:
          type: integer
```

---

## 부록: 체크리스트

### 개발 단계
- [ ] API Routes 생성 (Next.js App Router)
- [ ] Zod 스키마 검증 추가
- [ ] Prisma 쿼리 최적화
- [ ] 에러 핸들링 미들웨어
- [ ] Rate Limiting 설정

### 최적화 단계
- [ ] Cache Headers 설정
- [ ] 인덱스 검증 (EXPLAIN ANALYZE)
- [ ] N+1 쿼리 제거
- [ ] Response 압축 (gzip)

### 보안 단계
- [ ] API Key 검증
- [ ] CORS 설정
- [ ] SQL Injection 방지 (Prisma 자동)
- [ ] XSS 방지

### 문서화 단계
- [ ] OpenAPI 스펙 완성
- [ ] Postman Collection 생성
- [ ] API 사용 예시 추가
- [ ] 에러 코드 문서화

---

**API 명세서 종료**

이 명세서를 기반으로 Next.js API Routes를 구현하시면 됩니다!
질문이나 추가 엔드포인트가 필요하시면 말씀해주세요.

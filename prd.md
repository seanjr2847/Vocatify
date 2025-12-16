# 보컬로이드 YouTube 조회수 차트 시스템 PRD v2

## 1. 개요

### 1.1 프로젝트 명
**Vocatify**

### 1.2 목적
보컬로이드 음악의 YouTube 조회수를 자동으로 수집하고, 일별/주별 추이를 차트로 시각화하는 시스템

### 1.3 핵심 가치
- 수동 작업 없이 자동으로 데이터 수집
- 실시간에 가까운 차트 업데이트 (매 시간)
- 보컬로이드 커뮤니티를 위한 인기 차트 제공

---

## 2. 기술 스택

| 구성요소 | 기술 | 이유 |
|----------|------|------|
| 프레임워크 | **Next.js 14 (App Router)** | 풀스택, API Routes, SSR/SSG |
| 데이터베이스 | **PostgreSQL** | 안정성, 확장성, 복잡한 쿼리 지원 |
| ORM | **Prisma** | 타입 안전, 마이그레이션, 직관적 문법 |
| 스케줄러 | **node-cron** 또는 **Vercel Cron** | 매시간 자동 수집 |
| 차트 | **Recharts** | React 친화적 |
| 스타일링 | **Tailwind CSS** | 빠른 UI 개발 |
| 배포 | **Vercel + Supabase** 또는 **VPS + Docker** | - |

---

## 3. 초기 데이터베이스 구축 (시딩 전략)

### 3.1 개요

```
┌─────────────────────────────────────────────────────────────┐
│                    초기 시딩 (1회성)                         │
│                                                             │
│   VocaDB 크롤링 ──▶ 곡 목록 + YouTube ID 수집 ──▶ DB 저장   │
│   (50,000곡)         (2~4시간 소요)                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    이후 운영 (자동화)                        │
│                                                             │
│   YouTube API ──▶ 조회수 수집 (매시간)                       │
│   VocaDB API ──▶ 신곡 동기화 (매일)                         │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 VocaDB 크롤링 전략

#### Step 1: 곡 ID 수집
```
Target: https://vocadb.net/Search?searchType=Song&sort=RatingScore&page={n}
Method: 페이지네이션 순회
Output: song_id 리스트 (약 50,000개)
```

#### Step 2: 곡 상세 정보 수집
```
Target: https://vocadb.net/api/songs/{id}?fields=PVs,Artists,MainPicture
Method: API 호출 (크롤링보다 안정적)
Output: 제목, 아티스트, YouTube video_id, 게시일, 썸네일
```

#### Step 3: 필터링
```
조건:
- YouTube PV가 있는 곡만 저장
- Original 또는 Reprint PV 우선
- 삭제된 PV 제외 (pvType !== 'Unavailable')
```

### 3.3 크롤링 스크립트 설계

```typescript
// scripts/seed-vocadb.ts

interface CrawlConfig {
  startPage: number;
  endPage: number;
  delayMs: number;        // 요청 간 딜레이 (VocaDB 서버 보호)
  batchSize: number;      // DB 저장 배치 크기
}

const config: CrawlConfig = {
  startPage: 1,
  endPage: 2000,          // 약 50,000곡 (페이지당 25곡)
  delayMs: 500,           // 0.5초 딜레이
  batchSize: 100,
};

// 예상 소요 시간: 2~4시간
```

### 3.4 크롤링 시 주의사항

| 항목 | 대응 |
|------|------|
| Rate Limiting | 요청 간 500ms 딜레이 |
| 연결 끊김 | 체크포인트 저장, 재시작 가능하게 |
| 중복 방지 | video_id UNIQUE 제약조건 |
| 에러 핸들링 | 실패 로그 저장, 나중에 재시도 |

---

## 4. 신곡 분류 기준

### 4.1 정의

```typescript
// 신곡 판별 로직
function isNewSong(song: Song): boolean {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  return (
    song.publishedAt >= thirtyDaysAgo &&  // YouTube 게시일 30일 이내
    song.viewCount <= 5_000_000            // 조회수 500만 이하
  );
}
```

### 4.2 기준 선택 이유

| 조건 | 이유 |
|------|------|
| **YouTube 게시일 30일** | 업계 표준 (멜론, 빌보드 등) |
| **조회수 500만 이하** | 오래된 곡 재업로드 필터링 |

### 4.3 신곡 차트 유형

| 차트 | 기준 |
|------|------|
| 신곡 TOP 100 | 최근 30일 신곡 중 조회수 순 |
| 급상승 신곡 | 최근 30일 신곡 중 일간 증가량 순 |
| 이번 주 신곡 | 최근 7일 내 게시된 곡 |

---

## 5. 데이터베이스 스키마 (Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Song {
  id            Int       @id @default(autoincrement())
  videoId       String    @unique @map("video_id")
  title         String
  artist        String?
  vocadbId      Int?      @unique @map("vocadb_id")
  thumbnailUrl  String?   @map("thumbnail_url")
  publishedAt   DateTime? @map("published_at")  // YouTube 게시일
  
  // 메타
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")
  isActive      Boolean   @default(true) @map("is_active")  // 삭제된 영상 soft delete
  
  // Relations
  viewLogs      ViewLog[]
  dailyStats    DailyStat[]
  
  @@map("songs")
}

model ViewLog {
  id          Int      @id @default(autoincrement())
  videoId     String   @map("video_id")
  viewCount   BigInt   @map("view_count")
  collectedAt DateTime @default(now()) @map("collected_at")
  
  song        Song     @relation(fields: [videoId], references: [videoId])
  
  @@index([videoId, collectedAt])
  @@map("view_logs")
}

model DailyStat {
  id            Int      @id @default(autoincrement())
  videoId       String   @map("video_id")
  date          DateTime @db.Date
  viewCount     BigInt   @map("view_count")       // 해당 일 마지막 조회수
  dailyIncrease BigInt   @default(0) @map("daily_increase")  // 전일 대비 증가
  
  song          Song     @relation(fields: [videoId], references: [videoId])
  
  @@unique([videoId, date])
  @@index([date])
  @@map("daily_stats")
}

model CrawlLog {
  id          Int      @id @default(autoincrement())
  type        String   // 'vocadb_sync' | 'youtube_collect'
  status      String   // 'success' | 'failed' | 'partial'
  message     String?
  songsCount  Int?     @map("songs_count")
  startedAt   DateTime @map("started_at")
  finishedAt  DateTime? @map("finished_at")
  
  @@map("crawl_logs")
}
```

---

## 6. 기능 요구사항

### 6.1 데이터 수집

| 기능 | 설명 | 주기 | 우선순위 |
|------|------|------|----------|
| 초기 시딩 | VocaDB 크롤링으로 곡 목록 구축 | 1회 | P0 |
| 조회수 수집 | YouTube API로 조회수 수집 | 매시간 | P0 |
| 신곡 동기화 | VocaDB API로 신곡 추가 | 매일 | P0 |
| 일별 집계 | 일간 증가량 계산 | 매일 00:05 | P0 |
| 삭제 영상 감지 | 삭제된 영상 soft delete | 매일 | P1 |

### 6.2 차트/랭킹

| 차트 | 설명 | 우선순위 |
|------|------|----------|
| 총 조회수 TOP 100 | 누적 조회수 기준 | P0 |
| 일간 증가량 TOP 100 | 24시간 증가량 기준 | P0 |
| 주간 증가량 TOP 100 | 7일 증가량 기준 | P0 |
| 신곡 TOP 100 | 30일 이내 신곡 중 조회수 순 | P0 |
| 급상승 | 일간 증가량 급등 곡 | P1 |

### 6.3 대시보드

| 기능 | 설명 | 우선순위 |
|------|------|----------|
| 조회수 추이 차트 | 선택한 곡의 일별 그래프 | P0 |
| 곡 검색 | 제목/아티스트 검색 | P0 |
| 곡 비교 | 여러 곡 추이 비교 | P1 |
| 필터링 | 기간, 아티스트별 필터 | P1 |

---

## 7. API 엔드포인트 (Next.js API Routes)

```typescript
// 랭킹
GET  /api/ranking/total          // 총 조회수 순위
GET  /api/ranking/daily          // 일간 증가량 순위
GET  /api/ranking/weekly         // 주간 증가량 순위
GET  /api/ranking/new            // 신곡 순위

// 곡
GET  /api/songs                  // 곡 목록 (검색, 페이지네이션)
GET  /api/songs/[videoId]        // 곡 상세 + 조회수 히스토리
POST /api/songs                  // 곡 수동 추가

// 차트 데이터
GET  /api/chart/[videoId]        // 특정 곡 차트 데이터
GET  /api/chart/compare          // 여러 곡 비교 데이터

// 통계
GET  /api/stats                  // 전체 통계 (총 곡 수, 오늘 수집량 등)

// 관리 (인증 필요)
POST /api/admin/sync-vocadb      // VocaDB 수동 동기화
POST /api/admin/collect-views    // 조회수 수동 수집
```

---

## 8. Cron 작업

### Vercel Cron 사용 시

```typescript
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/collect-views",
      "schedule": "0 * * * *"           // 매시간
    },
    {
      "path": "/api/cron/daily-aggregate",
      "schedule": "5 0 * * *"           // 매일 00:05
    },
    {
      "path": "/api/cron/sync-vocadb",
      "schedule": "0 3 * * *"           // 매일 03:00
    }
  ]
}
```

### Self-hosted 사용 시

```typescript
// lib/cron.ts
import cron from 'node-cron';

// 매시간 조회수 수집
cron.schedule('0 * * * *', collectViews);

// 매일 00:05 일별 집계
cron.schedule('5 0 * * *', dailyAggregate);

// 매일 03:00 VocaDB 동기화
cron.schedule('0 3 * * *', syncVocaDB);
```

---

## 9. 프로젝트 구조

```
vocaloid-tracker/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── scripts/
│   ├── seed-vocadb.ts           # 초기 VocaDB 크롤링
│   └── test-youtube-api.ts      # YouTube API 테스트
│
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx             # 메인 대시보드
│   │   ├── ranking/
│   │   │   └── page.tsx         # 랭킹 페이지
│   │   ├── song/
│   │   │   └── [videoId]/
│   │   │       └── page.tsx     # 곡 상세
│   │   └── api/
│   │       ├── ranking/
│   │       │   ├── total/route.ts
│   │       │   ├── daily/route.ts
│   │       │   └── weekly/route.ts
│   │       ├── songs/
│   │       │   └── route.ts
│   │       ├── chart/
│   │       │   └── [videoId]/route.ts
│   │       └── cron/
│   │           ├── collect-views/route.ts
│   │           ├── daily-aggregate/route.ts
│   │           └── sync-vocadb/route.ts
│   │
│   ├── lib/
│   │   ├── prisma.ts            # Prisma 클라이언트
│   │   ├── youtube.ts           # YouTube API 서비스
│   │   ├── vocadb.ts            # VocaDB API 서비스
│   │   └── utils.ts
│   │
│   └── components/
│       ├── RankingTable.tsx
│       ├── TrendChart.tsx
│       ├── SongCard.tsx
│       └── SearchBar.tsx
│
├── .env.example
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vercel.json                  # Vercel Cron 설정
```

---

## 10. 환경변수

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/vocaloid_chart"

# YouTube API
YOUTUBE_API_KEY="your_youtube_api_key"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Cron 인증 (Vercel Cron용)
CRON_SECRET="your_cron_secret"
```

---

## 11. 구현 우선순위

### Phase 1: 기반 구축 (3~4일)
- [ ] Next.js 프로젝트 초기화
- [ ] Prisma + PostgreSQL 설정
- [ ] VocaDB 크롤링 스크립트 작성
- [ ] 초기 시딩 실행 (50,000곡)

### Phase 2: 핵심 기능 (3~4일)
- [ ] YouTube API 연동
- [ ] 매시간 조회수 수집 Cron
- [ ] 일별 집계 로직
- [ ] 랭킹 API (total, daily, weekly, new)

### Phase 3: 대시보드 (3~4일)
- [ ] 메인 페이지 (랭킹 미리보기)
- [ ] 랭킹 페이지 (탭으로 구분)
- [ ] 곡 상세 페이지 (차트)
- [ ] 검색 기능

### Phase 4: 고도화 (선택)
- [ ] 곡 비교 기능
- [ ] 아티스트별 필터
- [ ] Discord 웹훅 알림
- [ ] 데이터 내보내기

---

## 12. 배포 옵션

| 옵션 | 프론트엔드 | 백엔드/Cron | DB | 비용 |
|------|-----------|-------------|-----|------|
| **A. Vercel + Supabase** | Vercel | Vercel Cron | Supabase (PostgreSQL) | 무료~$20/월 |
| **B. VPS** | 같은 서버 | node-cron | 같은 서버 PostgreSQL | $5~10/월 |
| **C. Railway** | Railway | Railway | Railway PostgreSQL | $5~20/월 |

**권장: 옵션 A (Vercel + Supabase)**
- Vercel: 프론트엔드 + API Routes + Cron 무료
- Supabase: PostgreSQL 무료 티어 (500MB)

---

## 13. 다음 단계

PRD 확정되면:

1. **크롤링 스크립트** 먼저 작성 (VocaDB → 곡 목록)
2. **Prisma 스키마** 생성 및 마이그레이션
3. **초기 시딩 실행**
4. **API + 대시보드** 순차 개발

진행할까요?
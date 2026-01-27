# Phase 2 프로덕션 배포 체크리스트

## 배포 전 준비사항

### 1. 환경 변수 확인
```bash
# .env 파일 필수 항목 확인
✅ DATABASE_URL         # Neon PostgreSQL 연결 문자열
✅ YOUTUBE_API_KEY      # YouTube Data API v3 키
✅ CRON_SECRET          # Cron 엔드포인트 보안 토큰
```

### 2. 데이터베이스 상태 확인
```bash
# songs_enhanced 테이블 존재 여부
npm run sync:songs-enhanced --dry-run

# 데이터 동기화 상태 확인
psql $DATABASE_URL -c "SELECT COUNT(*) FROM songs_enhanced;"
# 예상: 483,081 rows

# 인덱스 생성 확인
psql $DATABASE_URL -c "SELECT indexname FROM pg_indexes WHERE tablename = 'songs_enhanced';"
# 예상: 10개 인덱스
```

### 3. 코드 검증
```bash
# TypeScript 타입 체크
npx tsc --noEmit

# ESLint 검사
npm run lint

# 빌드 테스트
npm run build
```

### 4. 백업 생성
```bash
# 프로덕션 데이터베이스 백업
pg_dump $DATABASE_URL > backups/pre-phase2-deployment-$(date +%Y%m%d).sql

# 백업 압축
gzip backups/pre-phase2-deployment-*.sql

# 백업 검증
gunzip -c backups/pre-phase2-deployment-*.sql.gz | head -n 100
```

## Week 1: 스테이징 환경 테스트

### Day 1-2: 스테이징 배포
```bash
# 스테이징 환경에 배포
vercel --prod --env staging

# 스테이징 데이터베이스 설정
DATABASE_URL=$STAGING_DATABASE_URL npm run sync:songs-enhanced
DATABASE_URL=$STAGING_DATABASE_URL npm run compute:increases
```

**검증 항목**:
- [ ] API 엔드포인트 정상 응답
- [ ] 랭킹 데이터 정확성 (V1 vs V2 비교)
- [ ] 캐시 동작 확인
- [ ] 에러 로그 없음

### Day 3-4: 부하 테스트
```bash
# Artillery로 부하 테스트
npm install -g artillery

# 부하 테스트 시나리오 작성
cat > loadtest.yml <<EOF
config:
  target: 'https://staging.vocatify.com'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 300
      arrivalRate: 50
      name: "Sustained load"
scenarios:
  - flow:
      - get:
          url: "/api/ranking/total?limit=100"
      - get:
          url: "/api/ranking/daily?limit=100"
      - get:
          url: "/api/ranking/weekly?limit=100"
EOF

# 부하 테스트 실행
artillery run loadtest.yml
```

**측정 메트릭**:
- [ ] P50 응답 시간 < 500ms
- [ ] P95 응답 시간 < 2s
- [ ] P99 응답 시간 < 3s
- [ ] 에러율 < 0.1%

### Day 5-7: 모니터링 구축
```typescript
// lib/monitoring.ts
import { createClient } from '@vercel/analytics';

export async function trackQueryPerformance(
  queryName: string,
  duration: number,
  cached: boolean
) {
  analytics.track('query_performance', {
    query: queryName,
    duration_ms: duration,
    cached,
    timestamp: new Date().toISOString(),
  });

  if (duration > 3000) {
    console.warn(`[SLOW QUERY] ${queryName}: ${duration}ms`);
  }
}

// app/api/ranking/total/route.ts
import { trackQueryPerformance } from '@/lib/monitoring';

export async function GET(request: NextRequest) {
  const start = Date.now();
  const ranking = await getTotalRankingV2(limit, offset);
  const duration = Date.now() - start;

  await trackQueryPerformance('total_ranking', duration, false);

  return Response.json(ranking);
}
```

**대시보드 설정**:
- [ ] Vercel Analytics 연동
- [ ] 슬로우 쿼리 알림 (> 3초)
- [ ] 에러율 모니터링
- [ ] 캐시 히트율 추적

## Week 2: 카나리 배포 (10% 트래픽)

### Day 1: Feature Flag 설정
```typescript
// lib/feature-flags.ts
export function shouldUseV2Queries(userId?: string): boolean {
  if (process.env.FORCE_V2 === 'true') return true;
  if (process.env.FORCE_V1 === 'true') return false;

  // 10% 랜덤 트래픽
  const canaryRate = parseFloat(process.env.CANARY_RATE || '0.1');
  return Math.random() < canaryRate;
}

// app/api/ranking/total/route.ts
import { shouldUseV2Queries } from '@/lib/feature-flags';
import { getTotalRanking } from '@/lib/db';      // V1
import { getTotalRankingV2 } from '@/lib/db-v2'; // V2

export async function GET(request: NextRequest) {
  const useV2 = shouldUseV2Queries();

  const ranking = useV2
    ? await getTotalRankingV2(limit, offset)
    : await getTotalRanking(limit, offset);

  return Response.json({
    ...ranking,
    _version: useV2 ? 'v2' : 'v1', // 디버깅용
  });
}
```

### Day 2-3: 배포 및 모니터링
```bash
# 환경 변수 설정
vercel env add CANARY_RATE production
# 값: 0.1 (10%)

# 프로덕션 배포
vercel --prod

# 실시간 로그 모니터링
vercel logs --prod --follow
```

**모니터링 체크포인트** (매 6시간):
- [ ] V1 vs V2 응답 시간 비교
- [ ] V2 에러율 < V1 에러율
- [ ] V2 데이터 일관성 확인
- [ ] 사용자 불만사항 없음

### Day 4-7: 분석 및 조정
```sql
-- V1 vs V2 성능 비교 쿼리
SELECT
  version,
  COUNT(*) as requests,
  AVG(duration_ms) as avg_duration,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_duration,
  SUM(CASE WHEN error THEN 1 ELSE 0 END) as errors
FROM query_logs
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY version;
```

**판단 기준**:
- ✅ **V2가 우수**: 50%로 확대
- ⚠️ **V2가 비슷**: 10% 유지, 추가 최적화
- ❌ **V2가 열등**: 롤백, 문제 분석

## Week 3: 50% 트래픽 확대

### Day 1: Canary Rate 증가
```bash
# 50%로 증가
vercel env add CANARY_RATE production
# 값: 0.5

# 재배포
vercel --prod
```

### Day 2-4: 집중 모니터링
**일간 체크리스트**:
- [ ] 아침 9시: 전날 밤 메트릭 리뷰
- [ ] 점심 12시: 오전 트래픽 체크
- [ ] 저녁 6시: 피크 타임 모니터링
- [ ] 밤 11시: 하루 종합 리포트

**주요 메트릭**:
```typescript
// scripts/monitoring/daily-report.ts
import { analyzeQueryPerformance } from '@/lib/analytics';

async function generateDailyReport() {
  const report = await analyzeQueryPerformance({
    startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
    endDate: new Date(),
  });

  console.log(`
📊 Daily Performance Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

V1 Performance:
  Requests: ${report.v1.requests.toLocaleString()}
  Avg Duration: ${report.v1.avgDuration.toFixed(0)}ms
  P95 Duration: ${report.v1.p95Duration.toFixed(0)}ms
  Errors: ${report.v1.errors} (${(report.v1.errorRate * 100).toFixed(2)}%)

V2 Performance:
  Requests: ${report.v2.requests.toLocaleString()}
  Avg Duration: ${report.v2.avgDuration.toFixed(0)}ms
  P95 Duration: ${report.v2.p95Duration.toFixed(0)}ms
  Errors: ${report.v2.errors} (${(report.v2.errorRate * 100).toFixed(2)}%)

Improvement:
  Avg: ${((1 - report.v2.avgDuration / report.v1.avgDuration) * 100).toFixed(1)}% faster
  P95: ${((1 - report.v2.p95Duration / report.v1.p95Duration) * 100).toFixed(1)}% faster
  Error Rate: ${report.v2.errorRate < report.v1.errorRate ? '✅' : '⚠️'} ${((report.v2.errorRate - report.v1.errorRate) * 100).toFixed(3)}%

Status: ${report.v2.avgDuration < report.v1.avgDuration * 0.5 ? '✅ EXCELLENT' : '⚠️ NEEDS REVIEW'}
  `);
}

generateDailyReport();
```

### Day 5-7: 안정화 확인
**안정화 기준** (모두 충족 시 100% 진행):
- [ ] V2 평균 응답 시간 < V1의 50%
- [ ] V2 에러율 ≤ V1 에러율
- [ ] 3일 연속 안정적 운영
- [ ] 사용자 불만사항 없음
- [ ] 캐시 히트율 > 70%

## Week 4: 100% 전환

### Day 1: 완전 전환
```bash
# V2 강제 활성화
vercel env add FORCE_V2 production
# 값: true

# 재배포
vercel --prod
```

### Day 2-3: 최종 검증
```typescript
// app/api/ranking/total/route.ts
import { getTotalRankingV2 } from '@/lib/db-v2';

export async function GET(request: NextRequest) {
  // V1 코드 제거, V2만 사용
  const ranking = await getTotalRankingV2(limit, offset);

  return Response.json(ranking);
}
```

**최종 검증 항목**:
- [ ] 모든 API 엔드포인트 V2로 전환
- [ ] V1 import 문 모두 제거
- [ ] 타입 체크 통과
- [ ] 빌드 성공
- [ ] 프로덕션 배포 완료

### Day 4-7: V1 코드 아카이브
```bash
# V1 코드 백업
git checkout -b archive/db-v1
git push origin archive/db-v1

# lib/db.ts에서 사용하지 않는 함수 제거
# (getTotalRanking, getDailyRanking, getWeeklyRanking, getNewSongsRanking)

# 코드 정리 커밋
git add .
git commit -m "chore: archive V1 query functions, complete Phase 2 migration"
git push origin main
```

## 자동화 설정

### Cron Job 스케줄링

**vercel.json 설정**:
```json
{
  "crons": [
    {
      "path": "/api/cron/vocadb",
      "schedule": "0 2 * * *",
      "description": "Daily VocaDB crawler (2 AM UTC)"
    },
    {
      "path": "/api/cron/youtube",
      "schedule": "0 3 * * *",
      "description": "Daily YouTube view counts (3 AM UTC)"
    },
    {
      "path": "/api/cron/sync-enhanced",
      "schedule": "0 4 * * *",
      "description": "Daily songs_enhanced sync (4 AM UTC)"
    },
    {
      "path": "/api/cron/compute-increases",
      "schedule": "0 5 * * *",
      "description": "Daily increase computation (5 AM UTC)"
    }
  ]
}
```

**Cron 엔드포인트 구현**:
```typescript
// app/api/cron/sync-enhanced/route.ts
import { NextRequest } from 'next/server';
import { syncSongsEnhanced } from '@/lib/sync-enhanced';

export async function POST(request: NextRequest) {
  // 인증 확인
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await syncSongsEnhanced();
    return Response.json({
      success: true,
      synced: result.synced,
      updated: result.updated,
      duration: result.duration,
    });
  } catch (error: any) {
    console.error('Sync failed:', error);
    return Response.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

// GET으로 상태 확인 (인증 불필요)
export async function GET() {
  const lastSync = await getLastSyncTime();
  const status = await getSyncStatus();

  return Response.json({
    lastSync,
    status,
    nextScheduled: '04:00 UTC',
  });
}
```

**동기화 함수 구현**:
```typescript
// lib/sync-enhanced.ts
import { Client } from 'pg';

export async function syncSongsEnhanced() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const startTime = Date.now();

  const result = await client.query(`
    INSERT INTO songs_enhanced (...)
    SELECT ...
    ON CONFLICT (song_id) DO UPDATE SET ...
  `);

  await client.end();

  return {
    synced: result.rowCount,
    updated: result.rowCount, // ON CONFLICT 때문에 동일
    duration: Date.now() - startTime,
  };
}

export async function getLastSyncTime() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const result = await client.query(`
    SELECT MAX(last_synced_at) as last_sync FROM songs_enhanced
  `);

  await client.end();
  return result.rows[0].last_sync;
}
```

### GitHub Actions 백업 (Vercel Cron 백업용)

**.github/workflows/daily-sync.yml**:
```yaml
name: Daily Database Sync

on:
  schedule:
    - cron: '0 4 * * *'  # 4 AM UTC
  workflow_dispatch:     # 수동 실행 가능

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run sync
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          npm run sync:songs-enhanced
          npm run compute:increases

      - name: Notify on failure
        if: failure()
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: 'Daily sync failed',
              body: 'The daily database sync job failed. Please check the logs.',
              labels: ['bug', 'database']
            })
```

## 롤백 계획

### 긴급 롤백 절차

**시나리오 1: V2 쿼리 오류 발생**
```bash
# 1분 내 긴급 롤백
vercel env add FORCE_V2 production
# 값: false

vercel --prod

# 또는 Vercel 대시보드에서 이전 배포로 롤백
```

**시나리오 2: songs_enhanced 데이터 손상**
```sql
-- 백업에서 복원
psql $DATABASE_URL < backups/pre-phase2-deployment-20260122.sql

-- 또는 songs 테이블에서 재동기화
npm run sync:songs-enhanced
```

**시나리오 3: 성능 저하**
```typescript
// Feature flag로 V1 활성화
export function shouldUseV2Queries(): boolean {
  return false; // 임시로 V1 사용
}
```

### 롤백 후 조치
1. **근본 원인 분석**
   - 로그 수집 및 분석
   - 에러 패턴 파악
   - 재현 환경 구성

2. **수정 및 테스트**
   - 스테이징에서 수정 사항 테스트
   - A/B 테스트 재실행
   - 코드 리뷰

3. **재배포 계획**
   - 수정 사항 문서화
   - 배포 시간 조정 (트래픽 낮은 시간)
   - 모니터링 강화

## 성공 기준

### 배포 완료 판단 기준
- [x] V2 코드 100% 프로덕션 적용
- [x] V1 코드 아카이브 완료
- [x] 자동화 스케줄링 설정
- [x] 모니터링 대시보드 운영
- [x] 7일 연속 안정적 운영
- [x] 성능 목표 달성:
  - [ ] 평균 응답 시간 < 2초
  - [ ] P95 응답 시간 < 3초
  - [ ] 캐시 히트율 > 70%
  - [ ] 에러율 < 0.5%

### 문서화 완료
- [x] 배포 과정 문서화
- [x] 트러블슈팅 가이드
- [x] 운영 매뉴얼
- [x] API 변경사항 공지

### 팀 교육 (해당시)
- [ ] Phase 2 아키텍처 설명
- [ ] 새 쿼리 함수 사용법
- [ ] 모니터링 도구 사용법
- [ ] 긴급 대응 절차

## 체크리스트 요약

**배포 전**:
- [ ] 환경 변수 확인
- [ ] 데이터베이스 백업
- [ ] 코드 검증 (타입체크, 린트, 빌드)
- [ ] 스테이징 테스트

**Week 1**:
- [ ] 스테이징 배포 및 검증
- [ ] 부하 테스트
- [ ] 모니터링 구축

**Week 2**:
- [ ] 카나리 배포 (10%)
- [ ] 성능 모니터링
- [ ] 데이터 일관성 검증

**Week 3**:
- [ ] 50% 트래픽 확대
- [ ] 집중 모니터링 (3일)
- [ ] 안정화 확인

**Week 4**:
- [ ] 100% 전환
- [ ] V1 코드 제거
- [ ] 자동화 설정
- [ ] 문서화 완료

**배포 후**:
- [ ] 7일 안정적 운영 확인
- [ ] 성능 목표 달성 검증
- [ ] 팀 교육 (해당시)
- [ ] 회고 및 개선사항 정리

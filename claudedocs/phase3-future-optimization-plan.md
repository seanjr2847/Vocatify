# Phase 3 및 향후 최적화 계획

## 개요

Phase 1과 Phase 2를 통해 **94.7% 성능 개선**을 달성했습니다. 이 문서는 향후 트래픽 증가 시 적용할 Phase 3 최적화 계획과 장기 유지보수 전략을 다룹니다.

## Phase 3: 테이블 파티셔닝 (Table Partitioning)

### 활성화 조건

**현재 상태**: Phase 2 최적화로 충분한 성능 확보
**Phase 3 필요 시점**: 다음 조건 중 하나 이상 충족 시

1. **트래픽 10배 증가**: 일일 쿼리 수 > 100만 건
2. **데이터 10배 증가**: songs_enhanced 테이블 > 500만 행
3. **쿼리 성능 저하**: P95 응답 시간 > 3초
4. **daily_view_counts 급증**: > 8천만 행 (현재 ~800만 행)

### 파티셔닝 전략

#### 1. daily_view_counts 시간 기반 파티셔닝

**현재 문제점**:
- 800만 행 이상의 시계열 데이터
- 매일 13만 행씩 증가
- 대부분의 쿼리는 최근 30일 데이터만 사용

**파티셔닝 설계**:
```sql
-- 월별 파티션 생성
CREATE TABLE daily_view_counts (
  id SERIAL,
  pv_id INTEGER NOT NULL,
  recorded_date DATE NOT NULL,
  total_views BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (recorded_date);

-- 과거 데이터 파티션 (읽기 전용)
CREATE TABLE daily_view_counts_2024_01
  PARTITION OF daily_view_counts
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE daily_view_counts_2024_02
  PARTITION OF daily_view_counts
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- ... (월별 파티션 계속)

-- 현재 활성 파티션
CREATE TABLE daily_view_counts_2026_01
  PARTITION OF daily_view_counts
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- 미래 파티션 (자동 생성 스크립트 필요)
CREATE TABLE daily_view_counts_2026_02
  PARTITION OF daily_view_counts
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
```

**파티션별 인덱스**:
```sql
-- 각 파티션마다 자동으로 생성됨
CREATE INDEX ON daily_view_counts_2026_01 (pv_id, recorded_date DESC);
CREATE INDEX ON daily_view_counts_2026_01 (recorded_date DESC);
```

**예상 효과**:
- 쿼리 스캔 범위 축소 (전체 테이블 → 해당 월 파티션만)
- 인덱스 크기 감소 (전체 800만 행 → 월별 ~40만 행)
- 오래된 데이터 아카이빙 용이
- **추가 성능 개선**: 40-60%

#### 2. songs_enhanced 아티스트 타입별 파티셔닝

**파티셔닝 기준**: `is_vocaloid_song` 컬럼

```sql
CREATE TABLE songs_enhanced (
  song_id INTEGER,
  -- ... 기타 컬럼들
  is_vocaloid_song BOOLEAN NOT NULL
) PARTITION BY LIST (is_vocaloid_song);

-- Vocaloid 곡 파티션 (97.5%, 주요 쿼리 대상)
CREATE TABLE songs_enhanced_vocaloid
  PARTITION OF songs_enhanced
  FOR VALUES IN (true);

-- 기타 곡 파티션 (2.5%, 거의 사용 안 함)
CREATE TABLE songs_enhanced_other
  PARTITION OF songs_enhanced
  FOR VALUES IN (false);
```

**예상 효과**:
- Vocaloid 전용 인덱스 크기 2.5% 감소
- 쿼리 플래너가 파티션 프루닝으로 자동 최적화
- 유지보수 시 Vocaloid/기타 분리 관리 가능
- **추가 성능 개선**: 5-10%

### Phase 3 마이그레이션 절차

**1단계: 백업 및 테스트 환경 구성** (1주)
```bash
# 전체 데이터베이스 백업
pg_dump $DATABASE_URL > backup_pre_phase3.sql

# 테스트 환경에 복원
psql $TEST_DATABASE_URL < backup_pre_phase3.sql
```

**2단계: 파티션 테이블 생성** (1주)
```sql
-- 새 파티션 테이블 생성
CREATE TABLE daily_view_counts_partitioned (...) PARTITION BY RANGE (recorded_date);

-- 월별 파티션 생성 (2024-01 ~ 현재)
-- 스크립트로 자동화
```

**3단계: 데이터 마이그레이션** (2-3일, 야간 실행)
```sql
-- 파티션별로 데이터 복사
INSERT INTO daily_view_counts_partitioned
SELECT * FROM daily_view_counts
WHERE recorded_date >= '2024-01-01' AND recorded_date < '2024-02-01';

-- 각 월별 파티션에 대해 반복
```

**4단계: 검증 및 전환** (1주)
```sql
-- 데이터 개수 검증
SELECT COUNT(*) FROM daily_view_counts;           -- 기존
SELECT COUNT(*) FROM daily_view_counts_partitioned; -- 신규

-- 샘플 데이터 비교
SELECT * FROM daily_view_counts WHERE pv_id = 12345 ORDER BY recorded_date DESC LIMIT 100;
SELECT * FROM daily_view_counts_partitioned WHERE pv_id = 12345 ORDER BY recorded_date DESC LIMIT 100;

-- 테이블 교체
ALTER TABLE daily_view_counts RENAME TO daily_view_counts_old;
ALTER TABLE daily_view_counts_partitioned RENAME TO daily_view_counts;
```

**5단계: 모니터링 및 최적화** (2주)
- 쿼리 성능 모니터링
- 파티션 프루닝 동작 확인 (EXPLAIN ANALYZE)
- 필요시 인덱스 튜닝
- 안정화 확인 후 old 테이블 삭제

### 자동 파티션 생성 스크립트

```typescript
// scripts/db/auto-create-partitions.ts
import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function createMonthlyPartitions() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // 현재 달부터 향후 3개월 파티션 생성
  const today = new Date();
  for (let i = 0; i < 3; i++) {
    const partitionDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + i + 1, 1);

    const partitionName = `daily_view_counts_${partitionDate.getFullYear()}_${String(partitionDate.getMonth() + 1).padStart(2, '0')}`;
    const startDate = partitionDate.toISOString().split('T')[0];
    const endDate = nextMonth.toISOString().split('T')[0];

    const createPartition = `
      CREATE TABLE IF NOT EXISTS ${partitionName}
      PARTITION OF daily_view_counts
      FOR VALUES FROM ('${startDate}') TO ('${endDate}');
    `;

    try {
      await client.query(createPartition);
      console.log(`✅ Created partition: ${partitionName} (${startDate} to ${endDate})`);
    } catch (error: any) {
      if (error.code === '42P07') {
        console.log(`⏭️  Partition already exists: ${partitionName}`);
      } else {
        throw error;
      }
    }
  }

  await client.end();
  console.log('🎉 Partition creation completed');
}

createMonthlyPartitions();
```

**Cron 스케줄**: 매월 1일 실행
```yaml
# vercel.json
{
  "crons": [
    {
      "path": "/api/cron/create-partitions",
      "schedule": "0 0 1 * *"
    }
  ]
}
```

## 향후 최적화 기회

### 1. 읽기 복제본 (Read Replica) 도입

**시점**: API 요청 > 50만/일

**아키텍처**:
```
[Primary DB (쓰기)]
       ↓ 복제
[Replica 1 (읽기)] ← 랭킹 쿼리
[Replica 2 (읽기)] ← 검색 쿼리
```

**구현**:
```typescript
// lib/prisma-replica.ts
export const prismaReplica = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_REPLICA_URL,
    },
  },
});

// lib/db-v2.ts
import { prismaReplica } from './prisma-replica';

export async function getTotalRankingV2(limit: number, offset: number) {
  // 읽기 전용 쿼리는 Replica 사용
  const songs = await prismaReplica.$queryRawUnsafe(`...`);
  return songs;
}
```

**예상 효과**:
- Primary DB 부하 50% 감소
- 쓰기/읽기 분리로 응답 시간 개선
- 장애 발생 시 자동 failover 가능

### 2. 전문 검색 (Full-Text Search) 최적화

**현재**: `LIKE '%keyword%'` 방식 (느림)

**개선안 1: PostgreSQL Full-Text Search**
```sql
-- 검색용 tsvector 컬럼 추가
ALTER TABLE songs_enhanced
ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
  to_tsvector('simple',
    coalesce(title_korean, '') || ' ' ||
    coalesce(title_english, '') || ' ' ||
    coalesce(title_japanese, '') || ' ' ||
    coalesce(artist_string, '')
  )
) STORED;

-- GIN 인덱스 생성
CREATE INDEX idx_songs_search ON songs_enhanced USING GIN(search_vector);

-- 검색 쿼리
SELECT * FROM songs_enhanced
WHERE search_vector @@ to_tsquery('simple', 'miku | hatsune')
ORDER BY ts_rank(search_vector, to_tsquery('simple', 'miku | hatsune')) DESC;
```

**개선안 2: Elasticsearch 연동**
```typescript
// lib/elasticsearch.ts
import { Client } from '@elastic/elasticsearch';

const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL,
});

export async function searchSongs(query: string, limit: number = 20) {
  const result = await esClient.search({
    index: 'songs',
    body: {
      query: {
        multi_match: {
          query,
          fields: ['title_korean^3', 'title_english^2', 'title_japanese', 'artist_string^2'],
          fuzziness: 'AUTO',
        },
      },
      size: limit,
    },
  });

  return result.hits.hits.map(hit => hit._source);
}
```

### 3. 캐시 전략 고도화

**현재**: In-memory 캐시 (5분 TTL)

**개선안: Redis 분산 캐시**
```typescript
// lib/redis-cache.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function getCachedRanking(key: string) {
  const cached = await redis.get(key);
  return cached ? JSON.parse(cached) : null;
}

export async function setCachedRanking(key: string, data: any, ttl: number = 300) {
  await redis.setex(key, ttl, JSON.stringify(data));
}

// 다층 캐시 (L1: In-memory, L2: Redis)
export async function getWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 300
): Promise<T> {
  // L1: In-memory 캐시 확인
  const memCached = inMemoryCache.get<T>(key);
  if (memCached) return memCached;

  // L2: Redis 캐시 확인
  const redisCached = await getCachedRanking(key);
  if (redisCached) {
    inMemoryCache.set(key, redisCached, 60); // 1분 TTL
    return redisCached;
  }

  // 캐시 미스: DB 조회
  const data = await fetcher();
  await setCachedRanking(key, data, ttl);
  inMemoryCache.set(key, data, 60);
  return data;
}
```

**캐시 무효화 전략**:
```typescript
// 크롤러 완료 시 캐시 무효화
export async function invalidateRankingCache() {
  await redis.del('total-v2:100', 'daily-v2:100', 'weekly-v2:100', 'new-v2:100');
  inMemoryCache.clear();
}
```

### 4. CDN 및 Edge Caching

**Vercel Edge Functions 활용**:
```typescript
// app/api/ranking/total/route.ts
export const runtime = 'edge';
export const revalidate = 300; // 5분 캐시

export async function GET(request: Request) {
  const ranking = await getTotalRankingV2(100, 0);

  return new Response(JSON.stringify(ranking), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
```

**예상 효과**:
- DB 쿼리 90% 감소
- 전 세계 사용자에게 낮은 지연시간
- 서버 부하 대폭 감소

### 5. 실시간 업데이트 시스템

**WebSocket으로 실시간 랭킹 변화 푸시**:
```typescript
// lib/realtime-ranking.ts
import { Server as SocketServer } from 'socket.io';

export function setupRealtimeRanking(io: SocketServer) {
  // 크롤러 완료 시 호출
  io.emit('ranking:updated', {
    timestamp: new Date(),
    changes: {
      total: 150,    // 변경된 곡 수
      daily: 80,
      weekly: 120,
    },
  });
}

// Client-side
socket.on('ranking:updated', (data) => {
  // 랭킹 자동 새로고침
  mutate('/api/ranking/total');
});
```

## 장기 유지보수 계획

### 데이터 보존 정책

**daily_view_counts 보존 기간**:
- **Hot Data (최근 3개월)**: 메인 DB 유지, 빠른 쿼리
- **Warm Data (3-12개월)**: 파티션 압축, 가끔 조회
- **Cold Data (1년 이상)**: S3 아카이빙, 필요시 복원

**아카이빙 스크립트**:
```typescript
// scripts/db/archive-old-data.ts
async function archiveOldPartitions() {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - 12);

  // 1년 이상 된 파티션 식별
  const oldPartitions = await client.query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename LIKE 'daily_view_counts_%'
      AND tablename < 'daily_view_counts_${cutoffDate.getFullYear()}_${String(cutoffDate.getMonth() + 1).padStart(2, '0')}'
  `);

  for (const partition of oldPartitions.rows) {
    // CSV로 export
    await client.query(`
      COPY ${partition.tablename} TO '/tmp/${partition.tablename}.csv' CSV HEADER;
    `);

    // S3 업로드
    await s3.upload({
      Bucket: 'vocatify-archives',
      Key: `daily-view-counts/${partition.tablename}.csv.gz`,
      Body: fs.createReadStream(`/tmp/${partition.tablename}.csv`).pipe(zlib.createGzip()),
    });

    // 파티션 삭제
    await client.query(`DROP TABLE ${partition.tablename}`);
    console.log(`✅ Archived and deleted: ${partition.tablename}`);
  }
}
```

### 모니터링 및 알림

**중요 메트릭**:
```yaml
performance_metrics:
  - query_latency_p95: < 2s (경고), < 5s (위험)
  - cache_hit_rate: > 70% (목표 80%+)
  - database_connections: < 80% pool size
  - songs_enhanced_sync_lag: < 24 hours

data_quality_metrics:
  - songs_with_view_counts: > 95%
  - daily_increase_coverage: > 90%
  - sync_job_success_rate: > 99%

system_health:
  - crawler_completion_rate: 100%
  - youtube_api_quota_remaining: > 20%
  - database_storage_usage: < 80%
```

**알림 설정**:
```typescript
// lib/monitoring.ts
export async function checkHealthMetrics() {
  const metrics = {
    queryLatency: await getP95Latency(),
    cacheHitRate: await getCacheHitRate(),
    syncLag: await getSyncLag(),
  };

  if (metrics.queryLatency > 5000) {
    await sendAlert('critical', `Query P95 latency: ${metrics.queryLatency}ms`);
  }

  if (metrics.cacheHitRate < 0.7) {
    await sendAlert('warning', `Cache hit rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%`);
  }

  if (metrics.syncLag > 86400000) {
    await sendAlert('critical', `Sync lag: ${Math.floor(metrics.syncLag / 3600000)} hours`);
  }
}
```

### 정기 유지보수 작업

**일간 작업** (자동화):
- songs_enhanced 동기화
- daily/weekly 증가량 계산
- 캐시 통계 수집
- 헬스체크 실행

**주간 작업**:
- 쿼리 성능 리뷰
- 슬로우 쿼리 분석 (> 3초)
- 인덱스 사용률 확인
- 디스크 사용량 점검

**월간 작업**:
- 파티션 생성 (자동)
- 오래된 로그 아카이빙
- 데이터베이스 통계 업데이트 (ANALYZE)
- 백업 복원 테스트

**분기별 작업**:
- 성능 벤치마크
- 인덱스 최적화 검토
- 아카이빙 실행 (1년 이상 데이터)
- 재해 복구 훈련

## 비용 최적화

### 데이터베이스 비용 절감

**현재 예상 비용** (Neon Free Tier 기준):
- Storage: ~500MB (Free)
- Compute: ~10시간/월 (Free)

**트래픽 증가 시 비용 최적화**:
1. **Read Replica vs Vertical Scaling**
   - Replica 2대: $50/월
   - 2배 큰 인스턴스: $100/월
   - 권장: Replica (더 저렴하고 확장성 좋음)

2. **파티션 아카이빙**
   - S3 Standard: $0.023/GB/월
   - 1년 치 데이터 (~50GB): $1.15/월
   - DB Storage 절약: ~$10/월

3. **CDN 캐싱**
   - Vercel Edge: 무료 (Fair Use)
   - DB 쿼리 90% 감소 → Compute 비용 $50/월 절약

### API 비용 최적화

**YouTube Data API v3**:
- 현재 할당량: 10,000 units/일
- 1회 videos.list: 1 unit (50개 비디오 배치)
- 최적화: 500곡/일 업데이트 = 10 units (충분)

**VocaDB API**:
- 무료, Rate Limit 없음
- 배치 크기 최적화: 100곡/요청

## 예상 성능 로드맵

### 현재 성능 (Phase 2 완료)
```
쿼리 응답 시간:
- Total Ranking: 1.3초
- Daily Ranking: 1.1초
- Weekly Ranking: 1.3초
- 캐시 Hit: 50ms
```

### Phase 3 적용 후 (파티셔닝)
```
쿼리 응답 시간:
- Total Ranking: 800ms (40% 개선)
- Daily Ranking: 600ms (45% 개선)
- Weekly Ranking: 700ms (46% 개선)
- 캐시 Hit: 50ms
```

### 전체 최적화 완료 후 (Redis + CDN + Replica)
```
엔드유저 응답 시간:
- CDN 캐시 Hit: 50-100ms (90% 요청)
- Redis 캐시 Hit: 200-300ms (8% 요청)
- DB 쿼리: 600-800ms (2% 요청)

평균 응답 시간: ~80ms (현재 대비 16배 빠름)
```

## 결론 및 권장사항

### 단기 (1-3개월)
1. ✅ **Phase 2 프로덕션 배포 완료**
2. 🔄 **자동화 설정**: 일간 동기화 + 증가량 계산
3. 📊 **모니터링 구축**: 핵심 메트릭 추적
4. 🧪 **A/B 테스트 지속**: 실사용자 성능 검증

### 중기 (3-6개월)
1. **Redis 캐시 도입**: 캐시 효율 향상
2. **Vercel Edge Functions**: CDN 캐싱 활성화
3. **전문 검색 최적화**: PostgreSQL FTS 또는 Elasticsearch
4. **백업 자동화**: 일간 백업 + 주간 복원 테스트

### 장기 (6-12개월)
1. **Phase 3 준비**: 트래픽 모니터링 및 파티셔닝 계획
2. **Read Replica 도입**: 트래픽 50만/일 달성 시
3. **실시간 기능**: WebSocket 기반 랭킹 업데이트
4. **글로벌 확장**: Multi-region 배포 고려

**최종 목표**:
- 평균 응답 시간 < 100ms
- 99.9% Uptime
- 동시 접속 10만 사용자 지원
- 월 운영 비용 < $200

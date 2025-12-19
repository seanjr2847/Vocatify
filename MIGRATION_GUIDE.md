# daily_view_counts 테이블 마이그레이션 가이드

## 📋 변경 사항 요약

### 기존 구조
```sql
CREATE TABLE daily_view_counts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vocadbId INTEGER NOT NULL,
  youtubeId TEXT NOT NULL,
  viewCount INTEGER NOT NULL,
  dailyIncrease INTEGER DEFAULT 0,
  recordDate TEXT NOT NULL,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
)
```

**문제점:**
- `dailyIncrease`를 저장 시점에 계산하여 저장 (계산 로직 변경 시 재계산 불가)
- 불필요한 컬럼 (id, youtubeId, createdAt)
- 복합 유니크 제약 없음

### 새로운 구조
```sql
CREATE TABLE daily_view_counts (
  song_id INTEGER NOT NULL,
  recorded_date DATE NOT NULL,
  total_views INTEGER NOT NULL,
  PRIMARY KEY (song_id, recorded_date),
  FOREIGN KEY (song_id) REFERENCES songs(vocadbId)
)
```

**개선 사항:**
- 복합 기본 키로 중복 방지
- 원본 데이터(total_views)만 저장
- Window function으로 증가량을 쿼리 시 계산
- 간결한 구조

## 🚀 마이그레이션 실행

### 1. 마이그레이션 스크립트 실행

```bash
npm run db:migrate-daily
```

이 스크립트는:
1. ✅ 새로운 테이블 생성
2. ✅ 기존 데이터 마이그레이션
3. ✅ 기존 테이블 삭제
4. ✅ 테이블 이름 변경
5. ✅ 성능 최적화 인덱스 생성

### 2. 코드 업데이트

기존 `lib/db.ts`를 새로운 `lib/db-new.ts`로 교체:

```bash
# 기존 파일 백업
mv lib/db.ts lib/db.old.ts

# 새 파일 사용
mv lib/db-new.ts lib/db.ts
```

또는 직접 교체:
- `lib/db.ts` 삭제
- `lib/db-new.ts` → `lib/db.ts`로 이름 변경

### 3. 프로덕션 서버 재시작

```bash
# 빌드
npm run build

# 서버 재시작
npm start
```

## 📊 쿼리 로직 변경 사항

### 일간 증가량 계산

**기존 방식:**
```sql
-- dailyIncrease 컬럼에 저장된 값 사용
SELECT dailyIncrease FROM daily_view_counts
WHERE recordDate = date('now')
```

**새로운 방식:**
```sql
-- Window function으로 전날 대비 증가량 계산
WITH daily_changes AS (
  SELECT
    song_id,
    total_views - LAG(total_views) OVER (
      PARTITION BY song_id
      ORDER BY recorded_date
    ) as daily_increase
  FROM daily_view_counts
)
SELECT * FROM daily_changes
WHERE recorded_date = date('now')
```

### 주간 증가량 계산

**기존 방식:**
```sql
-- 최근 7일간 dailyIncrease 합계
SELECT SUM(dailyIncrease) as weeklyIncrease
FROM daily_view_counts
WHERE recordDate >= date('now', '-7 days')
GROUP BY vocadbId
```

**새로운 방식:**
```sql
-- 7일 전과 오늘의 total_views 차이 계산
WITH weekly_changes AS (
  SELECT
    song_id,
    MAX(CASE WHEN recorded_date = date('now') THEN total_views END) as latest,
    MAX(CASE WHEN recorded_date = date('now', '-7 days') THEN total_views END) as week_ago
  FROM daily_view_counts
  GROUP BY song_id
)
SELECT song_id, (latest - COALESCE(week_ago, 0)) as weeklyIncrease
FROM weekly_changes
```

## 🔍 보컬로이드 필터링

모든 랭킹 쿼리에 `artistType = 'Vocaloid'` 필터 추가:

```sql
-- 모든 쿼리에 추가
WHERE s.artistType = 'Vocaloid'
```

**보컬로이드 곡 수:**
- 전체: 194,428곡
- Producer: 80,540곡 (제외)
- Unknown: 2,011곡 (제외)

## ✅ 검증

마이그레이션 후 확인사항:

```bash
# 1. 테이블 구조 확인
npx tsx -e "const Database = require('better-sqlite3'); const db = new Database('data/vocadb/vocatify.db'); console.log(db.prepare('PRAGMA table_info(daily_view_counts)').all());"

# 2. 데이터 개수 확인
npx tsx -e "const Database = require('better-sqlite3'); const db = new Database('data/vocadb/vocatify.db'); console.log(db.prepare('SELECT COUNT(*) as count FROM daily_view_counts').get());"

# 3. 보컬로이드 곡 확인
npx tsx -e "const Database = require('better-sqlite3'); const db = new Database('data/vocadb/vocatify.db'); console.log(db.prepare(\"SELECT COUNT(*) as count FROM songs WHERE artistType = 'Vocaloid'\").get());"
```

## 📝 데이터 수집 스크립트 업데이트 필요

`scripts/db/seed-daily-counts.ts` 파일도 새로운 테이블 구조에 맞게 수정해야 합니다:

**기존:**
```typescript
INSERT INTO daily_view_counts (vocadbId, youtubeId, viewCount, dailyIncrease, recordDate)
VALUES (?, ?, ?, 0, date('now'))
```

**새로운:**
```typescript
INSERT INTO daily_view_counts (song_id, recorded_date, total_views)
VALUES (?, date('now'), ?)
ON CONFLICT(song_id, recorded_date) DO UPDATE SET
  total_views = excluded.total_views
```

## 🎯 장점

1. **데이터 정합성**: 원본 데이터만 저장, 계산은 쿼리 시
2. **유연성**: 계산 로직 변경 시 재계산 가능
3. **성능**: 복합 기본 키로 빠른 조회
4. **간결성**: 불필요한 컬럼 제거
5. **정확성**: 보컬로이드 곡만 표시

## ⚠️ 주의사항

- 마이그레이션은 트랜잭션으로 실행되어 실패 시 자동 롤백됩니다
- 기존 데이터는 모두 보존됩니다
- 마이그레이션 전 데이터베이스 백업 권장:
  ```bash
  cp data/vocadb/vocatify.db data/vocadb/vocatify.db.backup
  ```

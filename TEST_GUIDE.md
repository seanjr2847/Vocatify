# YouTube Crawler 수정사항 테스트 가이드

## 사전 준비

1. `.env` 파일에 필수 환경변수 확인:
```bash
DATABASE_URL="your_database_url"
YOUTUBE_API_KEY="your_youtube_api_key"
CRON_SECRET="your_cron_secret"
```

2. 개발 서버 실행:
```bash
npm run dev
```

---

## 테스트 1: 상태 모니터링 엔드포인트 (인증 불필요)

### 새 터미널에서 실행:
```bash
curl http://localhost:3000/api/cron/youtube/status
```

### 예상 결과:
```json
{
  "success": true,
  "summary": {
    "totalChunks": 0,
    "completed": 0,
    "running": 0,
    "failed": 0,
    "totalProcessed": 0,
    "lastRun": null
  },
  "chunks": []
}
```

**✅ 통과 조건**: `success: true` 반환

---

## 테스트 2: 단일 청크 크롤러 실행 (소량 테스트)

### PowerShell에서 실행:
```powershell
$env:CRON_SECRET = "your_cron_secret_here"
curl -X POST "http://localhost:3000/api/cron/youtube?mode=all&chunk=0&totalChunks=10" `
  -H "Authorization: Bearer $env:CRON_SECRET" `
  -H "Content-Type: application/json"
```

### Bash/WSL에서 실행:
```bash
curl -X POST "http://localhost:3000/api/cron/youtube?mode=all&chunk=0&totalChunks=10" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json"
```

### 예상 결과:
```json
{
  "success": true,
  "pvsProcessed": 50,
  "pvsUpdated": 48,
  "titlesUpdated": 12,
  "pvsFailed": 2,
  "lastOffset": 27000,
  "completed": false
}
```

### 로그에서 확인할 내용:
```
🎬 Unified YouTube Crawler v2 - Mode: all
   Chunking: ID-range (vocadbId 1-27000)
   Max PVs per run: 2000
📥 Processing batch: 50 PVs (after PV ID 0)...
   Views updated: 48 PVs
   Titles updated: 12 songs
✅ Reached max PVs limit (2000)
```

**✅ 통과 조건**:
- `success: true`
- `pvsProcessed > 0`
- `completed: false` (2000개 제한으로 완료 안됨)

---

## 테스트 3: Progress 테이블 확인

### PostgreSQL 쿼리 실행:
```sql
-- 청크별 Progress 레코드 확인
SELECT
  crawler_type,
  status,
  total_processed,
  last_offset,
  started_at,
  completed_at
FROM crawler_progress
WHERE crawler_type LIKE 'youtube-unified%'
ORDER BY started_at DESC
LIMIT 10;
```

### 예상 결과:
```
crawler_type                      | status  | total_processed | last_offset | started_at
----------------------------------|---------|-----------------|-------------|------------
youtube-unified-chunk-1-27000     | running | 2000            | 12345       | 2026-01-16
```

**✅ 통과 조건**:
- `crawler_type`에 `chunk-1-27000` 포함 (청크별 고유 키)
- `last_offset`이 0보다 큼 (커서 저장됨)

---

## 테스트 4: 재시도 테스트 (Resume 기능)

### 동일한 청크를 다시 실행:
```bash
curl -X POST "http://localhost:3000/api/cron/youtube?mode=all&chunk=0&totalChunks=10" \
  -H "Authorization: Bearer $CRON_SECRET"
```

### 로그에서 확인할 내용:
```
🔄 Resuming from cursor (PV ID: 12345)
📥 Processing batch: 50 PVs (after PV ID 12345)...
```

**✅ 통과 조건**:
- "Resuming from cursor" 메시지 출력
- 이전 `last_offset`부터 재개

---

## 테스트 5: 다중 청크 동시 실행 (병렬 테스트)

### 3개 청크를 동시에 실행:
```bash
# 터미널 1
curl -X POST "http://localhost:3000/api/cron/youtube?mode=all&chunk=0&totalChunks=10" \
  -H "Authorization: Bearer $CRON_SECRET" &

# 터미널 2
curl -X POST "http://localhost:3000/api/cron/youtube?mode=all&chunk=1&totalChunks=10" \
  -H "Authorization: Bearer $CRON_SECRET" &

# 터미널 3
curl -X POST "http://localhost:3000/api/cron/youtube?mode=all&chunk=2&totalChunks=10" \
  -H "Authorization: Bearer $CRON_SECRET" &
```

### Progress 확인:
```sql
SELECT
  crawler_type,
  status,
  total_processed
FROM crawler_progress
WHERE crawler_type LIKE 'youtube-unified-chunk%'
  AND status = 'running'
ORDER BY crawler_type;
```

### 예상 결과:
```
crawler_type                      | status  | total_processed
----------------------------------|---------|----------------
youtube-unified-chunk-1-27000     | running | 2000
youtube-unified-chunk-27001-54000 | running | 2000
youtube-unified-chunk-54001-81000 | running | 2000
```

**✅ 통과 조건**:
- 3개의 독립적인 Progress 레코드 생성
- 서로의 진행 상황을 덮어쓰지 않음

---

## 테스트 6: 상태 모니터링 (실행 후)

### 다시 상태 확인:
```bash
curl http://localhost:3000/api/cron/youtube/status | jq
```

### 예상 결과:
```json
{
  "success": true,
  "summary": {
    "totalChunks": 3,
    "completed": 0,
    "running": 3,
    "failed": 0,
    "totalProcessed": 6000,
    "lastRun": "2026-01-16T..."
  },
  "chunks": [
    {
      "type": "youtube-unified-chunk-1-27000",
      "status": "running",
      "totalProcessed": 2000,
      "chunkRange": "1-27000"
    },
    {
      "type": "youtube-unified-chunk-27001-54000",
      "status": "running",
      "totalProcessed": 2000,
      "chunkRange": "27001-54000"
    },
    {
      "type": "youtube-unified-chunk-54001-81000",
      "status": "running",
      "totalProcessed": 2000,
      "chunkRange": "54001-81000"
    }
  ]
}
```

**✅ 통과 조건**:
- `totalChunks`: 3
- `totalProcessed`: 6000 (3개 청크 × 2000)
- 각 청크의 `chunkRange` 올바르게 표시

---

## 테스트 7: 데이터베이스 업데이트 확인

### 오늘 업데이트된 PV 수 확인:
```sql
SELECT COUNT(*) as updated_today
FROM pvs
WHERE view_count_updated_at >= CURRENT_DATE;
```

### 예상 결과:
```
updated_today
-------------
6000
```

**✅ 통과 조건**: 6000개 이상 (3개 청크 × 2000)

### DailyViewCount 레코드 생성 확인:
```sql
SELECT COUNT(*) as daily_records_today
FROM daily_view_counts
WHERE recorded_date = CURRENT_DATE;
```

**✅ 통과 조건**: 6000개 이상

---

## 문제 해결 (Troubleshooting)

### 문제 1: "No crawler progress found"
**원인**: 아직 크롤러를 실행하지 않음
**해결**: 테스트 2를 먼저 실행

### 문제 2: "YouTube API error: 403"
**원인**: `YOUTUBE_API_KEY` 없거나 할당량 초과
**해결**: `.env` 파일에서 API 키 확인

### 문제 3: "Unauthorized"
**원인**: `CRON_SECRET` 없거나 틀림
**해결**: `Authorization: Bearer` 헤더에 올바른 값 사용

### 문제 4: Progress 레코드가 계속 "running"
**원인**: 이전 테스트가 완료되지 않음
**해결**: 수동으로 리셋
```sql
UPDATE crawler_progress
SET status = 'failed',
    completed_at = NOW(),
    error_message = 'Manually reset for testing'
WHERE crawler_type LIKE 'youtube-unified-chunk%'
  AND status = 'running';
```

---

## 최종 검증 체크리스트

- [ ] 상태 엔드포인트가 응답함 (테스트 1)
- [ ] 단일 청크가 독립적으로 실행됨 (테스트 2)
- [ ] Progress 테이블에 청크별 고유 키 생성 (테스트 3)
- [ ] 재시도 시 커서 위치에서 재개됨 (테스트 4)
- [ ] 다중 청크가 동시 실행되며 충돌 없음 (테스트 5)
- [ ] 상태 모니터링이 모든 청크 표시 (테스트 6)
- [ ] 데이터베이스에 실제 업데이트 반영됨 (테스트 7)

모든 체크리스트 통과 시 ✅ **프로덕션 배포 준비 완료**

---

## GitHub Actions 테스트 (선택)

### 수동 Workflow 실행:
1. GitHub 저장소로 이동
2. Actions 탭 클릭
3. "Daily Data Crawlers" 선택
4. "Run workflow" → "Run workflow" 클릭

### 로그 확인:
- 10개 청크가 병렬 실행되는지 확인
- 각 청크의 자동 재시도 (최대 20라운드) 확인
- 완료 후 총 처리량 확인 (20만~27만개 예상)

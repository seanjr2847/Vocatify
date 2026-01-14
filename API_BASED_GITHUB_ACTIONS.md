# API 기반 GitHub Actions 전환

## 변경 사항

GitHub Actions가 데이터베이스에 직접 연결하는 대신 **Vercel API를 호출**하도록 변경했습니다.

### 이전 구조 (문제 있음)
```
GitHub Actions → Neon DB 직접 연결
├─ DATABASE_URL 시크릿 필요 ❌
├─ Prisma Client 설치 필요
└─ 연결 실패 시 디버깅 어려움
```

### 새로운 구조 (해결됨)
```
GitHub Actions → Vercel API → Neon DB
├─ VERCEL_URL + CRON_SECRET만 필요 ✅
├─ Vercel이 DB 연결 관리
└─ 한 곳에서만 DATABASE_URL 설정
```

## 장점

### 1. GitHub Secrets 단순화
- ❌ 삭제: `DATABASE_URL` (더 이상 GitHub에 불필요)
- ❌ 삭제: `YOUTUBE_API_KEY` (Vercel에만 있으면 됨)
- ✅ 유지: `VERCEL_URL` (Vercel 배포 주소)
- ✅ 유지: `CRON_SECRET` (API 인증)

### 2. 보안 향상
- 데이터베이스 자격증명이 GitHub에 저장 안 됨
- API 토큰으로만 접근 제어
- Vercel에서 환경 변수 중앙 관리

### 3. 유지보수 간편
- DATABASE_URL 변경 시 Vercel에서만 수정
- 연결 설정을 한 곳에서 관리
- 일관된 connection pooling 설정

### 4. 디버깅 용이
- Vercel 로그에서 모든 요청 확인 가능
- API 응답으로 명확한 에러 메시지
- 로컬에서도 같은 엔드포인트 테스트 가능

## 수정된 파일

### 1. `/app/api/cron/youtube/route.ts`
**추가된 파라미터:**
```typescript
// URL 파라미터로 chunk 지원
?chunk=4&totalChunks=10
```

**새로운 기능:**
- chunk 인덱스와 total chunks를 받아서
- vocadbId 범위 자동 계산
- 해당 범위의 곡만 처리

**사용 예시:**
```bash
# Chunk 0 처리 (전체 10개 중)
POST /api/cron/youtube?mode=all&chunk=0&totalChunks=10

# Chunk 4 처리
POST /api/cron/youtube?mode=all&chunk=4&totalChunks=10
```

### 2. `/.github/workflows/daily-crawlers.yml`
**변경 사항:**
- ❌ 삭제: Node.js 설치, npm ci, Prisma generate
- ❌ 삭제: DATABASE_URL, YOUTUBE_API_KEY 환경 변수
- ✅ 추가: Vercel API 호출 (curl)
- ✅ 유지: 10개 병렬 chunk 실행

**새로운 워크플로우:**
```yaml
steps:
  - name: Trigger YouTube Cron Endpoint (Chunk 4)
    env:
      VERCEL_URL: ${{ secrets.VERCEL_URL }}
      CRON_SECRET: ${{ secrets.CRON_SECRET }}
    run: |
      curl -X POST "$VERCEL_URL/api/cron/youtube?chunk=4&totalChunks=10" \
        -H "Authorization: Bearer $CRON_SECRET"
```

## 테스트 방법

### 로컬에서 테스트
```bash
# 단일 chunk 테스트
curl -X POST "http://localhost:3000/api/cron/youtube?mode=all&chunk=0&totalChunks=10" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# 응답 예시
{
  "success": true,
  "data": {
    "mode": "all",
    "chunk": "1/10",
    "pvsProcessed": 18234,
    "pvsUpdated": 17891,
    "titlesUpdated": 12456
  }
}
```

### GitHub Actions 수동 실행
1. GitHub 저장소 → Actions 탭
2. "Daily Crawlers" 워크플로우 선택
3. "Run workflow" → "youtube" 선택
4. 실행 후 로그 확인

## 필요한 시크릿 확인

### GitHub Secrets (2개만 필요)
```
Repository → Settings → Secrets and variables → Actions
```

**필수:**
- ✅ `VERCEL_URL` - Vercel 배포 주소
  - 예: `https://vocatify.vercel.app`
- ✅ `CRON_SECRET` - API 인증 토큰
  - .env 파일의 CRON_SECRET과 동일한 값

**불필요 (삭제 가능):**
- ❌ `DATABASE_URL` - 더 이상 GitHub Actions에서 안 씀
- ❌ `YOUTUBE_API_KEY` - Vercel 환경 변수로 충분

### Vercel 환경 변수
```
Vercel Dashboard → Project → Settings → Environment Variables
```

**필수:**
- ✅ `DATABASE_URL` - Neon PostgreSQL 연결 문자열
- ✅ `YOUTUBE_API_KEY` - YouTube Data API v3 키
- ✅ `CRON_SECRET` - API 인증 토큰

## 마이그레이션 체크리스트

- [x] Vercel API 엔드포인트에 chunk 지원 추가
- [x] GitHub Actions 워크플로우를 API 호출 방식으로 변경
- [ ] GitHub에서 `VERCEL_URL` 시크릿 확인/설정
- [ ] GitHub에서 `CRON_SECRET` 시크릿 확인/설정
- [ ] (선택) GitHub에서 `DATABASE_URL` 시크릿 삭제
- [ ] (선택) GitHub에서 `YOUTUBE_API_KEY` 시크릿 삭제
- [ ] Vercel 환경 변수 모두 설정되어 있는지 확인
- [ ] 로컬에서 API 엔드포인트 테스트
- [ ] GitHub Actions 수동 실행으로 테스트
- [ ] Git 커밋 및 푸시

## 실행 흐름

### 예약 실행 (매일 15:00 UTC)
```
1. GitHub Actions 트리거 (10개 병렬 job)
2. 각 job이 Vercel API 호출
   - Job 0: /api/cron/youtube?chunk=0&totalChunks=10
   - Job 1: /api/cron/youtube?chunk=1&totalChunks=10
   - ...
   - Job 9: /api/cron/youtube?chunk=9&totalChunks=10
3. Vercel API가 chunk별 ID 범위 계산
4. UnifiedYouTubeCrawler 실행
5. 결과 JSON 반환
6. GitHub Actions가 HTTP 200 확인
```

### Chunk 처리 로직
```typescript
// Chunk 4/10 예시
globalMinId = 1
globalMaxId = 100000
totalIdRange = 100000
idsPerChunk = 10000

chunk 4:
  minVocadbId = 1 + (4 * 10000) = 40001
  maxVocadbId = 1 + (5 * 10000) - 1 = 50000

→ vocadbId가 40001~50000인 곡들만 처리
```

## 예상 결과

### 성공 케이스
```json
{
  "success": true,
  "message": "Unified YouTube crawler completed successfully",
  "data": {
    "mode": "all",
    "chunk": "4/10",
    "updateLocalizations": true,
    "pvsProcessed": 18234,
    "pvsUpdated": 17891,
    "titlesUpdated": 12456,
    "pvsFailed": 343,
    "completed": true,
    "duration": "187.3s"
  }
}
```

### 실패 케이스
```json
{
  "success": false,
  "message": "Unified YouTube crawler failed",
  "error": "YouTube API quota exceeded",
  "data": {
    "pvsProcessed": 5000,
    "pvsUpdated": 4800,
    "duration": "45.2s"
  }
}
```

## 문제 해결

### Q: "Unauthorized" 에러
**A:** CRON_SECRET 시크릿이 설정 안 되어 있거나 Vercel 환경 변수와 다름
```bash
# 확인
echo $CRON_SECRET

# GitHub Secret과 Vercel 환경 변수가 동일한지 확인
```

### Q: "Can't reach Vercel"
**A:** VERCEL_URL이 잘못 설정됨
```bash
# 올바른 형식
VERCEL_URL=https://vocatify.vercel.app

# 잘못된 형식
VERCEL_URL=https://vocatify.vercel.app/  ❌ (끝에 / 없어야 함)
VERCEL_URL=vocatify.vercel.app           ❌ (https:// 필요)
```

### Q: Chunk가 처리 안 됨
**A:** Vercel 서버리스 함수 타임아웃 (60초)
- chunk당 처리할 곡 수 줄이기
- totalChunks 증가 (10 → 20)
- maxPVsPerRun 감소 (500 → 300)

## 롤백 방법

만약 문제가 생기면 이전 방식으로 되돌릴 수 있습니다:

```bash
# 1. Git 이전 커밋으로 되돌리기
git revert HEAD

# 2. 또는 이전 워크플로우 파일 복원
git checkout HEAD~1 -- .github/workflows/daily-crawlers.yml

# 3. DATABASE_URL 시크릿 다시 추가
# GitHub Settings에서 수동으로 추가
```

## 다음 단계

1. ✅ 코드 변경 완료
2. ⏳ Git 커밋 및 푸시
3. ⏳ Vercel에 자동 배포
4. ⏳ GitHub Actions 수동 테스트
5. ⏳ 다음 예약 실행 확인 (15:00 UTC)

모든 준비 완료! 🚀

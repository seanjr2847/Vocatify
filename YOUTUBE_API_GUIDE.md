# YouTube 조회수 수집 가이드

## 📋 목차
1. [YouTube API 키 발급](#youtube-api-키-발급)
2. [환경 설정](#환경-설정)
3. [사용 방법](#사용-방법)
4. [성능 및 비용](#성능-및-비용)
5. [문제 해결](#문제-해결)

## 🔑 YouTube API 키 발급

### 1. Google Cloud Console 접속
https://console.cloud.google.com/

### 2. 프로젝트 생성
- "새 프로젝트" 클릭
- 프로젝트 이름: `Vocatify` (또는 원하는 이름)
- 프로젝트 생성 완료

### 3. YouTube Data API v3 활성화
1. 좌측 메뉴 → "API 및 서비스" → "라이브러리"
2. "YouTube Data API v3" 검색
3. "사용 설정" 클릭

### 4. API 키 생성
1. 좌측 메뉴 → "API 및 서비스" → "사용자 인증 정보"
2. "+ 사용자 인증 정보 만들기" → "API 키" 선택
3. API 키 복사

### 5. API 키 제한 설정 (권장)
- "키 제한" 탭 클릭
- "API 제한사항"에서 "키 제한"
- "YouTube Data API v3" 선택
- 저장

## ⚙️ 환경 설정

### 1. .env 파일 생성
```bash
# 프로젝트 루트에 .env 파일 생성
cp .env.example .env
```

### 2. API 키 입력
```env
# .env 파일 편집
YOUTUBE_API_KEY=발급받은-API-키-입력
```

### 3. .gitignore 확인
```bash
# .env 파일이 git에 포함되지 않도록 확인
cat .gitignore | grep .env
# .env 가 있어야 함
```

## 🚀 사용 방법

### 기본 명령어

#### 1. 신규 곡 조회수 수집 (추천 - 첫 실행)
```bash
npm run youtube:new
```
- viewCount가 NULL인 곡만 업데이트
- 첫 실행 시 전체 27만 곡 처리
- 예상 소요 시간: 약 2-3시간

#### 2. 오래된 데이터 업데이트
```bash
npm run youtube:old
```
- 7일 이상 업데이트 안 된 곡 우선 처리
- 정기 업데이트용

#### 3. 전체 업데이트
```bash
npm run youtube:all
```
- 모든 곡의 조회수 갱신
- 월 1회 권장

#### 4. 인기곡만 빠른 업데이트
```bash
npm run youtube:top
```
- 인기도 상위 1,000곡만 업데이트
- 일일 차트 갱신용
- 소요 시간: 약 2-3분

### 실행 예시

```bash
# 첫 실행 - 전체 곡 조회수 수집
npm run youtube:new

# 출력:
🎬 YouTube 조회수 수집 시작

모드: new
  - new: viewCount가 NULL인 곡만
  - old: 7일 이상 된 데이터 우선
  - all: 전체 업데이트
  - top: 인기곡 1000개만

✅ viewCount 컬럼 추가됨
✅ viewCountUpdatedAt 컬럼 추가됨
✅ 인덱스 생성 완료

📊 현재 상태:
  전체 곡: 276,999곡
  조회수 있음: 0곡 (0.0%)
  조회수 없음: 276,999곡

🎯 업데이트 대상: 276,999곡

📊 배치 1/5540: 50/276,999곡 (0.0%) | 0.1분 경과 | ETA: 92.5분
📊 배치 2/5540: 100/276,999곡 (0.0%) | 0.2분 경과 | ETA: 92.3분
...
```

## 📊 성능 및 비용

### API 할당량
- **무료 할당량**: 10,000 units/일
- **비디오 조회 비용**: 1 unit/요청
- **배치 크기**: 50개 비디오/요청

### 처리 능력
```
27만 곡 ÷ 50개/배치 = 5,540 API 호출
5,540 호출 ÷ 10,000 할당량 = 0.554일
→ 하루 안에 전체 수집 가능!
```

### 실제 소요 시간
- **27만 곡 전체**: 약 2-3시간
  - API 호출: ~2분
  - Rate limiting 대기: ~2시간
  - DB 업데이트: ~30분

- **상위 1,000곡**: 약 2-3분
  - API 호출: 20회
  - 딜레이: 2초

### 비용 산정
```
무료 범위:
- 일일 10,000 units (무료)
- 월 300,000 units (무료)

초과 시:
- $0.10 per 1,000 units
- 27만 곡 = 5,540 units (무료)
- 매일 업데이트해도 무료! ✅
```

## 🔄 권장 업데이트 전략

### 전략 1: 계층별 업데이트 (최적)
```bash
# 월요일: 전체 업데이트
npm run youtube:all

# 화-일: 인기곡만
npm run youtube:top
```

### 전략 2: 증분 업데이트
```bash
# 매일: 신규 + 오래된 데이터
npm run youtube:new && npm run youtube:old
```

### 전략 3: 주간 업데이트
```bash
# 주 1회: 오래된 데이터 위주
npm run youtube:old
```

## 🎯 데이터베이스 스키마

### 추가된 컬럼
```sql
-- 조회수
viewCount INTEGER

-- 마지막 업데이트 시각
viewCountUpdatedAt TEXT

-- 인덱스
CREATE INDEX idx_viewcount ON songs(viewCount DESC);
CREATE INDEX idx_viewcount_updated ON songs(viewCountUpdatedAt);
```

### 조회 예시
```sql
-- 조회수 TOP 10
SELECT title, artist, viewCount, youtubeUrl
FROM songs
WHERE viewCount IS NOT NULL
ORDER BY viewCount DESC
LIMIT 10;

-- 업데이트 통계
SELECT
  COUNT(*) as total,
  COUNT(viewCount) as with_views,
  ROUND(COUNT(viewCount) * 100.0 / COUNT(*), 2) as percentage
FROM songs;

-- 오늘 업데이트된 곡
SELECT COUNT(*) as updated_today
FROM songs
WHERE date(viewCountUpdatedAt) = date('now');
```

## ⚠️ 문제 해결

### 1. API 키 오류
```
❌ YOUTUBE_API_KEY 환경변수가 필요합니다.
```

**해결:**
```bash
# .env 파일 확인
cat .env

# API 키가 올바르게 입력되었는지 확인
# 따옴표 없이 입력: YOUTUBE_API_KEY=AIzaSy...
```

### 2. API 할당량 초과
```
YouTube API error: 403 - quotaExceeded
```

**해결:**
- 다음날까지 대기 (할당량은 태평양 표준시 자정에 리셋)
- 또는 Google Cloud Console에서 추가 할당량 요청

### 3. Rate Limit 오류
```
YouTube API error: 429 - rateLimitExceeded
```

**해결:**
- 스크립트가 자동으로 100ms 딜레이 적용
- 필요 시 `DELAY_MS` 값 증가 (코드 수정)

### 4. 네트워크 오류
```
❌ API 호출 실패: fetch failed
```

**해결:**
- 인터넷 연결 확인
- 방화벽 설정 확인
- YouTube API 서비스 상태 확인

### 5. 일부 곡 조회수 없음
```
✅ 완료!
업데이트된 곡: 250,000곡 (목표 276,999곡)
```

**원인:**
- 비공개/삭제된 YouTube 영상
- 잘못된 YouTube ID

**확인:**
```sql
-- 조회수 없는 곡 확인
SELECT title, youtubeUrl
FROM songs
WHERE viewCount IS NULL
LIMIT 10;
```

## 📈 진행률 모니터링

### 실시간 통계 확인
```sql
-- SQLite DB 연결
sqlite3 data/vocadb/vocatify.db

-- 업데이트 진행률
SELECT
  COUNT(*) as total_songs,
  COUNT(viewCount) as songs_with_views,
  ROUND(COUNT(viewCount) * 100.0 / COUNT(*), 2) as progress_percent,
  MAX(viewCountUpdatedAt) as last_update
FROM songs;
```

### 조회수 분포
```sql
-- 조회수 구간별 곡 수
SELECT
  CASE
    WHEN viewCount < 1000 THEN '0-1K'
    WHEN viewCount < 10000 THEN '1K-10K'
    WHEN viewCount < 100000 THEN '10K-100K'
    WHEN viewCount < 1000000 THEN '100K-1M'
    ELSE '1M+'
  END as view_range,
  COUNT(*) as song_count
FROM songs
WHERE viewCount IS NOT NULL
GROUP BY view_range
ORDER BY MIN(viewCount);
```

## 🎓 팁

### 1. 백그라운드 실행
```bash
# nohup으로 백그라운드 실행
nohup npm run youtube:new > youtube-log.txt 2>&1 &

# 진행률 확인
tail -f youtube-log.txt
```

### 2. 중단 및 재시작
- 스크립트는 중단 후 재실행 가능
- 이미 업데이트된 곡은 건너뜀 (중복 방지)

### 3. 성능 최적화
```typescript
// update-viewcounts.ts 수정
const DELAY_MS = 50; // 딜레이 줄이기 (주의: Rate limit)
```

### 4. 로그 저장
```bash
# 로그 파일로 저장
npm run youtube:new 2>&1 | tee youtube-$(date +%Y%m%d).log
```

## 📚 참고 자료

- [YouTube Data API v3 문서](https://developers.google.com/youtube/v3)
- [할당량 계산기](https://developers.google.com/youtube/v3/determine_quota_cost)
- [API 키 관리](https://console.cloud.google.com/apis/credentials)

## 🆘 지원

문제가 발생하면:
1. 이 가이드의 "문제 해결" 섹션 확인
2. GitHub Issues 등록
3. API 키가 올바른지 재확인

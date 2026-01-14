# YouTube API 할당량 확인 가이드

## 🔍 실시간 할당량 확인 방법

### 방법 1: Google Cloud Console (가장 정확)

**1단계: Google Cloud Console 접속**
```
https://console.cloud.google.com
```

**2단계: 프로젝트 선택**
- 상단에서 YouTube API 키를 생성한 프로젝트 선택

**3단계: API 및 서비스 → 사용자 인증 정보**
```
왼쪽 메뉴: APIs & Services → Credentials
```

**4단계: 할당량 페이지로 이동**
```
왼쪽 메뉴: APIs & Services → Enabled APIs and services
→ YouTube Data API v3 클릭
→ 상단 "Quotas" 탭 클릭
```

**확인 가능한 정보:**
- ✅ 일일 할당량: 10,000 units (기본)
- ✅ 현재 사용량: X units
- ✅ 남은 할당량: 10,000 - X units
- ✅ 리셋 시간: 매일 자정 (PST, 태평양 표준시)

---

### 방법 2: Google Cloud Console - 대시보드

**직접 링크:**
```
https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas
```

**단계:**
1. 위 링크 접속
2. 프로젝트 선택
3. "Queries per day" 확인
   - Limit: 10,000
   - Usage: 현재 사용량
   - Remaining: 남은 할당량

**그래프:**
- 시간대별 사용량 그래프 제공
- 지난 7일간 사용 패턴 확인 가능

---

### 방법 3: 커맨드라인으로 확인

**Google Cloud CLI 설치 (선택사항):**
```bash
# Windows
choco install gcloudsdk

# Mac
brew install --cask google-cloud-sdk
```

**할당량 확인 명령어:**
```bash
# 1. 로그인
gcloud auth login

# 2. 프로젝트 설정
gcloud config set project YOUR_PROJECT_ID

# 3. API 할당량 확인
gcloud services list --enabled --filter="youtube"

# 4. 상세 할당량 확인
gcloud services quota list --service=youtube.googleapis.com
```

---

## 📊 할당량 계산

### YouTube Data API v3 비용

| 작업 | 할당량 비용 | 설명 |
|------|------------|------|
| **videos.list** | 1 unit | 비디오 정보 조회 (통계, 스니펫, 로컬라이제이션) |
| search.list | 100 units | 검색 (사용 안 함) |
| channels.list | 1 unit | 채널 정보 (사용 안 함) |
| playlists.list | 1 unit | 재생목록 (사용 안 함) |

### Vocatify 사용량 계산

**현재 구조:**
- 배치 크기: 50개 비디오
- 요청당 할당량: 1 unit
- 배치당 50개 비디오 = 1 unit (일괄 조회)

**일일 처리 가능량:**
```
일일 할당량: 10,000 units
배치 크기: 50 videos
---------------------------------
최대 처리: 10,000 × 50 = 500,000 videos/day
```

**실제 Vocatify 사용량 (예상):**
```
전체 PV 수: ~200,000개
배치 크기: 50개
---------------------------------
필요 요청 수: 200,000 ÷ 50 = 4,000 requests
필요 할당량: 4,000 units

남은 할당량: 10,000 - 4,000 = 6,000 units ✅
```

**결론:** 할당량 충분! 40%만 사용 🎉

---

## ⚠️ 할당량 초과 시 증상

### 1. API 에러 응답
```json
{
  "error": {
    "code": 403,
    "message": "The request cannot be completed because you have exceeded your quota.",
    "errors": [
      {
        "reason": "quotaExceeded",
        "domain": "youtube.quota"
      }
    ]
  }
}
```

### 2. Crawler 로그
```
💥 YouTube API Error (403): Quota exceeded
⚠️  Remaining PVs will be skipped until quota resets
📅 Quota resets at: 2026-01-14 08:00 PST (17:00 KST)
```

### 3. GitHub Actions 실패
```
YouTube crawler chunk 4 failed with status 500
Error: quotaExceeded
```

---

## 🚀 할당량 모니터링 자동화

### 방법 1: Google Cloud Monitoring (추천)

**설정:**
1. Google Cloud Console → Monitoring
2. Create Alert Policy
3. Condition 설정:
   ```
   Resource: youtube.googleapis.com
   Metric: Quota usage
   Threshold: > 8,000 units (80%)
   ```
4. Notification: 이메일 또는 Slack

**효과:**
- 할당량 80% 도달 시 자동 알림
- 초과 전 대응 가능

### 방법 2: API 응답에서 확인

**YouTube API 응답 헤더:**
```http
X-RateLimit-Remaining: 6000
X-RateLimit-Limit: 10000
X-RateLimit-Reset: 1705276800
```

**Crawler에 로깅 추가 (선택사항):**
```typescript
// lib/crawlers/unified-youtube-crawler.ts
private async fetchYouTubeData(videoIds: string[]) {
  const response = await fetch(url);

  // 할당량 정보 로깅
  const remaining = response.headers.get('X-RateLimit-Remaining');
  const limit = response.headers.get('X-RateLimit-Limit');
  console.log(`📊 API Quota: ${remaining}/${limit} remaining`);

  if (parseInt(remaining) < 1000) {
    console.warn('⚠️  API quota running low!');
  }
}
```

---

## 💡 할당량 절약 팁

### 1. 배치 크기 최적화
```typescript
// 현재: 50개씩 (최적)
batchSize: 50  // YouTube API 최대 50개

// ❌ 나쁜 예: 10개씩
batchSize: 10  // 5배 더 많은 요청 필요
```

### 2. 불필요한 필드 제외
```typescript
// 현재: 필요한 필드만 요청
part=statistics,snippet,localizations

// ❌ 나쁜 예: 모든 필드 요청
part=statistics,snippet,contentDetails,localizations,player,status,topicDetails
// 더 많은 데이터 = 더 느림 (할당량은 동일)
```

### 3. 업데이트 빈도 최적화
```typescript
// 현재 전략 (최적)
new: 30일 이내 또는 미업데이트
old: 90일 이상 미업데이트
top: 100만 뷰 이상

// 모든 곡을 매일 업데이트할 필요 없음!
```

### 4. 에러 처리 개선
```typescript
// 할당량 초과 시 graceful 종료
if (error.code === 403 && error.reason === 'quotaExceeded') {
  console.log('⏸️  Pausing due to quota limit');
  return {
    success: false,
    error: 'Quota exceeded, will retry tomorrow',
    shouldRetry: false  // 내일까지 기다림
  };
}
```

---

## 📅 할당량 리셋 시간

**리셋 주기:** 매일 자정 (PST)
**한국 시간:** 매일 오후 5시 (KST, 여름) 또는 오후 6시 (겨울)

**계산:**
```
PST 00:00 → KST 17:00 (여름, PDT 적용)
PST 00:00 → KST 18:00 (겨울, PST 적용)
```

**Cron 스케줄과 비교:**
```yaml
# YouTube crawler: 15:00 UTC = 00:00 KST (자정)
# 할당량 리셋: 00:00 PST = 17:00 KST (오후 5시)

# ✅ 문제 없음: Crawler 실행 후 17시간 뒤 리셋
# 충분한 여유 시간!
```

---

## 🔧 할당량 증가 신청

### 기본 할당량이 부족할 경우

**증가 신청 방법:**
1. Google Cloud Console 접속
2. APIs & Services → Quotas
3. YouTube Data API v3 선택
4. "Queries per day" 체크
5. "Edit Quotas" 클릭
6. 신청서 작성:
   - 현재 사용량 설명
   - 증가 필요 이유
   - 예상 사용량

**승인 시간:** 보통 2-3일
**증가 가능량:** 최대 1,000,000 units/day

**Vocatify 필요성:**
- 현재: 4,000 units/day (40% 사용)
- 증가 필요: ❌ 불필요 (충분함)

---

## 📱 실시간 모니터링 대시보드 (선택)

### 간단한 확인 스크립트

**파일: `scripts/check-quota.ts`**
```typescript
import { google } from 'googleapis';

async function checkQuota() {
  const youtube = google.youtube({
    version: 'v3',
    auth: process.env.YOUTUBE_API_KEY
  });

  try {
    // 간단한 API 호출로 할당량 상태 확인
    const response = await youtube.videos.list({
      part: ['id'],
      id: ['dQw4w9WgXcQ'],  // 테스트 비디오
    });

    console.log('✅ API 정상 작동');
    console.log('💡 응답 헤더에서 할당량 확인 필요');

    // 헤더에서 할당량 정보 추출
    // (실제로는 Google Cloud Console에서 확인 권장)
  } catch (error: any) {
    if (error.code === 403) {
      console.log('❌ 할당량 초과!');
      console.log('📅 리셋 시간: 내일 오후 5시 (KST)');
    }
  }
}

checkQuota();
```

**실행:**
```bash
npx tsx scripts/check-quota.ts
```

---

## ✅ 요약: 빠른 확인 방법

### 가장 쉬운 방법 (추천)

**1. Google Cloud Console 접속**
```
https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas
```

**2. 프로젝트 선택**

**3. "Queries per day" 확인**
- Limit: 10,000
- Usage: X (현재 사용)
- **Remaining: 10,000 - X** ← 이거 확인!

**4. 그래프로 사용 패턴 확인**
- 어제 사용량
- 오늘 사용량
- 예상 소진 시간

---

## 🎯 Vocatify 권장 모니터링 주기

| 시기 | 확인 방법 | 목적 |
|------|----------|------|
| **배포 전** | Console 확인 | 초기 상태 확인 |
| **첫 실행 후** | Console 확인 | 실제 사용량 측정 |
| **일주일 후** | Console 확인 | 사용 패턴 분석 |
| **이후** | 월 1회 | 정기 모니터링 |
| **에러 발생 시** | 즉시 확인 | 할당량 초과 여부 |

**자동 알림 설정:** Google Cloud Monitoring (80% 도달 시 알림)

---

## 🚨 긴급 상황 대응

### 할당량이 갑자기 소진된 경우

**원인 분석:**
1. Console → Quotas → Usage 그래프 확인
2. 어느 시간대에 급증했는지 확인
3. GitHub Actions 로그 확인

**대응 방법:**
1. **단기:** 내일까지 대기 (자동 리셋)
2. **중기:** 업데이트 빈도 조정
3. **장기:** 할당량 증가 신청

**예방:**
```typescript
// 할당량 체크 로직 추가
if (apiCallsToday > 8000) {
  console.log('⚠️  Approaching quota limit, pausing...');
  return;
}
```

지금 바로 확인해보시겠어요? 🔍

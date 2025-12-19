# VocaDB Crawler 가이드 🎵

VocaDB API를 사용하여 보컬로이드 곡 정보를 크롤링하는 스크립트입니다.

## 📋 크롤링 데이터

다음 정보를 수집합니다:
- ✅ **곡 제목** (한국어/일본어/영어)
- ✅ **아티스트** (보컬로이드 가수 이름)
- ✅ **YouTube 비디오 ID**
- ✅ **YouTube URL**
- ✅ **곡 타입** (Original, Remaster, Remix 등)
- ✅ **발행일**

## 🚀 사용 방법

### 1. 테스트 크롤링 (100곡)

```bash
npm run crawl:test
```

- 100곡만 가져옴
- 배치 크기: 10곡
- 빠르게 테스트용

### 2. 기본 크롤링 (1,000곡)

```bash
npm run crawl
```

- 1,000곡 가져옴
- 배치 크기: 50곡
- 일반적인 사용

### 3. 전체 크롤링 (50,000곡)

```bash
npm run crawl:full
```

- 50,000곡 가져옴
- 배치 크기: 100곡
- 대규모 데이터 수집

### 4. 커스텀 크롤링

```bash
npx tsx scripts/crawler/vocadb-crawler.ts [총곡수] [배치크기]

# 예시: 500곡, 배치 25곡씩
npx tsx scripts/crawler/vocadb-crawler.ts 500 25
```

## 📂 저장 위치

크롤링한 데이터는 다음 위치에 저장됩니다:

```
data/vocadb/vocadb-songs.json
```

## 📊 데이터 형식

```json
[
  {
    "vocadbId": 12345,
    "title": "メルト",
    "artist": "初音ミク",
    "youtubeId": "dQw4w9WgXcQ",
    "youtubeUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "songType": "Original",
    "publishDate": "2007-12-07T00:00:00",
    "crawledAt": "2024-01-15T10:30:00.000Z"
  }
]
```

## ⚙️ 설정

`vocadb-crawler.ts` 파일에서 다음을 수정할 수 있습니다:

```typescript
// API 요청 간격 (기본: 1초)
const REQUEST_DELAY = 1000;

// User-Agent (자신의 프로젝트 정보로 변경)
const USER_AGENT = 'Vocatify/1.0 (https://github.com/yourproject)';

// 곡 타입 필터
songTypes: ['Original']  // Original만 또는 ['Original', 'Remaster', 'Remix']
```

## 🔄 중복 처리

- 기존 데이터를 자동으로 확인
- `vocadbId` 기준으로 중복 제거
- 새로운 곡만 추가 저장
- 중간 저장 (100곡마다)으로 안전성 확보

## 📈 진행 상황

크롤링 중 다음 정보를 실시간으로 확인할 수 있습니다:

```
🚀 VocaDB 크롤링 시작
   - 목표: 1000곡
   - 배치 크기: 50곡
   - 곡 타입: Original

📥 배치 1 - 인덱스 0부터 가져오는 중...
   받은 곡: 50개 (전체: 245632개)
   YouTube 있는 곡: 48개

⏳ 1000ms 대기...
```

## ⚠️ 주의사항

### API 사용 제한

VocaDB API는 무료지만, 다음을 권장합니다:
- ✅ 요청 간 1초 이상 딜레이
- ✅ 커스텀 User-Agent 사용
- ✅ 응답 캐싱
- ❌ 과도한 요청 금지

### 데이터 품질

- YouTube 정보가 없는 곡은 자동 제외
- Original 타입 곡만 기본 수집 (필요시 변경 가능)
- VocaDB에 등록된 최신 곡부터 수집

## 🛠️ 트러블슈팅

### API 요청 실패

```
❌ API 요청 에러: Error: fetch failed
```

**해결 방법:**
- 인터넷 연결 확인
- VocaDB 서버 상태 확인 (https://vocadb.net)
- 방화벽/프록시 설정 확인

### 메모리 부족

대규모 크롤링 시 메모리 부족이 발생할 수 있습니다.

**해결 방법:**
- 배치 크기를 줄이기
- 100곡마다 중간 저장 (자동)
- 여러 번 나눠서 실행

### 데이터 저장 실패

```
❌ 파일 저장 에러
```

**해결 방법:**
- `data/vocadb/` 폴더 생성 확인
- 쓰기 권한 확인
- 디스크 공간 확인

## 📚 VocaDB API 문서

공식 문서와 리소스:
- [VocaDB API 문서](https://wiki.vocadb.net/docs/public-api)
- [VocaDB GitHub](https://github.com/VocaDB/vocadb)
- [VocaDB 웹사이트](https://vocadb.net)

## 🔄 다음 단계

크롤링 완료 후:

1. **데이터 검증**
   ```bash
   # JSON 파일 확인
   cat data/vocadb/vocadb-songs.json | jq length
   ```

2. **데이터베이스 저장**
   - PostgreSQL에 임포트
   - Prisma로 마이그레이션

3. **YouTube 조회수 수집**
   - YouTube Data API 사용
   - 일일 크론잡 설정

4. **차트 생성**
   - 조회수 기반 랭킹
   - 일간/주간/월간 차트

## 💡 팁

### 점진적 크롤링

처음에는 작은 규모로 시작하세요:

```bash
# 1단계: 테스트 (100곡)
npm run crawl:test

# 2단계: 중간 규모 (1,000곡)
npm run crawl

# 3단계: 대규모 (필요한 만큼)
npm run crawl:full
```

### 크론잡 설정

매일 새로운 곡 수집:

```bash
# crontab -e
0 3 * * * cd /path/to/vocatify && npm run crawl >> logs/crawler.log 2>&1
```

### 데이터 백업

크롤링한 데이터는 정기적으로 백업하세요:

```bash
cp data/vocadb/vocadb-songs.json data/vocadb/backup-$(date +%Y%m%d).json
```

## 📊 예상 크롤링 시간

| 곡 수 | 배치 크기 | 예상 시간 |
|-------|-----------|-----------|
| 100 | 10 | ~20초 |
| 1,000 | 50 | ~3분 |
| 10,000 | 100 | ~17분 |
| 50,000 | 100 | ~83분 |

※ API 요청 간격 1초 기준

---

**Sources:**
- [VocaDB Public API Documentation](https://wiki.vocadb.net/docs/public-api)
- [VocaDB GitHub Repository](https://github.com/VocaDB/vocadb)

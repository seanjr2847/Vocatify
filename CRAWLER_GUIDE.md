# VocaDB 크롤러 사용 가이드 🎵

VocaDB에서 보컬로이드 곡 정보 + YouTube 비디오 ID를 크롤링합니다!

## ✅ 크롤링 완료!

50곡 테스트 완료! 총 814,814곡이 VocaDB에 등록되어 있습니다.

## 🚀 빠른 시작

### 1. 테스트 크롤링 (100곡)

```bash
npm run crawl:test
```

**예상 시간**: ~20초

### 2. 빠른 크롤링 (500곡)

```bash
npm run crawl:quick
```

**예상 시간**: ~1분

### 3. 기본 크롤링 (1,000곡)

```bash
npm run crawl
```

**예상 시간**: ~3분

### 4. 대규모 크롤링 (10,000곡)

```bash
npm run crawl:full
```

**예상 시간**: ~17분

## 📊 크롤링 결과

### 저장 위치

```
data/vocadb/vocadb-songs.json
```

### 데이터 형식

```json
[
  {
    "vocadbId": 286310,
    "title": "🜚",
    "artist": "不定積分 ∫dx feat. 唄音ウタ",
    "youtubeId": "7B0ISzuP6cM",
    "youtubeUrl": "https://www.youtube.com/watch?v=7B0ISzuP6cM"
  }
]
```

## 📈 크롤링 통계

현재 테스트 결과 (50곡):
- ✅ VocaDB ID 포함
- ✅ 곡 제목 (다국어 지원)
- ✅ 아티스트 이름
- ✅ YouTube 비디오 ID
- ✅ YouTube URL (바로 사용 가능)

## 🔍 데이터 확인

### JSON 파일 확인

```bash
# 전체 곡 수
cat data/vocadb/vocadb-songs.json | jq length

# 처음 3곡 보기
cat data/vocadb/vocadb-songs.json | jq '.[0:3]'

# 특정 아티스트 검색
cat data/vocadb/vocadb-songs.json | jq '.[] | select(.artist | contains("初音ミク"))'
```

### Windows에서 확인

```powershell
# 파일 존재 확인
Test-Path data\vocadb\vocadb-songs.json

# 파일 크기 확인
(Get-Item data\vocadb\vocadb-songs.json).Length
```

## ⚙️ 커스텀 크롤링

원하는 곡 수와 배치 크기를 직접 지정:

```bash
npx tsx scripts/crawler/simple-crawler.ts [총곡수] [배치크기]

# 예시
npx tsx scripts/crawler/simple-crawler.ts 2000 50
```

## 🎯 필터링 옵션

현재 필터:
- ✅ **Original 곡만** 수집 (리믹스, 리마스터 제외)
- ✅ **YouTube 비디오 있는 곡만** 수집
- ✅ **최신 추가순** 정렬

필터를 변경하려면 `simple-crawler.ts` 파일의 API URL을 수정하세요:

```typescript
// songTypes=Original 부분을 수정
const url = `${VOCADB_API_BASE}/songs?start=${start}&maxResults=${batchSize}&fields=PVs&songTypes=Original`;
```

사용 가능한 songTypes:
- `Original` - 오리지널 곡
- `Remaster` - 리마스터
- `Remix` - 리믹스
- `Cover` - 커버
- `Mashup` - 매쉬업

## 📚 다음 단계

### 1. YouTube 조회수 가져오기

크롤링한 YouTube ID로 조회수 데이터를 수집하세요:

```typescript
// YouTube Data API v3 사용
const apiKey = 'YOUR_YOUTUBE_API_KEY';
const videoId = 'xD9vmiNCTYc';
const url = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=statistics&key=${apiKey}`;
```

### 2. 데이터베이스에 저장

PostgreSQL + Prisma로 저장:

```bash
# Prisma 설정
npx prisma init

# 스키마 작성 (prisma/schema.prisma)
model Song {
  id          Int      @id @default(autoincrement())
  vocadbId    Int      @unique
  title       String
  artist      String
  youtubeId   String
  youtubeUrl  String
  viewCount   BigInt?
  createdAt   DateTime @default(now())
}

# 마이그레이션
npx prisma migrate dev --name init

# 데이터 임포트
npx tsx scripts/import-to-db.ts
```

### 3. 정기 업데이트 설정

매일 새로운 곡 수집:

```bash
# crontab -e
0 3 * * * cd /path/to/vocatify && npm run crawl:quick >> logs/crawler.log 2>&1
```

## ⚠️ 주의사항

### API 사용 제한

- ✅ 1초 딜레이 포함 (API 친화적)
- ✅ 적절한 User-Agent 사용
- ❌ 과도한 요청 금지

### VocaDB 정책

VocaDB API는 무료이지만:
- 서버에 부담을 주지 않도록 합리적으로 사용
- 대규모 크롤링은 나눠서 진행
- 캐싱을 활용하여 중복 요청 방지

## 🛠️ 트러블슈팅

### "fetch failed" 에러

**원인**: 네트워크 연결 문제

**해결**:
```bash
# 1. 인터넷 연결 확인
ping vocadb.net

# 2. VocaDB API 테스트
npx tsx scripts/crawler/test-api.ts

# 3. 방화벽 확인
```

### 데이터가 저장되지 않음

**원인**: 폴더 권한 문제

**해결**:
```bash
# 폴더 생성 확인
mkdir -p data/vocadb

# 권한 확인 (Linux/Mac)
chmod 755 data/vocadb
```

### 메모리 부족

**원인**: 너무 많은 데이터를 한 번에 처리

**해결**:
- 배치 크기 줄이기 (100 → 50)
- 총 곡 수 줄이기 (10000 → 1000)
- 여러 번 나눠서 실행

## 📖 참고 자료

**VocaDB 공식 리소스:**
- [VocaDB API 문서](https://wiki.vocadb.net/docs/public-api)
- [VocaDB GitHub](https://github.com/VocaDB/vocadb)
- [VocaDB 웹사이트](https://vocadb.net)

**YouTube API:**
- [YouTube Data API v3](https://developers.google.com/youtube/v3)
- [API 키 발급](https://console.cloud.google.com/)

## 💡 팁

### 효율적인 크롤링

1. **점진적으로 시작**
   ```bash
   npm run crawl:test    # 100곡
   npm run crawl:quick   # 500곡
   npm run crawl         # 1000곡
   ```

2. **정기적으로 업데이트**
   - 매일 또는 매주 새로운 곡 수집
   - 기존 데이터는 유지됨 (중복 제거 자동)

3. **데이터 백업**
   ```bash
   # 크롤링 전 백업
   cp data/vocadb/vocadb-songs.json data/vocadb/backup-$(date +%Y%m%d).json
   ```

### 데이터 활용

크롤링한 데이터로:
- 📊 **차트 생성**: 일간/주간/월간 인기 차트
- 🔍 **검색 엔진**: 곡 제목, 아티스트 검색
- 📈 **통계 분석**: 인기 아티스트, 트렌드 분석
- 🎵 **플레이리스트**: 자동 큐레이션

---

**Sources:**
- [VocaDB Public API](https://wiki.vocadb.net/docs/public-api)
- [VocaDB GitHub](https://github.com/VocaDB/vocadb)

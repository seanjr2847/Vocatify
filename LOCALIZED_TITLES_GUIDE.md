# YouTube 다국어 제목 가져오기 가이드

YouTube Data API v3를 사용하여 한국어, 일본어, 영어 제목을 가져오는 방법입니다.

## 📋 개요

YouTube는 영상 업로더가 여러 언어로 제목과 설명을 설정할 수 있도록 지원합니다. YouTube Data API를 통해 이러한 다국어 제목을 프로그래밍 방식으로 가져올 수 있습니다.

### 지원되는 기능

- ✅ 원본 제목 (업로더가 설정한 기본 언어)
- ✅ 한국어 제목 (`hl=ko`)
- ✅ 일본어 제목 (`hl=ja`)
- ✅ 영어 제목 (`hl=en`)
- ✅ 기본 언어 코드 감지 (`defaultLanguage`)

## 🚀 사용 방법

### 1. 다국어 제목 수집

```bash
npm run youtube:localized
```

이 명령은:
- 제목이 없는 곡 1,000개를 대상으로 실행
- 한국어, 일본어, 영어 제목을 모두 가져옴
- 조회수도 함께 업데이트

### 2. 실행 출력 예시

```
🌍 YouTube 다국어 제목 수집 시작

✅ titleKorean 컬럼 추가됨
✅ titleOriginal 컬럼 추가됨
✅ defaultLanguage 컬럼 추가됨

🎯 업데이트 대상: 1,000곡

📦 배치 1/20
  📥 50개 비디오 처리 중...
  ✅ 50/1,000곡 (5.0%)

📦 배치 2/20
  📥 50개 비디오 처리 중...
  ✅ 100/1,000곡 (10.0%)
...

✅ 완료!

📝 샘플 데이터:

1. メルト
   원본: メルト (ja)
   한국어: 메루토
   일본어: メルト
   영어: Melt

2. 千本桜
   원본: 千本桜 (ja)
   한국어: 센본자쿠라
   일본어: 千本桜
   영어: Senbonzakura

3. ロストワンの号哭
   원본: ロストワンの号哭 (ja)
   한국어: 로스트 원의 호곡
   일본어: ロストワンの号哭
   영어: The Disappearance of Hatsune Miku
```

## 📊 데이터베이스 스키마

### 추가된 컬럼

```sql
-- 원본 제목 (업로더가 설정한 기본 제목)
titleOriginal TEXT

-- 한국어 제목
titleKorean TEXT

-- 기본 언어 코드 (ja, en, ko 등)
defaultLanguage TEXT
```

기존 컬럼:
- `titleJapanese` - 일본어 제목 (기존)
- `titleEnglish` - 영어 제목 (기존)

### 조회 예시

```sql
-- 다국어 제목 확인
SELECT
  title,
  titleOriginal,
  titleKorean,
  titleJapanese,
  titleEnglish,
  defaultLanguage
FROM songs
WHERE titleKorean IS NOT NULL
LIMIT 10;

-- 한국어 제목이 원본과 다른 곡 찾기
SELECT
  titleOriginal,
  titleKorean
FROM songs
WHERE titleKorean IS NOT NULL
  AND titleKorean != titleOriginal
LIMIT 10;

-- 언어별 제목 통계
SELECT
  defaultLanguage,
  COUNT(*) as count
FROM songs
WHERE titleOriginal IS NOT NULL
GROUP BY defaultLanguage
ORDER BY count DESC;
```

## 🔧 API 작동 원리

### YouTube API 파라미터

```typescript
// 기본 요청 (조회수만)
GET https://www.googleapis.com/youtube/v3/videos
  ?part=statistics
  &id=video_id_1,video_id_2,...
  &key=YOUR_API_KEY

// 다국어 제목 포함 요청
GET https://www.googleapis.com/youtube/v3/videos
  ?part=snippet,statistics
  &id=video_id_1,video_id_2,...
  &hl=ko                    // 한국어로 localized 제목 가져오기
  &key=YOUR_API_KEY
```

### 언어 파라미터 (`hl`)

- `hl=ko` - 한국어
- `hl=ja` - 일본어
- `hl=en` - 영어
- `hl=zh` - 중국어
- 기타 ISO 639-1 언어 코드

### API 응답 구조

```json
{
  "items": [
    {
      "id": "5yFkkXg7IVA",
      "snippet": {
        "title": "メルト",                    // 원본 제목
        "localized": {
          "title": "메루토",                  // hl 파라미터에 따른 제목
          "description": "..."
        },
        "defaultLanguage": "ja",              // 원본 언어
        "defaultAudioLanguage": "ja"
      },
      "statistics": {
        "viewCount": "12345678"
      }
    }
  ]
}
```

## 📈 성능 및 비용

### API 할당량 비용

| Part | 비용 (Units) | 설명 |
|------|-------------|------|
| `statistics` | 1 | 조회수만 |
| `snippet` | 2 | 제목, 설명, 썸네일 등 |
| `snippet,statistics` | 3 | 둘 다 |

### 예상 비용 계산

```
1,000곡 × 3개 언어 = 3,000 API 호출
3,000 호출 ÷ 50개/배치 = 60 배치
60 배치 × 3 units = 180 units

→ 무료 할당량 10,000 units 이내! ✅
```

### 소요 시간

```
1,000곡:
- API 호출: 60 배치 × 3개 언어 = 180회
- 딜레이: 100ms × 3 = 300ms/배치
- 총 시간: 약 1-2분
```

## ⚙️ 고급 사용법

### 1. 특정 곡만 업데이트

스크립트 수정:

```typescript
// fetch-localized-titles.ts 수정
const songs = db
  .prepare(
    `SELECT youtubeId FROM songs
     WHERE vocadbId IN (1, 2, 3, 4, 5)  // 특정 ID만
     LIMIT 100`
  )
  .all() as Array<{ youtubeId: string }>;
```

### 2. 언어 추가

```typescript
// 중국어 추가
const chineseData = await fetchLocalizedTitles(videoIds, 'zh');

// DB 컬럼 추가
db.exec(`ALTER TABLE songs ADD COLUMN titleChinese TEXT;`);
```

### 3. 기존 업데이트 스크립트에 통합

`update-viewcounts.ts`를 수정하여 조회수 업데이트와 동시에 제목도 가져오기:

```typescript
// update-viewcounts.ts 수정
async function fetchViewCounts(videoIds: string[]): Promise<Map<string, any>> {
  // part=statistics → part=snippet,statistics로 변경
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds.join(',')}&hl=ko&key=${YOUTUBE_API_KEY}`;

  // ... 기존 코드

  for (const item of data.items || []) {
    results.set(item.id, {
      viewCount: parseInt(item.statistics?.viewCount || '0'),
      titleLocalized: item.snippet?.localized?.title,
      defaultLanguage: item.snippet?.defaultLanguage,
    });
  }

  return results;
}
```

## 🎯 실전 활용 예시

### 1. UI에서 언어별 제목 표시

```typescript
// app/songs/[vocadbId]/page.tsx
export default async function SongDetailPage({ params }) {
  const song = await getSongById(params.vocadbId);

  return (
    <div>
      {/* 한국어 제목 우선, 없으면 원본 */}
      <h1>{song.titleKorean || song.titleOriginal || song.title}</h1>

      {/* 원본 제목 표시 (다를 때만) */}
      {song.titleOriginal && song.titleOriginal !== song.titleKorean && (
        <p className="text-sm text-gray-400">
          원제: {song.titleOriginal}
        </p>
      )}
    </div>
  );
}
```

### 2. 검색 개선

```sql
-- 여러 언어로 검색
SELECT * FROM songs
WHERE
  titleKorean LIKE '%메루토%'
  OR titleOriginal LIKE '%メルト%'
  OR titleEnglish LIKE '%Melt%'
LIMIT 10;
```

### 3. Alternative Titles 섹션

```typescript
interface AlternativeTitles {
  original?: string;
  korean?: string;
  japanese?: string;
  english?: string;
}

function AlternativeTitlesSection({ titles }: { titles: AlternativeTitles }) {
  const hasMultiple = Object.values(titles).filter(Boolean).length > 1;

  if (!hasMultiple) return null;

  return (
    <div className="mb-8">
      <h3 className="text-lg font-bold mb-3">다른 제목</h3>
      <div className="space-y-2">
        {titles.korean && <p>🇰🇷 {titles.korean}</p>}
        {titles.japanese && <p>🇯🇵 {titles.japanese}</p>}
        {titles.english && <p>🇺🇸 {titles.english}</p>}
        {titles.original && <p>📝 {titles.original}</p>}
      </div>
    </div>
  );
}
```

## ⚠️ 주의사항

### 1. 모든 영상에 다국어 제목이 있는 것은 아님

- 업로더가 설정하지 않으면 `localized.title`이 원본과 동일
- YouTube가 자동 번역하는 경우도 있음 (정확도 낮음)

### 2. API 할당량

- `snippet` part는 비용이 높음 (2 units vs 1 unit)
- 전체 27만 곡을 3개 언어로 가져오면:
  - 27만 ÷ 50 × 3 = 16,200 units
  - 하루 10,000 units 초과 → 2일 필요

### 3. 데이터 정확성

```sql
-- 자동 번역 vs 수동 번역 구분 어려움
-- 예: "メルト" → "Melt" (좋음)
--     "メルト" → "Melting" (자동 번역, 부정확)
```

## 🔍 디버깅

### API 응답 확인

```bash
# 직접 API 호출 테스트
curl "https://www.googleapis.com/youtube/v3/videos?part=snippet&id=VIDEO_ID&hl=ko&key=YOUR_API_KEY" | jq
```

### 데이터 검증

```sql
-- 제목이 업데이트된 곡 확인
SELECT
  COUNT(*) as total,
  COUNT(titleKorean) as with_korean,
  COUNT(titleOriginal) as with_original
FROM songs;

-- 제목이 다른 곡 샘플
SELECT
  title,
  titleOriginal,
  titleKorean,
  titleJapanese,
  titleEnglish
FROM songs
WHERE titleKorean IS NOT NULL
  AND (
    titleKorean != titleOriginal
    OR titleJapanese != titleOriginal
    OR titleEnglish != titleOriginal
  )
LIMIT 20;
```

## 📚 참고 자료

- [YouTube Data API - Videos](https://developers.google.com/youtube/v3/docs/videos)
- [YouTube API - Localization](https://developers.google.com/youtube/v3/docs/videos#snippet.localized)
- [ISO 639-1 언어 코드](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes)

## 🎓 FAQ

### Q: 자막 언어도 가져올 수 있나요?
A: 자막은 다른 API (`captions` part)를 사용해야 하며, OAuth 인증이 필요합니다.

### Q: 모든 YouTube 영상에 다국어 제목이 있나요?
A: 아니요. 업로더가 직접 설정해야 합니다. 없으면 원본 제목이 반환됩니다.

### Q: YouTube가 자동으로 번역한 제목인지 알 수 있나요?
A: API만으로는 구분이 어렵습니다. 일반적으로 인기 영상은 수동 번역이 많습니다.

### Q: 다른 언어도 추가할 수 있나요?
A: 네! `hl` 파라미터에 원하는 언어 코드를 추가하면 됩니다. (예: `hl=zh`, `hl=es`)

### Q: 비용이 너무 많이 나오지 않나요?
A: 무료 할당량(10,000 units/일)으로도 매일 3,000곡 이상 업데이트 가능합니다.

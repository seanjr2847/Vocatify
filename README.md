# Vocatify - 보컬로이드 YouTube 차트 시스템 🎵

보컬로이드 음악의 YouTube 조회수를 자동으로 수집하고, 실시간 차트로 시각화하는 시스템입니다.

## ✨ 주요 기능

- **실시간 차트**: 인기, 일간, 주간, 신곡 랭킹
- **자동 데이터 수집**: VocaDB & YouTube API 연동
- **일별 추적**: 조회수 변화 추적 및 통계
- **한글 지원**: Noto Sans KR 폰트로 완벽한 한글 표시
- **반응형 디자인**: 모든 기기에서 최적화된 경험

## 🚀 빠른 시작

### 1. 환경 설정

```bash
# 의존성 설치
npm install

# 환경변수 설정 (.env 파일 생성)
cp .env.example .env
# .env 파일을 열어서 YOUTUBE_API_KEY를 입력하세요
```

### 2. 데이터 수집 (처음 한 번만)

```bash
# VocaDB에서 곡 데이터 수집
npm run crawl

# YouTube 조회수 수집
npm run youtube:new

# 일별 통계 초기화
npm run db:add-daily
npm run db:seed-daily
```

### 3. 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 에서 확인하세요!

## 📁 프로젝트 구조

```
vocatify/
├── app/
│   ├── api/                    # API 라우트
│   │   ├── ranking/
│   │   │   ├── total/         # 총 조회수 랭킹
│   │   │   ├── daily/         # 일간 증가량 랭킹
│   │   │   ├── weekly/        # 주간 증가량 랭킹
│   │   │   └── new/           # 신곡 랭킹
│   │   ├── songs/
│   │   │   ├── route.ts       # 곡 검색
│   │   │   └── [vocadbId]/   # 곡 상세 정보
│   │   └── stats/             # 전체 통계
│   ├── layout.tsx             # 루트 레이아웃 (폰트 설정)
│   └── page.tsx               # 메인 페이지 (서버 컴포넌트)
│
├── components/
│   ├── HomeClient.tsx         # 클라이언트 컴포넌트
│   ├── NavigationSection.tsx # 차트 섹션 (실제 데이터)
│   ├── MusicPlayerSection.tsx # 플레이어 UI
│   └── ui/                    # shadcn/ui 컴포넌트
│
├── lib/
│   └── db.ts                  # SQLite 데이터베이스 라이브러리
│
├── scripts/
│   ├── crawler/               # VocaDB 크롤러
│   │   └── crawler.ts        # 곡 데이터 수집
│   ├── youtube/               # YouTube API 연동
│   │   ├── update-new-songs.ts    # 신곡 조회수 수집
│   │   └── update-top-songs.ts    # 인기곡 조회수 수집
│   └── db/                    # DB 유틸리티
│       ├── add-daily-tracking.ts  # 일별 추적 테이블 생성
│       └── seed-daily-counts.ts   # 일별 통계 초기화
│
└── data/
    └── vocadb/
        └── vocatify.db        # SQLite 데이터베이스
```

## 🔌 API 엔드포인트

### 랭킹 API

#### 총 조회수 랭킹
```
GET /api/ranking/total?limit=100&offset=0
```

#### 일간 증가량 랭킹
```
GET /api/ranking/daily?limit=100&offset=0
```

#### 주간 증가량 랭킹
```
GET /api/ranking/weekly?limit=100&offset=0
```

#### 신곡 랭킹 (30일 이내, 500만 이하)
```
GET /api/ranking/new?limit=100&offset=0
```

### 곡 API

#### 곡 검색
```
GET /api/songs?query=검색어&limit=20&offset=0
```

#### 곡 상세 정보
```
GET /api/songs/[vocadbId]
```
일별 조회수 기록 포함 (최근 30일)

### 통계 API

#### 전체 통계
```
GET /api/stats
```
총 곡 수, 조회수가 있는 곡 수, 총 조회수, 마지막 업데이트 시간

## 📊 데이터베이스 스키마

### songs 테이블
```sql
CREATE TABLE songs (
  vocadbId INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  titleEnglish TEXT,
  titleJapanese TEXT,
  titleRomaji TEXT,
  artist TEXT NOT NULL,
  artistType TEXT,
  youtubeId TEXT NOT NULL,
  youtubeUrl TEXT NOT NULL,
  thumbUrl TEXT,
  favoritedTimes INTEGER DEFAULT 0,
  ratingScore INTEGER DEFAULT 0,
  tags TEXT,
  publishDate TEXT,
  songType TEXT,
  viewCount INTEGER,
  viewCountUpdatedAt TEXT,
  crawledAt TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### daily_view_counts 테이블
```sql
CREATE TABLE daily_view_counts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vocadbId INTEGER NOT NULL,
  youtubeId TEXT NOT NULL,
  viewCount INTEGER NOT NULL,
  dailyIncrease INTEGER DEFAULT 0,
  recordDate TEXT NOT NULL,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vocadbId) REFERENCES songs(vocadbId)
);
```

## 🛠️ 스크립트

### 개발
```bash
npm run dev      # 개발 서버 실행 (http://localhost:3000)
npm run build    # 프로덕션 빌드
npm run start    # 프로덕션 서버 실행
npm run lint     # ESLint 실행
```

### 데이터 수집
```bash
# VocaDB 크롤링
npm run crawl              # 전체 곡 데이터 수집
npm run crawl:test         # 테스트 모드 (100개만)

# YouTube 조회수 업데이트
npm run youtube:new        # 신곡 조회수 수집
npm run youtube:top        # 인기곡 조회수 수집

# 일별 통계
npm run db:add-daily       # daily_view_counts 테이블 생성
npm run db:seed-daily      # 일별 통계 초기화
```

## 🎨 기술 스택

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI)
- **Icons**: Lucide React
- **Fonts**: Noto Sans KR + Quicksand (Google Fonts)

### Backend
- **Database**: SQLite (better-sqlite3)
- **APIs**:
  - VocaDB API (곡 메타데이터)
  - YouTube Data API v3 (조회수)
- **Runtime**: Node.js

## 🌐 환경 변수

`.env` 파일을 생성하고 다음 변수를 설정하세요:

```env
# YouTube Data API v3 키
# https://console.cloud.google.com/apis/credentials 에서 발급
YOUTUBE_API_KEY=your_api_key_here
```

## 📈 데이터 수집 워크플로우

1. **VocaDB 크롤링** (`npm run crawl`)
   - VocaDB API에서 보컬로이드 곡 데이터 수집
   - 곡 정보, 아티스트, YouTube 링크 저장
   - 약 27만개 곡 수집

2. **YouTube 조회수 수집** (`npm run youtube:new` / `youtube:top`)
   - YouTube Data API로 각 곡의 현재 조회수 가져오기
   - 병렬 처리로 효율적인 수집 (배치 50개)
   - API 할당량 관리 (1일 10,000 units)

3. **일별 통계 생성** (`npm run db:seed-daily`)
   - 현재 조회수를 기반으로 daily_view_counts 초기화
   - 이후 매일 실행하여 증가량 추적

## 🔄 정기 업데이트

프로덕션 환경에서는 cron job으로 자동화 권장:

```bash
# 매일 오전 9시 - 신곡 조회수 업데이트
0 9 * * * cd /path/to/vocatify && npm run youtube:new

# 매일 오전 10시 - 인기곡 조회수 업데이트
0 10 * * * cd /path/to/vocatify && npm run youtube:top

# 매주 일요일 오전 3시 - 전체 크롤링
0 3 * * 0 cd /path/to/vocatify && npm run crawl
```

## 🐛 문제 해결

### 데이터가 보이지 않는 경우
1. 데이터베이스가 생성되었는지 확인
   ```bash
   ls -la data/vocadb/vocatify.db
   ```
2. 크롤링이 완료되었는지 확인
   ```bash
   npm run crawl
   ```
3. YouTube 조회수가 수집되었는지 확인
   ```bash
   npm run youtube:new
   ```

### YouTube API 할당량 초과
- Google Cloud Console에서 할당량 확인
- 배치 크기 조정 (`scripts/youtube/` 파일 수정)
- 수집 빈도 조정

### 한글이 깨지는 경우
- 브라우저 새로고침 (Noto Sans KR 폰트 로드 확인)
- 개발 서버 재시작

## 🚀 배포

### Vercel (권장)
```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel

# 환경 변수 설정
vercel env add YOUTUBE_API_KEY
```

### Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 📄 라이선스

MIT License

## 🤝 기여

이슈 및 풀 리퀘스트 환영합니다!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

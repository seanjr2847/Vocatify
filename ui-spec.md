# Vocatify UI 정의서 v1.0

## 문서 정보
- **프로젝트명**: Vocatify
- **버전**: 1.0
- **작성일**: 2025-12-16
- **목적**: 보컬로이드 YouTube 일간/월간 차트 시스템 UI/UX 명세

---

## 1. 개요

### 1.1 핵심 사용자 경험
- **간단한 탐색**: 3클릭 이내 원하는 차트 도달
- **명확한 정보**: 조회수, 증가량, 순위 변동 한눈에 파악
- **빠른 로딩**: 모든 페이지 2초 이내 렌더링
- **반응형**: 모바일, 태블릿, 데스크톱 완벽 지원

### 1.2 디자인 철학
- **미니멀**: 불필요한 요소 제거, 정보에 집중
- **보컬로이드 감성**: 청록색(Miku) 기반 컬러 팔레트
- **데이터 중심**: 차트와 통계가 주인공
- **접근성**: WCAG 2.1 AA 수준 준수

---

## 2. 컬러 시스템

### 2.1 Primary Colors
```css
--primary-cyan: #00D9D9;      /* 미쿠 메인 컬러 */
--primary-dark: #00A3A3;      /* 호버/액티브 */
--primary-light: #7FECEC;     /* 배경 강조 */
```

### 2.2 Semantic Colors
```css
--success: #10B981;           /* 증가, 성공 */
--danger: #EF4444;            /* 감소, 경고 */
--warning: #F59E0B;           /* 주의 */
--info: #3B82F6;              /* 정보 */
```

### 2.3 Neutral Colors
```css
--gray-50: #F9FAFB;
--gray-100: #F3F4F6;
--gray-200: #E5E7EB;
--gray-300: #D1D5DB;
--gray-400: #9CA3AF;
--gray-500: #6B7280;
--gray-600: #4B5563;
--gray-700: #374151;
--gray-800: #1F2937;
--gray-900: #111827;
```

### 2.4 다크모드 (선택사항)
```css
--bg-primary: #111827;
--bg-secondary: #1F2937;
--text-primary: #F9FAFB;
--text-secondary: #D1D5DB;
```

---

## 3. 타이포그래피

### 3.1 Font Family
```css
/* 한글 */
font-family: 'Pretendard Variable', -apple-system, sans-serif;

/* 숫자 (조회수) */
font-family: 'JetBrains Mono', 'Courier New', monospace;
```

### 3.2 Font Scale
```css
--text-xs: 0.75rem;    /* 12px - 보조 정보 */
--text-sm: 0.875rem;   /* 14px - 본문 작은 글씨 */
--text-base: 1rem;     /* 16px - 본문 */
--text-lg: 1.125rem;   /* 18px - 강조 */
--text-xl: 1.25rem;    /* 20px - 소제목 */
--text-2xl: 1.5rem;    /* 24px - 제목 */
--text-3xl: 1.875rem;  /* 30px - 대제목 */
--text-4xl: 2.25rem;   /* 36px - 페이지 타이틀 */
```

### 3.3 Font Weight
```css
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

---

## 4. 페이지 구조

### 4.1 사이트맵
```
/                         # 홈 (메인 대시보드)
├── /ranking              # 랭킹 페이지
│   ├── ?tab=daily       # 일간 차트
│   ├── ?tab=weekly      # 주간 차트
│   └── ?tab=monthly     # 월간 차트
├── /new                  # 신곡 차트
├── /song/[videoId]       # 곡 상세
└── /search               # 검색 (선택사항)
```

### 4.2 공통 레이아웃
```
┌─────────────────────────────────────────────────┐
│ Header (고정)                                    │
│ - 로고                                          │
│ - 네비게이션 (홈, 랭킹, 신곡)                    │
│ - 검색바 (선택)                                  │
├─────────────────────────────────────────────────┤
│                                                 │
│ Main Content                                    │
│ (페이지별 상이)                                  │
│                                                 │
│                                                 │
├─────────────────────────────────────────────────┤
│ Footer                                          │
│ - 데이터 출처 (YouTube, VocaDB)                 │
│ - 마지막 업데이트 시간                           │
│ - GitHub 링크                                   │
└─────────────────────────────────────────────────┘
```

---

## 5. 페이지별 상세 명세

### 5.1 홈페이지 (/)

#### 5.1.1 레이아웃 (데스크톱)
```
┌────────────────────────────────────────────────────┐
│ Hero Section                                       │
│ ┌────────────────────────────────────────────────┐ │
│ │ 📊 Vocatify                                    │ │
│ │ 보컬로이드 YouTube 차트                         │ │
│ │                                                │ │
│ │ [일간 랭킹 보기] [신곡 보기]                    │ │
│ └────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────┤
│ Quick Stats (3-column grid)                       │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│ │📈 등록곡  │ │🔥 오늘   │ │⭐ 이번주  │           │
│ │25,847곡  │ │124곡 증가│ │신곡 47개 │           │
│ └──────────┘ └──────────┘ └──────────┘           │
├────────────────────────────────────────────────────┤
│ 일간 TOP 10 미리보기                               │
│ ┌────────────────────────────────────────────────┐ │
│ │ 1. [곡 제목] - [아티스트]          +12.5K ↑3  │ │
│ │ 2. [곡 제목] - [아티스트]          +10.2K ↓1  │ │
│ │ ...                                            │ │
│ │ [전체 랭킹 보기 →]                             │ │
│ └────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────┤
│ 신곡 TOP 10 미리보기                               │
│ (카드형 레이아웃)                                  │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐         │
│ │썸네일│ │썸네일│ │썸네일│ │썸네일│ │썸네일│         │
│ │제목  │ │제목  │ │제목  │ │제목  │ │제목  │         │
│ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘         │
│ [더보기 →]                                        │
└────────────────────────────────────────────────────┘
```

#### 5.1.2 컴포넌트 명세

**Hero Section**
- 높이: 400px (데스크톱), 300px (모바일)
- 배경: Gradient (cyan-500 to cyan-700)
- 타이틀: text-4xl, font-bold, white
- 서브타이틀: text-xl, white/90
- CTA 버튼: 2개, primary + outline 스타일

**Quick Stats Card**
```jsx
<StatCard>
  <Icon size={32} color="cyan" />
  <Label fontSize="sm" color="gray-600">라벨</Label>
  <Value fontSize="2xl" fontWeight="bold">25,847</Value>
  <Change fontSize="sm" color="success">+124 (어제 대비)</Change>
</StatCard>
```

**Ranking Preview List**
```jsx
<RankingItem>
  <Rank>1</Rank>
  <Thumbnail src="..." size="60x60" />
  <Info>
    <Title>곡 제목</Title>
    <Artist>아티스트명</Artist>
  </Info>
  <Stats>
    <ViewCount>1,234,567</ViewCount>
    <DailyIncrease>+12.5K</DailyIncrease>
  </Stats>
  <RankChange direction="up" value={3}>↑3</RankChange>
</RankingItem>
```

### 5.2 랭킹 페이지 (/ranking)

#### 5.2.1 레이아웃
```
┌────────────────────────────────────────────────────┐
│ Page Header                                        │
│ 차트 랭킹                                           │
├────────────────────────────────────────────────────┤
│ Tab Navigation                                     │
│ [일간] [주간] [월간]                                │
├────────────────────────────────────────────────────┤
│ Filter Bar (선택사항)                              │
│ VOCALOID: [전체 ▼] 정렬: [증가량 ▼]               │
├────────────────────────────────────────────────────┤
│ Ranking Table (100개)                              │
│ ┌──┬──────┬────────────────────┬─────────┬──────┐ │
│ │순위│썸네일│제목/아티스트        │조회수    │증가량│ │
│ ├──┼──────┼────────────────────┼─────────┼──────┤ │
│ │ 1│ 📷  │[곡 제목]            │1,234,567│+12.5K│ │
│ │  │      │[아티스트명]         │         │ ↑3  │ │
│ ├──┼──────┼────────────────────┼─────────┼──────┤ │
│ │ 2│ 📷  │...                 │...      │...   │ │
│ └──┴──────┴────────────────────┴─────────┴──────┘ │
│                                                    │
│ [1] [2] [3] ... [10]  (페이지네이션)               │
└────────────────────────────────────────────────────┘
```

#### 5.2.2 Ranking Table 상세

**컬럼 구성**
| 컬럼 | 너비 | 정렬 | 설명 |
|------|------|------|------|
| 순위 | 60px | 중앙 | 1-100, 순위 변동 표시 |
| 썸네일 | 80px | 중앙 | YouTube 썸네일 (16:9) |
| 곡 정보 | 40% | 좌측 | 제목(bold) + 아티스트(gray) |
| 조회수 | 15% | 우측 | 총 조회수 (monospace) |
| 증가량 | 15% | 우측 | 일간/주간/월간 증가량 |
| 변동 | 80px | 중앙 | ↑3, ↓2, NEW, - |

**순위 변동 표시**
```jsx
// 상승
<RankBadge color="success">↑3</RankBadge>

// 하락
<RankBadge color="danger">↓2</RankBadge>

// 신규 진입
<RankBadge color="primary">NEW</RankBadge>

// 변동 없음
<RankBadge color="gray">-</RankBadge>
```

**반응형 (모바일)**
- 썸네일 크기 축소 (60px)
- 조회수/증가량 세로 배치
- 아티스트명 생략 가능

### 5.3 신곡 차트 (/new)

#### 5.3.1 레이아웃
```
┌────────────────────────────────────────────────────┐
│ Page Header                                        │
│ 신곡 차트                                           │
│ 최근 30일 내 발매된 곡                              │
├────────────────────────────────────────────────────┤
│ Filter Chips                                       │
│ [전체] [이번 주] [최근 7일] [최근 3일]              │
├────────────────────────────────────────────────────┤
│ Grid Layout (카드형)                               │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│ │ ┌──────┐ │ │ ┌──────┐ │ │ ┌──────┐ │           │
│ │ │썸네일 │ │ │ │썸네일 │ │ │ │썸네일 │ │           │
│ │ └──────┘ │ │ └──────┘ │ │ └──────┘ │           │
│ │ 곡 제목   │ │ 곡 제목   │ │ 곡 제목   │           │
│ │ 아티스트  │ │ 아티스트  │ │ 아티스트  │           │
│ │ 📊 123K  │ │ 📊 98K   │ │ 📊 87K   │           │
│ │ 🔥 +12K  │ │ 🔥 +8K   │ │ 🔥 +6K   │           │
│ │ 🆕 3일전 │ │ 🆕 5일전 │ │ 🆕 1주전 │           │
│ └──────────┘ └──────────┘ └──────────┘           │
│                                                    │
│ (6개/행 - 데스크톱, 2개/행 - 모바일)                │
└────────────────────────────────────────────────────┘
```

#### 5.3.2 New Song Card
```jsx
<SongCard>
  <Thumbnail ratio="16:9" hover="scale-105">
    <PlayOverlay /> {/* 호버 시 재생 아이콘 */}
  </Thumbnail>
  <Content>
    <Title lines={2} fontSize="base" fontWeight="semibold">
      곡 제목 (최대 2줄)
    </Title>
    <Artist fontSize="sm" color="gray-600">
      아티스트명
    </Artist>
    <Stats>
      <Stat icon="📊">123K</Stat>
      <Stat icon="🔥" color="success">+12K</Stat>
    </Stats>
    <Badge color="primary">🆕 3일 전</Badge>
  </Content>
</SongCard>
```

### 5.4 곡 상세 페이지 (/song/[videoId])

#### 5.4.1 레이아웃
```
┌────────────────────────────────────────────────────┐
│ Song Header                                        │
│ ┌──────────┐ ┌──────────────────────────────────┐ │
│ │          │ │ 곡 제목                           │ │
│ │ 썸네일    │ │ 아티스트명                        │ │
│ │ (큼직하게)│ │ 발매일: 2024-11-15               │ │
│ │          │ │                                  │ │
│ │          │ │ [▶ YouTube에서 보기]              │ │
│ └──────────┘ └──────────────────────────────────┘ │
├────────────────────────────────────────────────────┤
│ Stats Overview (4-column grid)                    │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐             │
│ │총조회수│ │일간   │ │주간   │ │월간   │             │
│ │1.2M   │ │+12K  │ │+84K  │ │+320K │             │
│ └──────┘ └──────┘ └──────┘ └──────┘             │
├────────────────────────────────────────────────────┤
│ Tab Navigation                                     │
│ [조회수 추이] [일간 증가량] [순위 변동]             │
├────────────────────────────────────────────────────┤
│ Chart Area                                         │
│ ┌────────────────────────────────────────────────┐ │
│ │             📈 Line Chart                      │ │
│ │                                                │ │
│ │   1.2M ┤         ╱                             │ │
│ │        │      ╱                                │ │
│ │   1.0M ┤   ╱                                   │ │
│ │        │ ╱                                     │ │
│ │   0.8M ┼─────────────────────────────────────  │ │
│ │        11/01  11/15  11/30  12/15             │ │
│ └────────────────────────────────────────────────┘ │
│                                                    │
│ 기간 선택: [7일] [30일] [90일] [전체]              │
├────────────────────────────────────────────────────┤
│ Ranking History                                    │
│ ┌────────────────────────────────────────────────┐ │
│ │ 일간 랭킹: #3 (최고 #1)                        │ │
│ │ 주간 랭킹: #5 (최고 #2)                        │ │
│ │ 월간 랭킹: #12 (최고 #8)                       │ │
│ └────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────┘
```

#### 5.4.2 Chart 명세

**조회수 추이 차트**
- 라이브러리: Recharts (LineChart)
- X축: 날짜 (일별)
- Y축: 누적 조회수
- 툴팁: 날짜, 조회수, 전일 대비 증가량
- 반응형: 높이 400px (데스크톱), 250px (모바일)

```jsx
<ResponsiveContainer width="100%" height={400}>
  <LineChart data={viewHistory}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis
      dataKey="date"
      tickFormatter={(date) => format(date, 'MM/dd')}
    />
    <YAxis
      tickFormatter={(value) => formatNumber(value)}
    />
    <Tooltip content={<CustomTooltip />} />
    <Line
      type="monotone"
      dataKey="viewCount"
      stroke="#00D9D9"
      strokeWidth={2}
      dot={{ r: 2 }}
      activeDot={{ r: 6 }}
    />
  </LineChart>
</ResponsiveContainer>
```

**일간 증가량 차트**
- 차트 타입: BarChart
- 색상: 증가 = green, 감소 = red
- 평균선: 점선으로 표시

**순위 변동 차트**
- 차트 타입: LineChart (Y축 반전)
- #1이 최상단, #100이 최하단
- 구간별 색상 변경 (TOP 10 = gold zone)

### 5.5 검색 (선택사항)

#### 5.5.1 인라인 검색 (Header)
```jsx
<SearchBar>
  <Icon name="search" />
  <Input
    placeholder="곡 제목 또는 아티스트 검색..."
    onChange={debounce(handleSearch, 300)}
  />
  <Dropdown visible={results.length > 0}>
    {results.map(song => (
      <SearchResult>
        <Thumbnail size="40x40" />
        <Info>
          <Title>{song.title}</Title>
          <Artist>{song.artist}</Artist>
        </Info>
      </SearchResult>
    ))}
  </Dropdown>
</SearchBar>
```

---

## 6. 컴포넌트 라이브러리

### 6.1 Atoms (기본 컴포넌트)

#### Button
```tsx
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'outline' | 'ghost';
  size: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

// 사용 예시
<Button variant="primary" size="md">
  일간 랭킹 보기
</Button>
```

#### Badge
```tsx
interface BadgeProps {
  color: 'primary' | 'success' | 'danger' | 'warning' | 'gray';
  size: 'sm' | 'md';
  children: ReactNode;
}

// 사용 예시
<Badge color="success">↑3</Badge>
<Badge color="primary">NEW</Badge>
```

#### Card
```tsx
interface CardProps {
  padding?: 'sm' | 'md' | 'lg';
  hover?: boolean;
  shadow?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}
```

### 6.2 Molecules (조합 컴포넌트)

#### StatCard
```tsx
interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  change?: {
    value: number;
    direction: 'up' | 'down';
  };
}
```

#### RankingRow
```tsx
interface RankingRowProps {
  rank: number;
  song: {
    videoId: string;
    title: string;
    artist: string;
    thumbnailUrl: string;
    viewCount: number;
    dailyIncrease: number;
  };
  rankChange?: number;
  showThumbnail?: boolean;
}
```

#### SongCard
```tsx
interface SongCardProps {
  song: {
    videoId: string;
    title: string;
    artist: string;
    thumbnailUrl: string;
    viewCount: number;
    publishedAt: Date;
  };
  variant: 'compact' | 'detailed';
}
```

### 6.3 Organisms (복잡한 컴포넌트)

#### RankingTable
```tsx
interface RankingTableProps {
  songs: Song[];
  type: 'daily' | 'weekly' | 'monthly';
  page: number;
  onPageChange: (page: number) => void;
}
```

#### ViewTrendChart
```tsx
interface ViewTrendChartProps {
  data: ViewLog[];
  dateRange: '7d' | '30d' | '90d' | 'all';
  onDateRangeChange: (range: string) => void;
}
```

---

## 7. 인터랙션 명세

### 7.1 마이크로 인터랙션

#### Hover States
```css
/* 카드 호버 */
.song-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
  transition: all 0.2s ease-in-out;
}

/* 버튼 호버 */
.button:hover {
  opacity: 0.9;
  transform: scale(1.02);
}

/* 랭킹 행 호버 */
.ranking-row:hover {
  background-color: var(--gray-50);
  cursor: pointer;
}
```

#### Loading States
```jsx
// 스켈레톤 로딩
<SkeletonCard>
  <SkeletonThumbnail />
  <SkeletonText lines={2} />
  <SkeletonStats />
</SkeletonCard>

// 스피너 로딩
<Spinner size="lg" color="primary" />

// 프로그레스 바
<ProgressBar value={75} />
```

### 7.2 애니메이션

#### Page Transitions
```jsx
// Framer Motion 사용
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.3 }}
>
  {children}
</motion.div>
```

#### List Animations
```jsx
// Stagger 애니메이션
<motion.ul>
  {items.map((item, i) => (
    <motion.li
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.05 }}
    >
      {item}
    </motion.li>
  ))}
</motion.ul>
```

### 7.3 피드백

#### 토스트 알림
```jsx
// 성공
toast.success('데이터가 업데이트되었습니다');

// 에러
toast.error('데이터를 불러오는데 실패했습니다');

// 정보
toast.info('차트는 매일 새벽 3시에 업데이트됩니다');
```

---

## 8. 반응형 디자인

### 8.1 Breakpoints
```css
--breakpoint-sm: 640px;   /* 모바일 */
--breakpoint-md: 768px;   /* 태블릿 세로 */
--breakpoint-lg: 1024px;  /* 태블릿 가로 */
--breakpoint-xl: 1280px;  /* 데스크톱 */
--breakpoint-2xl: 1536px; /* 대형 데스크톱 */
```

### 8.2 레이아웃 변화

#### 홈페이지
```css
/* 모바일 (< 768px) */
.stats-grid { grid-template-columns: 1fr; }
.ranking-preview { display: block; }

/* 태블릿 (768px - 1024px) */
.stats-grid { grid-template-columns: repeat(3, 1fr); }

/* 데스크톱 (> 1024px) */
.stats-grid { grid-template-columns: repeat(3, 1fr); }
.container { max-width: 1200px; }
```

#### 랭킹 테이블
```css
/* 모바일 */
.ranking-table {
  /* 카드형으로 전환 */
  display: block;
}

.ranking-row {
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  margin-bottom: 12px;
  padding: 16px;
}

/* 데스크톱 */
.ranking-table {
  display: table;
}
```

#### 신곡 그리드
```css
/* 모바일 */
.new-songs-grid {
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

/* 태블릿 */
.new-songs-grid {
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

/* 데스크톱 */
.new-songs-grid {
  grid-template-columns: repeat(6, 1fr);
  gap: 24px;
}
```

### 8.3 터치 최적화

```css
/* 터치 타겟 최소 크기 */
.touch-target {
  min-height: 44px;
  min-width: 44px;
}

/* 모바일 네비게이션 */
.mobile-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 64px;
  display: flex;
  justify-content: space-around;
}
```

---

## 9. 접근성 (Accessibility)

### 9.1 키보드 네비게이션
```jsx
// Tab 순서
<div tabIndex={0} onKeyDown={handleKeyDown}>
  {/* 모든 인터랙티브 요소는 키보드로 접근 가능 */}
</div>

// 단축키
- Tab: 다음 요소
- Shift+Tab: 이전 요소
- Enter: 선택/활성화
- Esc: 닫기/취소
- Arrow Keys: 리스트 탐색
```

### 9.2 스크린 리더
```jsx
// ARIA 레이블
<button aria-label="일간 랭킹 보기">
  일간
</button>

// ARIA Live Region
<div aria-live="polite" aria-atomic="true">
  차트가 업데이트되었습니다
</div>

// Skip Link
<a href="#main-content" className="skip-link">
  메인 콘텐츠로 건너뛰기
</a>
```

### 9.3 색상 대비
```css
/* WCAG AA 준수 (4.5:1 이상) */
--text-on-white: #111827;  /* 대비비: 16.25:1 */
--text-on-primary: #FFFFFF; /* 대비비: 4.52:1 */
--link-color: #0066CC;      /* 대비비: 4.56:1 */
```

### 9.4 포커스 표시
```css
*:focus-visible {
  outline: 2px solid var(--primary-cyan);
  outline-offset: 2px;
  border-radius: 4px;
}
```

---

## 10. 성능 최적화

### 10.1 이미지 최적화
```jsx
// Next.js Image 컴포넌트 사용
<Image
  src={thumbnailUrl}
  alt={title}
  width={320}
  height={180}
  loading="lazy"
  placeholder="blur"
  quality={75}
/>
```

### 10.2 코드 스플리팅
```jsx
// 동적 임포트
const Chart = dynamic(() => import('@/components/Chart'), {
  loading: () => <SkeletonChart />,
  ssr: false
});
```

### 10.3 데이터 페칭
```jsx
// React Query 사용
const { data, isLoading } = useQuery({
  queryKey: ['ranking', 'daily'],
  queryFn: fetchDailyRanking,
  staleTime: 5 * 60 * 1000, // 5분
  cacheTime: 30 * 60 * 1000, // 30분
});
```

---

## 11. 에러 상태

### 11.1 에러 메시지
```jsx
<ErrorState>
  <Icon name="error" size={48} color="danger" />
  <Title>데이터를 불러올 수 없습니다</Title>
  <Message>
    네트워크 연결을 확인하고 다시 시도해주세요.
  </Message>
  <Button onClick={retry}>다시 시도</Button>
</ErrorState>
```

### 11.2 빈 상태
```jsx
<EmptyState>
  <Icon name="search" size={48} color="gray-400" />
  <Title>검색 결과가 없습니다</Title>
  <Message>
    다른 검색어로 시도해보세요.
  </Message>
</EmptyState>
```

---

## 12. 다크모드 (선택사항)

### 12.1 토글 UI
```jsx
<DarkModeToggle>
  <Icon name={isDark ? 'moon' : 'sun'} />
</DarkModeToggle>
```

### 12.2 색상 변수
```css
/* Light Mode */
:root {
  --bg-primary: #FFFFFF;
  --bg-secondary: #F9FAFB;
  --text-primary: #111827;
  --text-secondary: #6B7280;
}

/* Dark Mode */
:root[data-theme='dark'] {
  --bg-primary: #111827;
  --bg-secondary: #1F2937;
  --text-primary: #F9FAFB;
  --text-secondary: #D1D5DB;
}
```

---

## 13. 구현 우선순위

### Phase 1: 핵심 UI (1주차)
- [x] 레이아웃 시스템
- [x] 컬러/타이포그래피 시스템
- [ ] 홈페이지
- [ ] 랭킹 페이지 (일간/주간/월간 탭)
- [ ] 기본 컴포넌트 (Button, Card, Badge)

### Phase 2: 상세 기능 (2주차)
- [ ] 곡 상세 페이지
- [ ] 차트 컴포넌트 (Recharts)
- [ ] 신곡 페이지
- [ ] 로딩/에러 상태

### Phase 3: 고도화 (3주차)
- [ ] 검색 기능
- [ ] 애니메이션
- [ ] 반응형 최적화
- [ ] 접근성 개선

### Phase 4: 선택 기능
- [ ] 다크모드
- [ ] 고급 필터
- [ ] 곡 비교
- [ ] PWA 지원

---

## 14. 참고 자료

### 14.1 디자인 시스템
- Tailwind CSS: https://tailwindcss.com
- Headless UI: https://headlessui.com
- Radix UI: https://www.radix-ui.com

### 14.2 차트 라이브러리
- Recharts: https://recharts.org
- Chart.js (대안): https://www.chartjs.org

### 14.3 애니메이션
- Framer Motion: https://www.framer.com/motion

### 14.4 아이콘
- Heroicons: https://heroicons.com
- Lucide Icons: https://lucide.dev

---

## 부록: Figma 와이어프레임 가이드

실제 디자인 작업 시 Figma에서 다음 구조로 작업하면 효율적입니다:

```
📁 Vocatify Design System
├── 🎨 Colors
├── 📝 Typography
├── 🧩 Components
│   ├── Atoms (Button, Badge, Input)
│   ├── Molecules (StatCard, SongCard)
│   └── Organisms (RankingTable, Header)
├── 📱 Pages
│   ├── Home
│   ├── Ranking
│   ├── New Songs
│   └── Song Detail
└── 📐 Responsive Layouts
    ├── Mobile (375px)
    ├── Tablet (768px)
    └── Desktop (1440px)
```

---

**문서 종료**

이 UI 정의서를 기반으로 개발을 진행하시면 됩니다.
추가 질문이나 특정 컴포넌트의 상세 명세가 필요하시면 말씀해주세요!

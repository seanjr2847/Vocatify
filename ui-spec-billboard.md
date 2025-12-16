# Vocatify UI 정의서 v2.0 - Billboard Style

## 문서 정보
- **프로젝트명**: Vocatify
- **버전**: 2.0 (Billboard Style)
- **작성일**: 2025-12-16
- **디자인 컨셉**: Billboard Charts 스타일 적용
- **목적**: 보컬로이드 YouTube 일간/월간 차트 시스템 UI/UX 명세

---

## 1. 디자인 컨셉

### 1.1 Billboard Charts 핵심 요소

**차용할 디자인 특징**:
- ✅ **대형 순위 번호**: 왼쪽에 크고 굵은 순위 표시
- ✅ **프로페셔널한 타이포그래피**: 깔끔하고 읽기 쉬운 폰트
- ✅ **순위 변동 강조**: 화살표와 숫자로 명확한 변동 표시
- ✅ **데이터 중심 레이아웃**: 불필요한 장식 제거
- ✅ **명확한 시각적 계층**: 중요 정보 우선 표시
- ✅ **전문적인 색상**: 블랙, 골드, 화이트 기반

### 1.2 Vocatify 차별화 요소

- 🎵 **보컬로이드 감성 유지**: 청록색 포인트 컬러
- 📱 **완벽한 반응형**: 모바일 최적화
- ⚡ **빠른 로딩**: 성능 우선 설계

---

## 2. 컬러 시스템 (Billboard-Inspired)

### 2.1 Primary Colors
```css
/* Billboard 스타일: 블랙 & 골드 */
--billboard-black: #000000;     /* 메인 배경 */
--billboard-gold: #D4AF37;      /* 1위 하이라이트 */
--billboard-silver: #C0C0C0;    /* 2-3위 */
--billboard-white: #FFFFFF;     /* 텍스트 */

/* Vocatify 포인트 컬러 */
--vocaloid-cyan: #00D9D9;       /* 미쿠 청록색 (액센트) */
--vocaloid-cyan-dark: #00A3A3;  /* 호버 */
```

### 2.2 Rank Colors (순위별 색상)
```css
--rank-1: #D4AF37;              /* 골드 (1위) */
--rank-2-3: #C0C0C0;            /* 실버 (2-3위) */
--rank-4-10: #CD7F32;           /* 브론즈 (4-10위) */
--rank-11-plus: #FFFFFF;        /* 화이트 (11위~) */
```

### 2.3 Movement Colors (순위 변동)
```css
--movement-up: #10B981;         /* 상승 (초록) */
--movement-down: #EF4444;       /* 하락 (빨강) */
--movement-new: #D4AF37;        /* 신규 (골드) */
--movement-same: #6B7280;       /* 변동없음 (회색) */
```

### 2.4 Background Palette
```css
--bg-primary: #000000;          /* 메인 배경 (블랙) */
--bg-secondary: #0A0A0A;        /* 카드 배경 */
--bg-tertiary: #1A1A1A;         /* 섹션 구분 */
--bg-hover: #2A2A2A;            /* 호버 상태 */

/* 라이트 모드 (선택사항) */
--bg-light-primary: #FFFFFF;
--bg-light-secondary: #F8F9FA;
--bg-light-tertiary: #E9ECEF;
```

### 2.5 Text Colors
```css
--text-primary: #FFFFFF;        /* 주 텍스트 (화이트) */
--text-secondary: #A0A0A0;      /* 보조 텍스트 (회색) */
--text-tertiary: #707070;       /* 부가 정보 */
--text-accent: #00D9D9;         /* 강조 (청록) */
```

---

## 3. 타이포그래피 (Billboard Style)

### 3.1 Font Family
```css
/* 순위 번호 - 굵고 임팩트 있는 폰트 */
--font-rank: 'Inter', -apple-system, sans-serif;

/* 본문 - 깔끔하고 읽기 쉬운 폰트 */
--font-body: 'Pretendard Variable', -apple-system, sans-serif;

/* 숫자 (조회수, 증가량) - 모노스페이스 */
--font-numbers: 'JetBrains Mono', 'Courier New', monospace;

/* 타이틀 - 강조용 */
--font-display: 'Inter', sans-serif;
```

### 3.2 Rank Number Typography
```css
/* Billboard 스타일 대형 순위 */
--rank-size-1: 4.5rem;      /* 72px - 1위 */
--rank-size-2-3: 4rem;      /* 64px - 2-3위 */
--rank-size-4-10: 3.5rem;   /* 56px - 4-10위 */
--rank-size-default: 3rem;  /* 48px - 11위~ */

--rank-weight: 900;         /* Ultra Bold */
--rank-line-height: 1;
```

### 3.3 Content Typography
```css
--text-xs: 0.75rem;    /* 12px - 메타 정보 */
--text-sm: 0.875rem;   /* 14px - 보조 정보 */
--text-base: 1rem;     /* 16px - 본문 */
--text-lg: 1.125rem;   /* 18px - 곡 제목 */
--text-xl: 1.25rem;    /* 20px - 섹션 타이틀 */
--text-2xl: 1.5rem;    /* 24px - 페이지 타이틀 */
--text-3xl: 2rem;      /* 32px - 헤더 */

--weight-normal: 400;
--weight-medium: 500;
--weight-semibold: 600;
--weight-bold: 700;
--weight-extrabold: 800;
--weight-black: 900;
```

---

## 4. 레이아웃 시스템

### 4.1 Billboard-Style Grid
```
┌──────────────────────────────────────────────────────────┐
│ Header (Black Background)                                │
│ ┌──────────┐                                             │
│ │ VOCATIFY │  [일간] [주간] [월간] [신곡]                │
│ └──────────┘                                             │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ Chart Header                                             │
│ ┌────────────────────────────────────────────────────┐   │
│ │ VOCALOID DAILY TOP 100                             │   │
│ │ 2024년 12월 16일 기준                               │   │
│ └────────────────────────────────────────────────────┘   │
│                                                          │
│ Ranking Items (List)                                     │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ ┌────┐                                               │ │
│ │ │    │  [썸네일]  千本桜                    1,234,567│ │
│ │ │ 1  │            黒うさP feat. 初音ミク     +12.5K │ │
│ │ │    │            ▲ 3                               │ │
│ │ └────┘                                               │ │
│ ├──────────────────────────────────────────────────────┤ │
│ │ ┌────┐                                               │ │
│ │ │ 2  │  [썸네일]  メルト                      987,654│ │
│ │ └────┘            ryo                        +10.2K │ │
│ │                  ▼ 1                                 │ │
│ └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### 4.2 Ranking Item Structure
```
┌─────────────────────────────────────────────────────────────┐
│ ┌──────┐ ┌─────────┐ ┌───────────────────┐ ┌────────────┐ │
│ │      │ │         │ │ 곡 제목 (Large)     │ │ 조회수      │ │
│ │ RANK │ │ THUMB   │ │ 아티스트 (Small)    │ │ (Mono)     │ │
│ │ (Big)│ │ (16:9)  │ │ 순위변동 (Arrow)    │ │            │ │
│ │      │ │         │ │                   │ │ 증가량      │ │
│ └──────┘ └─────────┘ └───────────────────┘ └────────────┘ │
│  80px     120x68px      Flex-grow           Right-align   │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. 컴포넌트 명세 (Billboard Style)

### 5.1 Rank Badge (순위 배지)

**디자인**:
```jsx
<RankBadge rank={1} previousRank={4}>
  {/* 1위 */}
  <div className="rank-badge rank-1">
    <span className="rank-number">1</span>
    <span className="rank-crown">👑</span>
  </div>
</RankBadge>
```

**스타일**:
```css
.rank-badge {
  width: 80px;
  height: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  border-radius: 4px;
}

/* 1위 - 골드 배경 */
.rank-1 {
  background: linear-gradient(135deg, #D4AF37 0%, #F9E79F 100%);
  color: #000000;
  font-size: 4.5rem;
  box-shadow: 0 4px 12px rgba(212, 175, 55, 0.4);
}

/* 2-3위 - 실버 배경 */
.rank-2,
.rank-3 {
  background: linear-gradient(135deg, #C0C0C0 0%, #E8E8E8 100%);
  color: #000000;
  font-size: 4rem;
}

/* 4-10위 - 브론즈 배경 */
.rank-4-10 {
  background: linear-gradient(135deg, #CD7F32 0%, #E9B872 100%);
  color: #FFFFFF;
  font-size: 3.5rem;
}

/* 11위~ - 다크 배경 */
.rank-default {
  background: #1A1A1A;
  color: #FFFFFF;
  font-size: 3rem;
  border: 2px solid #333333;
}
```

### 5.2 Movement Indicator (순위 변동 표시)

**변동 타입**:
```jsx
// 상승
<Movement type="up" value={3}>
  <span className="movement-icon">▲</span>
  <span className="movement-value">3</span>
</Movement>

// 하락
<Movement type="down" value={2}>
  <span className="movement-icon">▼</span>
  <span className="movement-value">2</span>
</Movement>

// 신규 진입
<Movement type="new">
  <span className="movement-badge">NEW</span>
</Movement>

// 변동 없음
<Movement type="same">
  <span className="movement-same">—</span>
</Movement>
```

**스타일**:
```css
.movement {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.875rem;
  font-weight: 700;
}

.movement-up {
  color: #10B981;
}

.movement-up .movement-icon {
  font-size: 1rem;
}

.movement-down {
  color: #EF4444;
}

.movement-new {
  background: #D4AF37;
  color: #000000;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 900;
}

.movement-same {
  color: #6B7280;
}
```

### 5.3 Ranking Row (Billboard Style)

**구조**:
```jsx
<RankingRow song={song} rank={1} previousRank={4}>
  <div className="ranking-row">
    {/* 순위 배지 */}
    <div className="rank-section">
      <RankBadge rank={1} />
    </div>

    {/* 썸네일 */}
    <div className="thumbnail-section">
      <img src={thumbnailUrl} alt={title} />
      <PlayOverlay /> {/* 호버 시 재생 아이콘 */}
    </div>

    {/* 곡 정보 */}
    <div className="info-section">
      <h3 className="song-title">{title}</h3>
      <p className="artist-name">{artist}</p>
      <Movement type="up" value={3} />
    </div>

    {/* 통계 */}
    <div className="stats-section">
      <div className="view-count">
        <span className="label">조회수</span>
        <span className="value">1,234,567</span>
      </div>
      <div className="daily-increase">
        <span className="label">일간</span>
        <span className="value positive">+12.5K</span>
      </div>
    </div>
  </div>
</RankingRow>
```

**스타일**:
```css
.ranking-row {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 16px 24px;
  background: #0A0A0A;
  border-bottom: 1px solid #1A1A1A;
  transition: all 0.2s ease;
}

.ranking-row:hover {
  background: #1A1A1A;
  transform: translateX(4px);
  cursor: pointer;
}

/* 순위 섹션 */
.rank-section {
  flex-shrink: 0;
}

/* 썸네일 섹션 */
.thumbnail-section {
  position: relative;
  flex-shrink: 0;
  width: 120px;
  height: 68px;
  border-radius: 4px;
  overflow: hidden;
}

.thumbnail-section img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 곡 정보 섹션 */
.info-section {
  flex: 1;
  min-width: 0;
}

.song-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: #FFFFFF;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.artist-name {
  font-size: 0.875rem;
  color: #A0A0A0;
  margin-bottom: 6px;
}

/* 통계 섹션 */
.stats-section {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  flex-shrink: 0;
}

.view-count,
.daily-increase {
  text-align: right;
}

.stats-section .label {
  display: block;
  font-size: 0.75rem;
  color: #707070;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stats-section .value {
  display: block;
  font-family: var(--font-numbers);
  font-size: 1.25rem;
  font-weight: 700;
  color: #FFFFFF;
}

.stats-section .value.positive {
  color: #10B981;
}

.stats-section .value.negative {
  color: #EF4444;
}
```

### 5.4 Chart Header (Billboard Style)

**디자인**:
```jsx
<ChartHeader type="daily" date="2024-12-16">
  <div className="chart-header">
    <div className="chart-title-section">
      <h1 className="chart-title">VOCALOID DAILY TOP 100</h1>
      <p className="chart-subtitle">2024년 12월 16일 기준</p>
    </div>

    <div className="chart-meta">
      <div className="update-info">
        <span className="label">마지막 업데이트</span>
        <span className="time">3분 전</span>
      </div>
      <div className="total-views">
        <span className="label">총 조회수</span>
        <span className="value">15.2B</span>
      </div>
    </div>
  </div>
</ChartHeader>
```

**스타일**:
```css
.chart-header {
  background: linear-gradient(135deg, #000000 0%, #1A1A1A 100%);
  border-left: 4px solid #D4AF37;
  padding: 32px 40px;
  margin-bottom: 32px;
}

.chart-title {
  font-size: 2.5rem;
  font-weight: 900;
  color: #FFFFFF;
  letter-spacing: 0.02em;
  margin-bottom: 8px;
  text-transform: uppercase;
}

.chart-subtitle {
  font-size: 1rem;
  color: #A0A0A0;
  font-weight: 400;
}

.chart-meta {
  display: flex;
  gap: 32px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #2A2A2A;
}

.chart-meta .label {
  display: block;
  font-size: 0.75rem;
  color: #707070;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.chart-meta .value,
.chart-meta .time {
  font-size: 1.125rem;
  font-weight: 700;
  color: #00D9D9;
}
```

---

## 6. 페이지 레이아웃 (Billboard Style)

### 6.1 일간 랭킹 페이지

```
┌──────────────────────────────────────────────────────────────┐
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ HEADER (Fixed, Black)                                    │ │
│ │ VOCATIFY    [일간] [주간] [월간] [신곡]                   │ │
│ └──────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ CHART HEADER                                             │ │
│ │ ┌────┐ VOCALOID DAILY TOP 100                           │ │
│ │ └────┘ 2024년 12월 16일                                  │ │
│ └──────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│ RANKING LIST                                                 │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ ┌──────┐ ┌────┐ ┌─────────────────┐ ┌────────────┐      │ │
│ │ │      │ │    │ │ 千本桜           │ │ 1,234,567  │      │ │
│ │ │  1   │ │ 📷 │ │ 黒うさP          │ │ +12.5K ▲3  │      │ │
│ │ │ 👑   │ │    │ │                 │ │            │      │ │
│ │ └──────┘ └────┘ └─────────────────┘ └────────────┘      │ │
│ ├──────────────────────────────────────────────────────────┤ │
│ │ ┌──────┐ ┌────┐ ┌─────────────────┐ ┌────────────┐      │ │
│ │ │  2   │ │ 📷 │ │ メルト           │ │ 987,654    │      │ │
│ │ │      │ │    │ │ ryo             │ │ +10.2K ▼1  │      │ │
│ │ └──────┘ └────┘ └─────────────────┘ └────────────┘      │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ [1] [2] [3] [4] [5] ... [10]                                │
└──────────────────────────────────────────────────────────────┘
```

### 6.2 곡 상세 페이지 (Billboard Style)

```
┌──────────────────────────────────────────────────────────────┐
│ Song Header (Hero Section)                                   │
│ ┌────────────────────────────────────────────────────────┐   │
│ │ ┌──────────┐ ┌────────────────────────────────────┐   │   │
│ │ │          │ │ 千本桜                              │   │   │
│ │ │  Large   │ │ 黒うさP feat. 初音ミク             │   │   │
│ │ │  Thumb   │ │                                    │   │   │
│ │ │ (300x170)│ │ 발매: 2011-09-17                   │   │   │
│ │ │          │ │ 현재 순위: #3 (최고: #1)            │   │   │
│ │ └──────────┘ │ [▶ YouTube에서 보기]                │   │   │
│ │              └────────────────────────────────────┘   │   │
│ └────────────────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────────────────┤
│ Stats Cards (4-Column)                                       │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                │
│ │총조회수 │ │일간     │ │주간     │ │월간     │                │
│ │123.4M  │ │+12.5K  │ │+98.0K  │ │+420K   │                │
│ └────────┘ └────────┘ └────────┘ └────────┘                │
├──────────────────────────────────────────────────────────────┤
│ Chart Area (Billboard Style Line Chart)                     │
│ ┌────────────────────────────────────────────────────────┐   │
│ │ 123.5M ┤           ╱─                                  │   │
│ │        │        ╱                                      │   │
│ │ 123.0M ┤     ╱                                         │   │
│ │        │   ╱                                           │   │
│ │ 122.5M ┼─────────────────────────────────────────────  │   │
│ │        11/16    11/23    11/30    12/07    12/14      │   │
│ └────────────────────────────────────────────────────────┘   │
│ [7일] [30일] [90일] [전체]                                   │
└──────────────────────────────────────────────────────────────┘
```

---

## 7. 반응형 디자인 (Billboard Style)

### 7.1 Mobile Layout (< 768px)

**순위 카드형 변환**:
```
┌─────────────────────────────────┐
│ ┌───────────────────────────┐   │
│ │ ┌────┐ ┌────────────────┐ │   │
│ │ │ 1  │ │ 千本桜          │ │   │
│ │ │ 👑 │ │ 黒うさP         │ │   │
│ │ └────┘ └────────────────┘ │   │
│ │                           │   │
│ │ ┌───────────┐             │   │
│ │ │ 썸네일     │  1,234,567 │   │
│ │ │ (16:9)    │  +12.5K    │   │
│ │ └───────────┘  ▲ 3       │   │
│ └───────────────────────────┘   │
│                                 │
│ ┌───────────────────────────┐   │
│ │ 2위 카드...               │   │
│ └───────────────────────────┘   │
└─────────────────────────────────┘
```

**모바일 스타일**:
```css
@media (max-width: 768px) {
  .ranking-row {
    flex-direction: column;
    align-items: stretch;
    padding: 16px;
  }

  .rank-section {
    position: absolute;
    top: 16px;
    left: 16px;
    z-index: 10;
  }

  .rank-badge {
    width: 60px;
    height: 60px;
    font-size: 2rem !important;
  }

  .thumbnail-section {
    width: 100%;
    height: auto;
    aspect-ratio: 16/9;
    margin-bottom: 12px;
  }

  .info-section {
    order: 2;
  }

  .stats-section {
    order: 3;
    flex-direction: row;
    justify-content: space-between;
    width: 100%;
  }
}
```

---

## 8. 애니메이션 & 인터랙션

### 8.1 Hover Effects (Billboard Style)

```css
/* 랭킹 행 호버 */
.ranking-row {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.ranking-row:hover {
  background: #1A1A1A;
  transform: translateX(8px);
  box-shadow: -4px 0 0 0 #00D9D9;
}

/* 순위 배지 호버 (펄스 효과) */
.rank-badge:hover {
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(212, 175, 55, 0.7);
  }
  50% {
    box-shadow: 0 0 0 10px rgba(212, 175, 55, 0);
  }
}

/* 썸네일 호버 (확대) */
.thumbnail-section:hover img {
  transform: scale(1.1);
  transition: transform 0.3s ease;
}
```

### 8.2 순위 변동 애니메이션

```jsx
// 순위 상승 시 강조 효과
<motion.div
  initial={{ opacity: 0, x: -20 }}
  animate={{ opacity: 1, x: 0 }}
  className={cn(
    "ranking-row",
    rankChange > 0 && "highlight-up"
  )}
>
  {children}
</motion.div>
```

```css
.ranking-row.highlight-up {
  background: linear-gradient(
    90deg,
    rgba(16, 185, 129, 0.1) 0%,
    transparent 100%
  );
  animation: slideIn 0.5s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateX(-20px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
```

---

## 9. 타입 정의 (컴포넌트)

### 9.1 Ranking Components

```typescript
// components/RankBadge.tsx
interface RankBadgeProps {
  rank: number;
  size?: 'sm' | 'md' | 'lg';
  showCrown?: boolean; // 1위 왕관 표시
}

export function RankBadge({ rank, size = 'md', showCrown = true }: RankBadgeProps) {
  const getRankClass = () => {
    if (rank === 1) return 'rank-1';
    if (rank >= 2 && rank <= 3) return 'rank-2-3';
    if (rank >= 4 && rank <= 10) return 'rank-4-10';
    return 'rank-default';
  };

  return (
    <div className={cn('rank-badge', getRankClass(), `size-${size}`)}>
      <span className="rank-number">{rank}</span>
      {rank === 1 && showCrown && <span className="rank-crown">👑</span>}
    </div>
  );
}

// components/MovementIndicator.tsx
interface MovementProps {
  type: 'up' | 'down' | 'new' | 'same';
  value?: number;
}

export function MovementIndicator({ type, value }: MovementProps) {
  if (type === 'new') {
    return <span className="movement-badge new">NEW</span>;
  }

  if (type === 'same') {
    return <span className="movement-same">—</span>;
  }

  return (
    <span className={cn('movement', `movement-${type}`)}>
      <span className="movement-icon">{type === 'up' ? '▲' : '▼'}</span>
      <span className="movement-value">{value}</span>
    </span>
  );
}

// components/BillboardRankingRow.tsx
interface BillboardRankingRowProps {
  song: {
    videoId: string;
    title: string;
    artist: string | null;
    thumbnailUrl: string | null;
    viewCount: number;
    dailyIncrease: number;
  };
  rank: number;
  previousRank?: number | null;
  onClick?: () => void;
}

export function BillboardRankingRow({
  song,
  rank,
  previousRank,
  onClick
}: BillboardRankingRowProps) {
  const rankChange = previousRank ? previousRank - rank : null;

  return (
    <div className="ranking-row" onClick={onClick}>
      <div className="rank-section">
        <RankBadge rank={rank} />
      </div>

      <div className="thumbnail-section">
        <img src={song.thumbnailUrl} alt={song.title} />
        <PlayOverlay />
      </div>

      <div className="info-section">
        <h3 className="song-title">{song.title}</h3>
        <p className="artist-name">{song.artist}</p>
        <MovementIndicator
          type={
            rankChange === null ? 'new' :
            rankChange > 0 ? 'up' :
            rankChange < 0 ? 'down' : 'same'
          }
          value={rankChange ? Math.abs(rankChange) : undefined}
        />
      </div>

      <div className="stats-section">
        <div className="view-count">
          <span className="label">조회수</span>
          <span className="value">
            {song.viewCount.toLocaleString()}
          </span>
        </div>
        <div className="daily-increase">
          <span className="label">일간</span>
          <span className={cn(
            'value',
            song.dailyIncrease > 0 ? 'positive' : 'negative'
          )}>
            {song.dailyIncrease > 0 ? '+' : ''}
            {formatNumber(song.dailyIncrease)}
          </span>
        </div>
      </div>
    </div>
  );
}
```

---

## 10. 구현 우선순위

### Phase 1: Billboard 핵심 컴포넌트 (3일)
- [ ] RankBadge (순위 배지)
- [ ] MovementIndicator (변동 표시)
- [ ] BillboardRankingRow (랭킹 행)
- [ ] ChartHeader (차트 헤더)

### Phase 2: 페이지 레이아웃 (3일)
- [ ] 일간 랭킹 페이지
- [ ] 주간/월간 랭킹 페이지
- [ ] 곡 상세 페이지

### Phase 3: 반응형 최적화 (2일)
- [ ] 모바일 레이아웃
- [ ] 태블릿 레이아웃
- [ ] 터치 최적화

### Phase 4: 애니메이션 & 폴리시 (2일)
- [ ] 호버 효과
- [ ] 순위 변동 애니메이션
- [ ] 로딩 스켈레톤

---

## 부록: Billboard vs Vocatify 비교

| 요소 | Billboard | Vocatify (적용) |
|------|-----------|----------------|
| 배경색 | 화이트/블랙 | 블랙 (다크 테마) |
| 순위 표시 | 대형 숫자 | ✅ 대형 숫자 + 배지 |
| 순위 변동 | 화살표 | ✅ 화살표 + 색상 |
| 1위 강조 | 골드 | ✅ 골드 배지 + 왕관 |
| 레이아웃 | 리스트 | ✅ 리스트 (카드형 옵션) |
| 타이포그래피 | 굵은 폰트 | ✅ Inter 900 |
| 데이터 표시 | 조회수, 증가량 | ✅ 동일 + 일간/주간 |
| 포인트 컬러 | 없음 | 청록색 (보컬로이드) |

---

**UI 정의서 v2.0 (Billboard Style) 종료**

이 명세서를 기반으로 Billboard Charts 스타일의 세련된 UI를 구현하실 수 있습니다!

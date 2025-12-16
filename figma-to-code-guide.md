# Figma → Code 변환 가이드

## 📋 목차
1. [변환 방법 개요](#1-변환-방법-개요)
2. [자동 변환 툴](#2-자동-변환-툴)
3. [수동 변환 워크플로우](#3-수동-변환-워크플로우)
4. [단계별 실전 가이드](#4-단계별-실전-가이드)
5. [컴포넌트 변환 예시](#5-컴포넌트-변환-예시)
6. [팁 & 베스트 프랙티스](#6-팁--베스트-프랙티스)

---

## 1. 변환 방법 개요

### 방법 비교

| 방법 | 장점 | 단점 | 추천도 |
|------|------|------|--------|
| **자동 변환 (플러그인)** | 빠름, 정확한 수치 | 코드 품질 낮음, 수정 필요 | ⭐⭐⭐ |
| **수동 변환** | 깔끔한 코드, 최적화 | 시간 소요, 실수 가능 | ⭐⭐⭐⭐⭐ |
| **하이브리드** | 속도 + 품질 균형 | 학습 필요 | ⭐⭐⭐⭐⭐ |

### 추천 워크플로우 (하이브리드)

```
1. Figma에서 스타일 추출 (자동)
   ↓
2. 컴포넌트 구조 파악 (수동)
   ↓
3. 기본 레이아웃 생성 (자동 참고)
   ↓
4. 코드 정제 및 최적화 (수동)
   ↓
5. 반응형 및 인터랙션 추가 (수동)
```

---

## 2. 자동 변환 툴

### 2.1 Figma 공식 기능

#### Dev Mode (Figma 내장) ⭐ 추천
```
사용법:
1. Figma 파일 열기
2. 우측 상단 "Dev Mode" 클릭
3. 원하는 요소 선택
4. 우측 패널에서 CSS/Tailwind 코드 복사
```

**장점**:
- ✅ 추가 설치 불필요
- ✅ 정확한 수치 (padding, margin, font-size)
- ✅ CSS, Tailwind, iOS, Android 지원

**예시**:
```css
/* Figma Dev Mode가 생성한 CSS */
.ranking-badge {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #D4AF37 0%, #F9E79F 100%);
  border-radius: 4px;
  font-size: 72px;
  font-weight: 900;
}
```

#### Inspect 패널
```
1. 요소 선택
2. 우측 "Inspect" 탭
3. CSS 코드 확인
```

### 2.2 Figma 플러그인

#### 1. **Anima** - HTML/React 변환
```
설치: Figma → Plugins → Anima

기능:
✅ Figma → React 컴포넌트
✅ 반응형 코드 생성
✅ Tailwind CSS 지원

사용법:
1. 프레임 선택
2. Plugins → Anima → Export Code
3. React/HTML 선택
4. 코드 복사
```

**생성 예시**:
```jsx
// Anima가 생성한 React 코드
export function RankingRow() {
  return (
    <div className="flex items-center gap-6 px-6 py-4 bg-gray-900">
      <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-200 rounded flex items-center justify-center">
        <span className="text-6xl font-black">1</span>
      </div>
      <img src="thumbnail.jpg" className="w-32 h-18 rounded" />
      <div className="flex-1">
        <h3 className="text-lg font-bold text-white">千本桜</h3>
        <p className="text-sm text-gray-400">黒うさP</p>
      </div>
    </div>
  );
}
```

#### 2. **Locofy** - Next.js/React 특화
```
설치: https://www.locofy.ai

기능:
✅ Next.js 프로젝트 생성
✅ 컴포넌트 자동 분리
✅ Tailwind/CSS Modules

장점:
- Next.js App Router 지원
- TypeScript 생성
- 반응형 자동 변환
```

#### 3. **Quest** - Figma to React
```
설치: https://www.quest.ai

기능:
✅ AI 기반 코드 생성
✅ 컴포넌트 인식
✅ Props 자동 생성

특징:
- 깔끔한 코드 품질
- 반응형 자동 처리
```

#### 4. **Figma to Code (HTML/CSS)**
```
무료 플러그인

기능:
✅ HTML/CSS 변환
✅ Tailwind 지원
✅ 빠른 프로토타이핑

단점:
- React 미지원
- 수동 변환 필요
```

### 2.3 추천 조합

```
Phase 1: 스타일 추출
→ Figma Dev Mode (CSS 수치)

Phase 2: 기본 구조 생성
→ Anima 또는 Locofy (컴포넌트)

Phase 3: 코드 정제
→ 수동 최적화
```

---

## 3. 수동 변환 워크플로우

### 3.1 준비 단계

#### Figma 파일 정리
```
✅ 레이어 이름 의미있게 (RankBadge, SongTitle)
✅ Auto Layout 사용 (Flexbox로 변환됨)
✅ 컴포넌트로 정리 (재사용 요소)
✅ 색상/폰트 스타일 정의
✅ 반응형 제약조건 설정
```

#### 스타일 가이드 추출
```
1. Figma에서 Color Styles 확인
2. Text Styles 확인
3. Effects (그림자 등) 확인
4. CSS 변수로 정리
```

**예시**:
```css
/* Figma에서 추출한 색상 */
:root {
  --billboard-black: #000000;
  --billboard-gold: #D4AF37;
  --vocaloid-cyan: #00D9D9;
  --text-primary: #FFFFFF;
  --text-secondary: #A0A0A0;
}

/* Figma에서 추출한 타이포그래피 */
:root {
  --font-rank: 'Inter', sans-serif;
  --rank-size-1: 72px;
  --rank-weight: 900;
}
```

### 3.2 컴포넌트 분해

#### 1단계: 컴포넌트 구조 파악
```
Figma 레이어 구조:
┌─ RankingRow (Frame, Auto Layout)
│  ├─ RankBadge (Component)
│  ├─ Thumbnail (Image)
│  ├─ SongInfo (Frame)
│  │  ├─ Title (Text)
│  │  ├─ Artist (Text)
│  │  └─ Movement (Component)
│  └─ Stats (Frame)
│     ├─ ViewCount (Text)
│     └─ DailyIncrease (Text)
```

#### 2단계: 컴포넌트 매핑
```
Figma Component → React Component

RankBadge → components/RankBadge.tsx
RankingRow → components/RankingRow.tsx
Movement → components/MovementIndicator.tsx
```

### 3.3 스타일 변환

#### Figma Auto Layout → Flexbox
```
Figma:
┌─────────────────────┐
│ Frame (Auto Layout) │
│ Direction: Horizontal
│ Gap: 24px
│ Padding: 16px 24px
│ Align: Center
└─────────────────────┘

CSS/Tailwind:
<div class="flex items-center gap-6 px-6 py-4">
```

#### Figma Fill → Background
```
Figma:
Fill: Linear Gradient
  - Color 1: #D4AF37 (0%)
  - Color 2: #F9E79F (100%)
  - Angle: 135°

CSS:
background: linear-gradient(135deg, #D4AF37 0%, #F9E79F 100%);

Tailwind:
class="bg-gradient-to-br from-yellow-500 to-yellow-200"
```

#### Figma Effects → Box Shadow
```
Figma:
Drop Shadow
  - X: 0, Y: 4
  - Blur: 12
  - Color: #D4AF37 (40%)

CSS:
box-shadow: 0 4px 12px rgba(212, 175, 55, 0.4);

Tailwind:
class="shadow-[0_4px_12px_rgba(212,175,55,0.4)]"
```

---

## 4. 단계별 실전 가이드

### Step 1: 프로젝트 셋업

```bash
# Next.js 프로젝트 생성
npx create-next-app@latest vocatify \
  --typescript \
  --tailwind \
  --app \
  --src-dir

cd vocatify
```

### Step 2: 디자인 토큰 생성

```typescript
// src/styles/tokens.ts
export const colors = {
  billboard: {
    black: '#000000',
    gold: '#D4AF37',
    silver: '#C0C0C0',
    bronze: '#CD7F32',
  },
  vocaloid: {
    cyan: '#00D9D9',
    cyanDark: '#00A3A3',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#A0A0A0',
    tertiary: '#707070',
  },
  movement: {
    up: '#10B981',
    down: '#EF4444',
    new: '#D4AF37',
    same: '#6B7280',
  }
};

export const typography = {
  fontFamily: {
    rank: ['Inter', 'sans-serif'],
    body: ['Pretendard Variable', 'sans-serif'],
    mono: ['JetBrains Mono', 'monospace'],
  },
  fontSize: {
    'rank-1': '4.5rem',   // 72px
    'rank-2': '4rem',     // 64px
    'rank-3': '3.5rem',   // 56px
    'rank-default': '3rem', // 48px
  },
  fontWeight: {
    black: 900,
    extrabold: 800,
    bold: 700,
  }
};
```

```javascript
// tailwind.config.js
import { colors, typography } from './src/styles/tokens';

export default {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors,
      fontFamily: typography.fontFamily,
      fontSize: typography.fontSize,
      fontWeight: typography.fontWeight,
    },
  },
};
```

### Step 3: 컴포넌트 변환 (예시: RankBadge)

#### Figma 디자인 분석
```
Component: RankBadge
├─ Size: 80x80px
├─ Background: Gradient (gold)
├─ Border Radius: 4px
├─ Text: 72px, Weight 900
└─ Crown: 36px (rank 1 only)
```

#### React 컴포넌트로 변환
```tsx
// src/components/RankBadge.tsx
import { cn } from '@/lib/utils';

interface RankBadgeProps {
  rank: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function RankBadge({ rank, size = 'md', className }: RankBadgeProps) {
  const sizeClasses = {
    sm: 'w-16 h-16 text-4xl',
    md: 'w-20 h-20 text-6xl',
    lg: 'w-24 h-24 text-7xl',
  };

  const rankClasses = {
    1: 'bg-gradient-to-br from-billboard-gold to-yellow-300 text-black shadow-[0_4px_12px_rgba(212,175,55,0.4)]',
    2: 'bg-gradient-to-br from-billboard-silver to-gray-300 text-black',
    3: 'bg-gradient-to-br from-billboard-silver to-gray-300 text-black',
  }[rank] || 'bg-gray-900 text-white border-2 border-gray-700';

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded font-black',
        sizeClasses[size],
        rankClasses,
        className
      )}
    >
      <span className="leading-none">{rank}</span>
      {rank === 1 && <span className="text-2xl">👑</span>}
    </div>
  );
}
```

### Step 4: 페이지 레이아웃 구성

```tsx
// src/app/ranking/page.tsx
import { RankingRow } from '@/components/RankingRow';
import { ChartHeader } from '@/components/ChartHeader';

export default async function RankingPage() {
  const rankings = await fetchDailyRanking();

  return (
    <div className="min-h-screen bg-black">
      {/* Figma의 Header 프레임 */}
      <ChartHeader type="daily" date={new Date()} />

      {/* Figma의 Ranking List */}
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-2">
        {rankings.map((song, index) => (
          <RankingRow
            key={song.videoId}
            song={song}
            rank={index + 1}
            previousRank={song.previousRank}
          />
        ))}
      </div>

      {/* Figma의 Pagination */}
      <Pagination currentPage={1} totalPages={10} />
    </div>
  );
}
```

---

## 5. 컴포넌트 변환 예시

### 예시 1: RankingRow 전체

#### Figma 구조
```
RankingRow (Auto Layout Horizontal, Gap 24px)
├─ RankBadge (80x80)
├─ Thumbnail (120x68)
├─ SongInfo (Flex 1)
│  ├─ Title (Text, 18px, Bold)
│  ├─ Artist (Text, 14px, Gray)
│  └─ Movement (Component)
└─ Stats (Auto Layout Vertical, Right Align)
   ├─ ViewCount (Text, Mono, 20px)
   └─ DailyIncrease (Text, Mono, 20px, Green)
```

#### React 구현
```tsx
// src/components/RankingRow.tsx
import { RankBadge } from './RankBadge';
import { MovementIndicator } from './MovementIndicator';
import Image from 'next/image';
import { formatNumber } from '@/lib/utils';

interface RankingRowProps {
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
}

export function RankingRow({ song, rank, previousRank }: RankingRowProps) {
  const rankChange = previousRank ? previousRank - rank : null;

  return (
    <div className="flex items-center gap-6 px-6 py-4 bg-gray-950 border-b border-gray-900 hover:bg-gray-900 hover:translate-x-2 transition-all duration-200 cursor-pointer group">
      {/* Rank Badge */}
      <RankBadge rank={rank} />

      {/* Thumbnail */}
      <div className="relative w-32 h-18 rounded overflow-hidden flex-shrink-0">
        <Image
          src={song.thumbnailUrl || '/placeholder.jpg'}
          alt={song.title}
          fill
          className="object-cover group-hover:scale-110 transition-transform duration-300"
        />
      </div>

      {/* Song Info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-lg font-bold text-white truncate mb-1">
          {song.title}
        </h3>
        <p className="text-sm text-gray-400 truncate mb-2">
          {song.artist || 'Unknown Artist'}
        </p>
        <MovementIndicator
          type={
            rankChange === null ? 'new' :
            rankChange > 0 ? 'up' :
            rankChange < 0 ? 'down' : 'same'
          }
          value={rankChange ? Math.abs(rankChange) : undefined}
        />
      </div>

      {/* Stats */}
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <div className="text-right">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
            조회수
          </div>
          <div className="text-xl font-bold text-white font-mono">
            {formatNumber(song.viewCount)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
            일간
          </div>
          <div className={cn(
            'text-xl font-bold font-mono',
            song.dailyIncrease > 0 ? 'text-green-500' : 'text-red-500'
          )}>
            {song.dailyIncrease > 0 ? '+' : ''}
            {formatNumber(song.dailyIncrease)}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 예시 2: MovementIndicator

#### Figma 디자인
```
Movement Variants:
├─ Up: ▲ 3 (Green)
├─ Down: ▼ 2 (Red)
├─ New: NEW badge (Gold)
└─ Same: — (Gray)
```

#### React 구현
```tsx
// src/components/MovementIndicator.tsx
interface MovementIndicatorProps {
  type: 'up' | 'down' | 'new' | 'same';
  value?: number;
}

export function MovementIndicator({ type, value }: MovementIndicatorProps) {
  if (type === 'new') {
    return (
      <span className="inline-flex items-center px-2 py-1 bg-billboard-gold text-black text-xs font-black rounded uppercase">
        NEW
      </span>
    );
  }

  if (type === 'same') {
    return (
      <span className="text-sm text-gray-600 font-bold">
        —
      </span>
    );
  }

  const Icon = type === 'up' ? '▲' : '▼';
  const colorClass = type === 'up' ? 'text-green-500' : 'text-red-500';

  return (
    <span className={cn('inline-flex items-center gap-1 text-sm font-bold', colorClass)}>
      <span className="text-base">{Icon}</span>
      <span>{value}</span>
    </span>
  );
}
```

---

## 6. 팁 & 베스트 프랙티스

### 6.1 Figma 파일 준비 팁

```
✅ DO:
- 컴포넌트 사용 (재사용 요소)
- Auto Layout 활용
- 의미있는 레이어명
- 스타일 가이드 정의
- 8px 그리드 시스템

❌ DON'T:
- Absolute 포지셔닝 남발
- 랜덤한 레이어명 (Rectangle 123)
- 하드코딩된 색상값
- 일관성 없는 간격
```

### 6.2 효율적인 변환 팁

#### 1. 스타일 먼저 추출
```bash
# 순서
1. 색상 변수 정의 (tokens.ts)
2. 타이포그래피 설정 (tailwind.config)
3. 공통 컴포넌트 제작 (Button, Badge)
4. 페이지 조립
```

#### 2. 작은 컴포넌트부터
```
작은 것부터:
Button → Badge → Card → Section → Page
```

#### 3. Figma Inspect 활용
```
1. 요소 선택
2. Dev Mode 켜기
3. CSS 복사
4. Tailwind로 변환
```

**변환 예시**:
```css
/* Figma CSS */
width: 80px;
height: 80px;
background: linear-gradient(135deg, #D4AF37 0%, #F9E79F 100%);
border-radius: 4px;

/* Tailwind */
w-20 h-20 bg-gradient-to-br from-billboard-gold to-yellow-300 rounded
```

### 6.3 반응형 처리

```tsx
// Figma에서 3개 Breakpoint 디자인했다면
<div className="
  flex flex-col gap-4           /* Mobile (< 768px) */
  md:flex-row md:gap-6          /* Tablet (768px~) */
  lg:gap-8 lg:max-w-7xl         /* Desktop (1024px~) */
">
  {children}
</div>
```

### 6.4 성능 최적화

```tsx
// ❌ Bad: 모든 이미지 즉시 로드
<img src={song.thumbnailUrl} />

// ✅ Good: Next.js Image 최적화
<Image
  src={song.thumbnailUrl}
  alt={song.title}
  width={120}
  height={68}
  loading="lazy"
  placeholder="blur"
/>
```

### 6.5 유틸리티 함수

```typescript
// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Tailwind 클래스 병합
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 숫자 포맷팅
export function formatNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1)}B`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}
```

---

## 7. 실전 체크리스트

### 변환 전
- [ ] Figma 파일 정리 (레이어명, 컴포넌트)
- [ ] Auto Layout 적용
- [ ] 색상/폰트 스타일 정의
- [ ] 반응형 Breakpoint 확인
- [ ] 컴포넌트 구조 파악

### 변환 중
- [ ] 디자인 토큰 생성 (colors, typography)
- [ ] Tailwind config 설정
- [ ] 공통 컴포넌트 제작
- [ ] 페이지 레이아웃 구성
- [ ] 반응형 스타일 추가

### 변환 후
- [ ] Figma vs 코드 비교 (pixel perfect)
- [ ] 반응형 테스트 (mobile, tablet, desktop)
- [ ] 성능 최적화 (이미지, 폰트)
- [ ] 접근성 검증 (a11y)
- [ ] 인터랙션 추가 (hover, animation)

---

## 8. 추천 워크플로우

```
Day 1: 준비
├─ Figma 파일 정리
├─ 디자인 토큰 추출
└─ 프로젝트 셋업

Day 2-3: 컴포넌트
├─ RankBadge
├─ MovementIndicator
├─ RankingRow
└─ ChartHeader

Day 4-5: 페이지
├─ 홈페이지
├─ 랭킹 페이지
└─ 곡 상세 페이지

Day 6: 반응형
└─ Mobile, Tablet, Desktop

Day 7: 최적화
├─ 성능
├─ 접근성
└─ 애니메이션
```

---

## 부록: 도움되는 리소스

### VS Code Extensions
```
- Tailwind CSS IntelliSense
- Figma for VS Code
- CSS to Tailwind
- Auto Rename Tag
```

### Chrome Extensions
```
- VisBug (디자인 검증)
- Dimensions (간격 측정)
- Pesticide (레이아웃 확인)
```

### 온라인 도구
```
- https://transform.tools/css-to-tailwind
- https://omatsuri.app/color-shades-generator
- https://tailwindcss.com/docs/customizing-colors
```

---

**이제 Figma 디자인을 코드로 옮길 준비 완료!** 🚀

어떤 컴포넌트부터 시작하시겠어요?
1. RankBadge (가장 간단)
2. RankingRow (핵심 컴포넌트)
3. 전체 페이지 레이아웃
4. 다른 컴포넌트?

말씀하시면 그 컴포넌트부터 같이 만들어볼게요!

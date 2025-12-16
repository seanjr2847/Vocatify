# Vocatify - Vocaloid Music Charts

Next.js 앱으로 변환 완료! 🎉

## 프로젝트 구조

```
Vocatify/
├── app/
│   ├── globals.css        # Tailwind CSS 및 커스텀 스타일
│   ├── layout.tsx         # 루트 레이아웃 (Quicksand 폰트 적용)
│   └── page.tsx           # 메인 페이지
├── components/
│   ├── MusicPlayerSection.tsx    # 음악 플레이어 컴포넌트
│   ├── NavigationSection.tsx     # 메인 콘텐츠 섹션
│   └── ui/                # shadcn/ui 컴포넌트
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       └── scroll-area.tsx
├── public/
│   └── images/           # 이미지 파일 위치 (아래 참고)
└── lib/
    └── utils.ts          # 유틸리티 함수

```

## 시작하기

### 1. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 열기

### 2. Figma 이미지 추가하기

피그마에서 이미지를 내보낸 후, `public/images/` 폴더에 다음 파일들을 추가하세요:

**아바타 이미지:**
- `ellipse-2.png`
- `ellipse-3.png`
- `ellipse-4.png`
- `ellipse-5.png`
- `ellipse-6.png`

**앨범 커버 (New releases & Popular):**
- `rectangle-14.png`
- `rectangle-14-2.png`
- `rectangle-14-3.png`
- `rectangle-14-4.png`
- `rectangle-14-5.png`
- `rectangle-14-6.png`
- `rectangle-14-7.png`
- `rectangle-14-8.png`
- `rectangle-14-9.png`
- `rectangle-14-10.png`
- `rectangle-14-11.png`
- `rectangle-14-12.png`
- `rectangle-14-13.png`
- `image-1.png`

**Top Charts 이미지:**
- `rectangle-17.svg`
- `rectangle-17-2.svg`
- `rectangle-17-3.svg`
- `stroke-3.svg`
- `stroke-3-2.svg`
- `stroke-3-3.svg`

**배경 이미지:**
- `image.svg`
- `pexels-photo-by-eric-esma.png`

### 3. Figma에서 이미지 내보내기 방법

1. Figma에서 이미지 요소 선택
2. 우클릭 → "Export..." 선택
3. 포맷 선택 (PNG 또는 SVG)
4. "Export" 클릭
5. 내보낸 파일을 `public/images/` 폴더에 복사

## 주요 기능

- ✅ Next.js 15 App Router
- ✅ TypeScript
- ✅ Tailwind CSS (커스텀 CSS 변수 포함)
- ✅ shadcn/ui 컴포넌트
- ✅ Lucide React 아이콘
- ✅ Quicksand 폰트 (Google Fonts)
- ✅ 반응형 레이아웃
- ✅ 다크 테마 (#1d2123)
- ✅ 골드 액센트 색상 (#facd66)

## 스크립트

```bash
npm run dev      # 개발 서버 실행
npm run build    # 프로덕션 빌드
npm run start    # 프로덕션 서버 실행
npm run lint     # ESLint 실행
```

## 다음 단계

1. **이미지 추가**: Figma에서 모든 이미지를 내보내서 `public/images/` 폴더에 추가
2. **로고 추가**: 로고 이미지를 추가하고 `app/page.tsx`의 빈 `<img src="" />` 업데이트
3. **기능 개발**:
   - 음악 재생 기능 추가
   - API 연결
   - 차트 데이터 연동
4. **배포**: Vercel, Netlify 등에 배포

## 문제 해결

### 이미지가 보이지 않는 경우
- `public/images/` 폴더에 이미지 파일이 있는지 확인
- 파일 이름이 정확히 일치하는지 확인 (대소문자 구분)
- 개발 서버를 재시작해보세요

### 스타일이 적용되지 않는 경우
- `npm install`이 제대로 실행되었는지 확인
- 브라우저 캐시를 지우고 새로고침

## 기술 스택

- **Framework**: Next.js 15
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI)
- **Icons**: Lucide React
- **Font**: Quicksand (Google Fonts)

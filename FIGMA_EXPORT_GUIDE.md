# Figma 이미지 내보내기 가이드

## 📋 필요한 이미지 목록

프로젝트가 제대로 작동하려면 Figma에서 다음 이미지들을 내보내야 합니다.

### 1. 아바타 이미지 (5개)
```
public/images/ellipse-2.png
public/images/ellipse-3.png
public/images/ellipse-4.png
public/images/ellipse-5.png
public/images/ellipse-6.png
```
- **용도**: "Currated playlist" 카드의 사용자 아바타
- **크기**: 20x20px (small circles)
- **포맷**: PNG

### 2. 앨범 커버 - New Releases (7개)
```
public/images/rectangle-14.png      # Life in a bubble
public/images/image-1.png           # Mountain
public/images/rectangle-14-2.png    # Limits
public/images/rectangle-14-3.png    # Everything's black
public/images/rectangle-14-4.png    # Cancelled
public/images/rectangle-14-5.png    # Nomad
public/images/rectangle-14-6.png    # Blind
```
- **용도**: "New releases" 섹션의 앨범 커버
- **크기**: 153x153px (square)
- **포맷**: PNG

### 3. 앨범 커버 - Popular in Area (7개)
```
public/images/rectangle-14-8.png    # Life in a bubble
public/images/rectangle-14-9.png    # Mountain
public/images/rectangle-14-10.png   # Limits
public/images/rectangle-14-11.png   # Everything's black
public/images/rectangle-14-12.png   # Cancelled
public/images/rectangle-14-13.png   # Nomad
public/images/rectangle-14-7.png    # Blind
```
- **용도**: "Popular in your area" 섹션의 앨범 커버
- **크기**: 153x153px (square)
- **포맷**: PNG

### 4. Top Charts 이미지 (6개)
```
public/images/rectangle-17.svg      # Golden age of 80s (cover)
public/images/rectangle-17-2.svg    # Reggae "n" blues (cover)
public/images/rectangle-17-3.svg    # Tomorrow's tunes (cover)
public/images/stroke-3.svg          # Golden age icon
public/images/stroke-3-2.svg        # Reggae icon
public/images/stroke-3-3.svg        # Tomorrow's tunes icon
```
- **용도**: "Top charts" 섹션의 앨범 커버와 아이콘
- **크기**: 63x63px (covers), 아이콘은 원본 크기
- **포맷**: SVG

### 5. 배경 이미지 (2개)
```
public/images/image.svg                        # Background vector
public/images/pexels-photo-by-eric-esma.png   # Featured artist photo
```
- **용도**: Featured playlist 카드의 배경 및 아티스트 사진
- **포맷**: SVG, PNG

## 🎨 Figma에서 내보내기 단계

### 방법 1: 개별 요소 내보내기

1. **Figma 파일 열기**
2. **레이어에서 이미지 요소 선택**
   - 왼쪽 레이어 패널에서 이미지 찾기
   - 또는 캔버스에서 직접 클릭

3. **Export 설정**
   - 우측 패널 하단의 "Export" 섹션으로 스크롤
   - "+" 버튼 클릭하여 export 설정 추가
   - 포맷 선택:
     - **PNG**: 사진, 아바타, 앨범 커버
     - **SVG**: 아이콘, 벡터 그래픽

4. **내보내기**
   - "Export [요소이름]" 버튼 클릭
   - 파일 이름을 위의 목록과 정확히 일치하도록 변경
   - `public/images/` 폴더에 저장

### 방법 2: 일괄 내보내기 (권장)

1. **모든 이미지 선택**
   - Shift를 누른 채로 모든 이미지 요소 클릭

2. **Export 설정**
   - "Export" 패널에서 포맷 설정
   - Suffix로 구분 가능

3. **Export All**
   - 모든 파일을 한 번에 내보내기
   - 파일 이름 일괄 변경

### 방법 3: Figma Dev Mode 사용 (유료)

1. Dev Mode 활성화 (우측 상단)
2. Assets 탭 선택
3. 모든 이미지 자산 확인
4. 필요한 이미지 선택하여 다운로드

## ✅ 내보내기 완료 후 확인사항

### 1. 파일 구조 확인
```
public/
└── images/
    ├── ellipse-2.png
    ├── ellipse-3.png
    ├── ellipse-4.png
    ├── ellipse-5.png
    ├── ellipse-6.png
    ├── rectangle-14.png
    ├── rectangle-14-2.png
    ├── ... (나머지 이미지들)
    ├── image.svg
    └── pexels-photo-by-eric-esma.png
```

### 2. 파일 이름 정확성
- **대소문자 구분**: `Rectangle-14.png` ❌ → `rectangle-14.png` ✅
- **하이픈 위치**: `rectangle14-2.png` ❌ → `rectangle-14-2.png` ✅
- **확장자**: `.PNG` ❌ → `.png` ✅

### 3. 이미지 품질
- PNG: 투명 배경이 필요한 경우 확인
- SVG: 벡터가 제대로 렌더링되는지 확인
- 크기: 너무 크면 로딩 느려짐 (최적화 권장)

## 🚀 테스트하기

이미지를 모두 추가한 후:

```bash
# 개발 서버 실행
npm run dev
```

브라우저에서 확인:
- 아바타들이 겹쳐서 보이는지
- 앨범 커버들이 제대로 표시되는지
- Top charts 섹션의 이미지가 보이는지
- Featured playlist 배경이 잘 나오는지

## 🔧 문제 해결

### 이미지가 안 보이는 경우

**원인 1: 파일 경로 오류**
- 해결: `public/images/` 폴더에 있는지 확인
- ❌ `public/rectangle-14.png`
- ✅ `public/images/rectangle-14.png`

**원인 2: 파일 이름 불일치**
- 해결: 정확히 위의 목록과 일치하는지 확인
- Windows에서 파일 탐색기로 이름 확인

**원인 3: 캐시 문제**
- 해결: 개발 서버 재시작
```bash
# Ctrl+C로 서버 종료 후
npm run dev
```

**원인 4: 파일 손상**
- 해결: Figma에서 다시 내보내기
- 다른 포맷으로 시도 (PNG → JPG)

## 💡 팁

### 이미지 최적화
```bash
# 이미지 최적화 도구 사용 (선택사항)
npm install -g sharp-cli

# PNG 최적화
sharp -i public/images/*.png -o public/images/
```

### 플레이스홀더 이미지 사용
시간이 없다면 임시로 [Unsplash](https://unsplash.com) 또는 [Placeholder](https://placeholder.com)의 이미지를 사용할 수 있습니다:

```tsx
// 임시로 사용할 수 있는 플레이스홀더
<img src="https://via.placeholder.com/153" alt="placeholder" />
```

### 자동화 스크립트
반복 작업이 많다면 Figma API를 사용한 자동 내보내기도 가능합니다.

## 📚 추가 리소스

- [Figma Export 공식 문서](https://help.figma.com/hc/en-us/articles/360040028114-Export-from-Figma)
- [Next.js Image Optimization](https://nextjs.org/docs/basic-features/image-optimization)
- [Figma to Code 가이드](./figma-to-code-guide.md)

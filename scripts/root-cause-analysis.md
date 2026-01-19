# 크롤러 문제 근본 원인 분석

## 문제 요약
2026-01-13 ~ 2026-01-17: 매일 크롤러가 실행되지만 2%만 처리됨 (17,907/808,336)

## 근본 원인

### 1. 설계 불일치 (Design Mismatch)

**크롤러 (app/api/cron/youtube/route.ts)**:
```typescript
// Vercel 함수 제한: 5분 (maxDuration = 300)
maxPVsPerRun: 2000  // 5분 안에 안전하게 처리 가능한 양

// 응답
return {
  completed: false,  // "더 처리할 데이터 있음"
  pvsProcessed: 2000
}
```

**워크플로우 (.github/workflows/daily-crawlers.yml)** - 이전 버전:
```bash
# 1번만 호출하고 종료
curl POST /api/cron/youtube
# completed: false 무시
exit 0
```

**결과**: 크롤러는 "계속해줘"라고 신호를 보내지만, 워크플로우가 무시하고 종료

### 2. 잘못된 문제 진단

**1월 10일 시도한 해결책**:
```yaml
timeout-minutes: 240  # 4시간으로 증가
```

**실제 문제**: timeout이 아니라 **호출을 1번만 함**
**결과**: 여전히 42초에 종료 (timeout과 무관)

### 3. 변경사항 미커밋

**로컬에서 작업**:
- while loop 추가해서 20라운드까지 반복하도록 수정
- 테스트는 했지만 커밋/푸시 안 함

**GitHub Actions**:
- 여전히 이전 버전 실행
- 매일 같은 문제 반복

## 올바른 해결책

### Before (문제):
```bash
# 1번 호출하고 끝
curl /api/cron/youtube  # → 2000개 처리, completed: false
# 종료
```

### After (수정):
```bash
while [ "$COMPLETED" = "false" ] && [ $ROUND -le 20 ]; do
  curl /api/cron/youtube  # → 2000개 처리
  # completed: true? → 종료
  # completed: false? → 다시 호출
  ROUND=$((ROUND + 1))
done
```

## 배운 점

1. **API와 호출자의 contract 일치 필요**
   - API: `completed` 필드로 "계속/종료" 신호
   - 호출자: 이 신호를 읽고 적절히 반응해야 함

2. **Vercel 함수 제한 이해**
   - 5분 maxDuration → 한 번에 적은 양 처리
   - 여러 번 호출로 전체 작업 완료

3. **문제 진단 시 전체 흐름 확인**
   - timeout 증가 ≠ 해결책
   - 호출 횟수 확인이 필요했음

4. **변경사항은 즉시 커밋/푸시**
   - 로컬 수정이 프로덕션에 반영 안 됨
   - GitHub Actions는 저장소 코드 사용

## 영향

- **기간**: 2026-01-13 ~ 2026-01-17 (5일)
- **손실**: 매일 80만 PV 중 98% 업데이트 누락
- **복구**: 수동 실행으로 전체 업데이트 필요

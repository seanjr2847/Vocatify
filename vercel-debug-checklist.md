# Vercel 디버깅 체크리스트

## 1. Vercel 대시보드 (https://vercel.com/dashboard)
   - 프로젝트 선택 (vocatify-sigma)
   - 최근 배포 클릭
   
## 2. Build Logs 탭에서 확인
   ```
   ✅ 확인할 내용:
   - "Running 'npm install'" 로그
   - "prisma generate" 실행됐는지
   - "✔ Generated Prisma Client" 메시지
   - "Build successful" 메시지
   ```

## 3. Runtime Logs 탭에서 확인
   ```
   ⚠️ 에러 메시지 찾기:
   - "column ... does not exist"
   - "Property 'songs_enhanced' does not exist"
   - 다른 에러 메시지
   ```

## 4. 또는 CLI로 확인
   ```bash
   # 실시간 로그 보기
   npx vercel logs https://vocatify-sigma.vercel.app --follow
   
   # 최근 에러만 보기
   npx vercel logs https://vocatify-sigma.vercel.app --since 30m | grep -i error
   ```

## 5. 강제 재배포
   ```bash
   # Vercel에서 캐시 없이 재배포
   npx vercel --prod --force
   ```

## 6. 만약 "Property 'songs_enhanced' does not exist" 에러가 나온다면
   → Prisma Client가 재생성 안된 것
   → vercel.json에 빌드 명령 추가 필요

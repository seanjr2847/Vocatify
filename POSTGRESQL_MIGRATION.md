# PostgreSQL 마이그레이션 가이드

SQLite에서 PostgreSQL로 데이터베이스를 마이그레이션하는 단계별 가이드입니다.

## ✅ 완료된 작업

- [x] Prisma ORM 설치 완료
- [x] Prisma 스키마 생성 완료 (`prisma/schema.prisma`)
- [x] Prisma Client 생성 완료
- [x] Prisma Client 설정 파일 생성 (`lib/prisma.ts`)

## 📋 다음 단계

### 1. PostgreSQL 데이터베이스 설정

PostgreSQL 데이터베이스가 필요합니다. 다음 중 하나를 선택하세요:

#### 옵션 A: 로컬 PostgreSQL 설치
```bash
# Windows (Chocolatey)
choco install postgresql

# macOS (Homebrew)
brew install postgresql@15
brew services start postgresql@15

# 데이터베이스 생성
createdb vocatify
```

#### 옵션 B: Docker로 PostgreSQL 실행
```bash
# Docker Compose 사용
cat > docker-compose.yml << EOF
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: vocatify
      POSTGRES_PASSWORD: vocatify123
      POSTGRES_DB: vocatify
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
EOF

# 시작
docker-compose up -d
```

#### 옵션 C: 클라우드 PostgreSQL (무료 티어)
- **Neon**: https://neon.tech (무료 0.5GB)
- **Supabase**: https://supabase.com (무료 500MB)
- **Railway**: https://railway.app (무료 $5 크레딧)

### 2. 환경 변수 설정

`.env` 파일의 `DATABASE_URL`을 실제 PostgreSQL 연결 문자열로 수정:

```env
# 로컬 PostgreSQL
DATABASE_URL="postgresql://vocatify:vocatify123@localhost:5432/vocatify?schema=public"

# 또는 클라우드 PostgreSQL (예: Neon)
DATABASE_URL="postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/vocatify?sslmode=require"
```

### 3. 데이터베이스 스키마 생성

Prisma Migrate를 사용하여 PostgreSQL에 테이블 생성:

```bash
# 마이그레이션 생성 및 적용
npx prisma migrate dev --name init

# 또는 프로덕션 환경에서
npx prisma migrate deploy
```

이 명령은 다음을 수행합니다:
1. `songs` 테이블 생성
2. `daily_view_counts` 테이블 생성
3. 모든 인덱스 생성
4. 외래 키 제약조건 생성

### 4. 데이터 마이그레이션

SQLite에서 PostgreSQL로 데이터를 이동합니다.

#### 방법 A: 마이그레이션 스크립트 작성

`scripts/migrate-to-postgres.ts` 파일을 생성하여 데이터 이동:

```typescript
import Database from 'better-sqlite3';
import { prisma } from '../lib/prisma';

async function migrateData() {
  console.log('📦 SQLite 데이터 읽기 시작...');

  // SQLite 데이터베이스 연결
  const sqlite = new Database('data/vocadb/vocatify.db', { readonly: true });

  try {
    // Songs 마이그레이션
    console.log('🎵 Songs 테이블 마이그레이션...');
    const songs = sqlite.prepare('SELECT * FROM songs').all();

    for (const song of songs) {
      await prisma.song.create({
        data: {
          vocadbId: song.vocadbId,
          title: song.title,
          titleEnglish: song.titleEnglish,
          titleJapanese: song.titleJapanese,
          titleRomaji: song.titleRomaji,
          artist: song.artist,
          artistType: song.artistType,
          youtubeId: song.youtubeId,
          youtubeUrl: song.youtubeUrl,
          thumbUrl: song.thumbUrl,
          favoritedTimes: song.favoritedTimes || 0,
          ratingScore: song.ratingScore || 0,
          tags: song.tags,
          publishDate: song.publishDate,
          songType: song.songType,
          viewCount: song.viewCount,
          viewCountUpdatedAt: song.viewCountUpdatedAt,
          crawledAt: song.crawledAt,
        },
      });
    }

    console.log(`✅ ${songs.length}개 곡 마이그레이션 완료`);

    // Daily View Counts 마이그레이션
    console.log('📊 Daily View Counts 테이블 마이그레이션...');
    const dailyCounts = sqlite.prepare('SELECT * FROM daily_view_counts').all();

    for (const count of dailyCounts) {
      await prisma.dailyViewCount.create({
        data: {
          songId: count.song_id,
          recordedDate: new Date(count.recorded_date),
          totalViews: count.total_views,
        },
      });
    }

    console.log(`✅ ${dailyCounts.length}개 조회수 기록 마이그레이션 완료`);

  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
    throw error;
  } finally {
    sqlite.close();
    await prisma.$disconnect();
  }
}

migrateData();
```

실행:
```bash
npx tsx scripts/migrate-to-postgres.ts
```

#### 방법 B: CSV 내보내기/가져오기

```bash
# SQLite에서 CSV로 내보내기
sqlite3 data/vocadb/vocatify.db << EOF
.headers on
.mode csv
.output songs.csv
SELECT * FROM songs;
.output daily_view_counts.csv
SELECT * FROM daily_view_counts;
.quit
EOF

# PostgreSQL로 가져오기 (psql 사용)
psql $DATABASE_URL -c "\COPY songs FROM 'songs.csv' CSV HEADER"
psql $DATABASE_URL -c "\COPY daily_view_counts FROM 'daily_view_counts.csv' CSV HEADER"
```

### 5. 코드 변경

#### 기존 코드 (better-sqlite3)
```typescript
import { getDb } from '@/lib/db';

const db = getDb();
const songs = db.prepare('SELECT * FROM songs WHERE artistType = ?').all('Vocaloid');
```

#### 새 코드 (Prisma)
```typescript
import { prisma } from '@/lib/prisma';

const songs = await prisma.song.findMany({
  where: {
    artistType: 'Vocaloid',
  },
});
```

### 6. Prisma 주요 쿼리 패턴

#### 총 조회수 랭킹
```typescript
export async function getTotalRanking(limit: number = 100, offset: number = 0) {
  const songs = await prisma.song.findMany({
    where: {
      viewCount: { not: null },
      artistType: 'Vocaloid',
    },
    orderBy: {
      viewCount: 'desc',
    },
    take: limit,
    skip: offset,
  });

  return songs.map((song, index) => ({
    ...song,
    rank: offset + index + 1,
  }));
}
```

#### 일간 랭킹 (Window Function 필요)
```typescript
export async function getDailyRanking(limit: number = 100, offset: number = 0) {
  // Prisma는 아직 window functions를 직접 지원하지 않으므로 raw query 사용
  const result = await prisma.$queryRaw`
    WITH daily_increases AS (
      SELECT
        dvc.song_id,
        dvc.total_views - LAG(dvc.total_views) OVER (
          PARTITION BY dvc.song_id
          ORDER BY dvc.recorded_date
        ) as daily_increase,
        ROW_NUMBER() OVER (ORDER BY (
          dvc.total_views - LAG(dvc.total_views) OVER (
            PARTITION BY dvc.song_id
            ORDER BY dvc.recorded_date
          )
        ) DESC) as rank
      FROM daily_view_counts dvc
      WHERE dvc.recorded_date = CURRENT_DATE
    )
    SELECT s.*, di.rank, di.daily_increase
    FROM songs s
    JOIN daily_increases di ON s.vocadb_id = di.song_id
    WHERE s.artist_type = 'Vocaloid'
      AND di.daily_increase IS NOT NULL
    ORDER BY di.rank
    LIMIT ${limit} OFFSET ${offset}
  `;

  return result;
}
```

#### 관련 곡 조회
```typescript
export async function getRelatedSongsByArtist(
  artist: string,
  currentVocadbId: number,
  limit: number = 6
) {
  return await prisma.song.findMany({
    where: {
      artist,
      vocadbId: { not: currentVocadbId },
      viewCount: { not: null },
      artistType: 'Vocaloid',
    },
    orderBy: {
      viewCount: 'desc',
    },
    take: limit,
  });
}
```

## 🎯 마이그레이션 체크리스트

- [ ] PostgreSQL 데이터베이스 설정
- [ ] `.env`에 `DATABASE_URL` 설정
- [ ] `npx prisma migrate dev --name init` 실행
- [ ] 마이그레이션 스크립트 작성 및 실행
- [ ] 데이터 마이그레이션 검증
- [ ] `lib/db.ts` 함수들을 Prisma로 변환
- [ ] API 라우트 테스트
- [ ] 프론트엔드 테스트
- [ ] SQLite 백업 (선택사항)

## 📊 Prisma vs SQLite 비교

| 기능 | better-sqlite3 | Prisma |
|------|---------------|---------|
| 타입 안정성 | 수동 인터페이스 | 자동 생성 |
| 쿼리 작성 | Raw SQL | Type-safe API |
| 마이그레이션 | 수동 스크립트 | 자동 관리 |
| 개발 경험 | 보통 | 우수 (IntelliSense) |
| 성능 | 빠름 | 약간 느림 |
| 복잡한 쿼리 | 쉬움 | Raw SQL 필요 |
| 데이터베이스 | SQLite만 | PostgreSQL, MySQL 등 |

## ⚠️ 주의사항

1. **Window Functions**: Prisma는 window functions를 직접 지원하지 않으므로 `$queryRaw`를 사용해야 합니다.
2. **복잡한 쿼리**: 기존 SQLite 쿼리가 복잡한 경우 `$queryRaw`로 작성하는 것이 더 쉬울 수 있습니다.
3. **데이터베이스 백업**: 마이그레이션 전에 반드시 SQLite 데이터베이스를 백업하세요.
4. **점진적 마이그레이션**: 한 번에 모든 코드를 변경하지 말고 단계별로 진행하세요.

## 🔧 도움되는 Prisma 명령어

```bash
# 스키마 포맷
npx prisma format

# 데이터베이스 스키마와 동기화 (개발용)
npx prisma db push

# Prisma Studio (데이터베이스 GUI)
npx prisma studio

# 마이그레이션 상태 확인
npx prisma migrate status

# 마이그레이션 초기화 (주의!)
npx prisma migrate reset
```

## 📚 참고 자료

- [Prisma 공식 문서](https://www.prisma.io/docs)
- [PostgreSQL 마이그레이션 가이드](https://www.prisma.io/docs/guides/migrate-to-prisma)
- [Prisma Raw Queries](https://www.prisma.io/docs/concepts/components/prisma-client/raw-database-access)

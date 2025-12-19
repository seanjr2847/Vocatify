/**
 * YouTube 조회수 업데이트 스크립트
 * - 50개씩 배치로 YouTube Data API 호출
 * - SQLite DB 업데이트
 * - daily_view_counts 기록 생성
 * - 진행률 추적 및 재시작 가능
 */

import Database from 'better-sqlite3';
import path from 'path';
import { config } from 'dotenv';

// .env 파일 로드
config();

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
if (!YOUTUBE_API_KEY) {
  console.error('❌ YOUTUBE_API_KEY 환경변수가 필요합니다.');
  console.log('\n설정 방법:');
  console.log('  export YOUTUBE_API_KEY="your-api-key"');
  console.log('  또는 .env 파일에 추가\n');
  console.log('API 키 발급: https://console.cloud.google.com/apis/credentials\n');
  process.exit(1);
}

const BATCH_SIZE = 50; // YouTube API는 최대 50개 비디오 ID
const DELAY_MS = 100; // API 호출 간 딜레이 (rate limit 방지)
const mode = process.argv[2] || 'new'; // new, old, all, top

console.log('🎬 YouTube 조회수 수집 시작\n');
console.log(`모드: ${mode}`);
console.log(`  - new: viewCount가 NULL인 곡만`);
console.log(`  - old: 7일 이상 된 데이터 우선`);
console.log(`  - all: 전체 업데이트`);
console.log(`  - top: 인기곡 1000개만\n`);

// DB 연결
const dbPath = path.join(process.cwd(), 'data', 'vocadb', 'vocatify.db');
const db = new Database(dbPath);

// viewCount 컬럼 추가 (없으면)
try {
  db.exec(`
    ALTER TABLE songs ADD COLUMN viewCount INTEGER;
  `);
  console.log('✅ viewCount 컬럼 추가됨');
} catch (e: any) {
  if (!e.message.includes('duplicate column name')) {
    console.error('컬럼 추가 오류:', e.message);
  }
}

try {
  db.exec(`
    ALTER TABLE songs ADD COLUMN viewCountUpdatedAt TEXT;
  `);
  console.log('✅ viewCountUpdatedAt 컬럼 추가됨');
} catch (e: any) {
  if (!e.message.includes('duplicate column name')) {
    console.error('컬럼 추가 오류:', e.message);
  }
}

// 인덱스 생성
try {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_viewcount ON songs(viewCount DESC);
    CREATE INDEX IF NOT EXISTS idx_viewcount_updated ON songs(viewCountUpdatedAt);
  `);
  console.log('✅ 인덱스 생성 완료\n');
} catch (e: any) {
  console.error('인덱스 생성 오류:', e.message);
}

// 업데이트할 곡 가져오기
function getSongsToUpdate(limit?: number): Array<{youtubeId: string, vocadbId: number}> {
  let query = '';

  switch (mode) {
    case 'new':
      query = 'SELECT youtubeId, vocadbId FROM songs WHERE viewCount IS NULL ORDER BY vocadbId';
      break;
    case 'old':
      query = `
        SELECT youtubeId, vocadbId FROM songs
        WHERE viewCountUpdatedAt IS NULL
           OR datetime(viewCountUpdatedAt) < datetime('now', '-7 days')
        ORDER BY viewCountUpdatedAt ASC NULLS FIRST
      `;
      break;
    case 'top':
      query = `
        SELECT youtubeId, vocadbId FROM songs
        ORDER BY favoritedTimes DESC, ratingScore DESC
        LIMIT ${limit || 1000}
      `;
      break;
    case 'all':
    default:
      query = 'SELECT youtubeId, vocadbId FROM songs ORDER BY vocadbId';
  }

  if (limit && mode !== 'top') {
    query += ` LIMIT ${limit}`;
  }

  return db.prepare(query).all() as Array<{youtubeId: string, vocadbId: number}>;
}

// YouTube API 호출
async function fetchViewCounts(videoIds: string[]): Promise<Map<string, number>> {
  const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds.join(',')}&key=${YOUTUBE_API_KEY}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`YouTube API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const viewCounts = new Map<string, number>();

    for (const item of data.items || []) {
      const videoId = item.id;
      const viewCount = parseInt(item.statistics?.viewCount || '0');
      viewCounts.set(videoId, viewCount);
    }

    return viewCounts;
  } catch (error: any) {
    console.error('❌ API 호출 실패:', error.message);
    return new Map();
  }
}

// DB 업데이트
function updateViewCounts(viewCounts: Map<string, number>) {
  const stmt = db.prepare(`
    UPDATE songs
    SET viewCount = ?, viewCountUpdatedAt = datetime('now')
    WHERE youtubeId = ?
  `);

  const updateMany = db.transaction((counts: Map<string, number>) => {
    for (const [videoId, viewCount] of counts) {
      stmt.run(viewCount, videoId);
    }
  });

  updateMany(viewCounts);
}

// daily_view_counts 기록 생성
function createDailyRecords(date: string): number {
  // daily_view_counts 테이블 존재 확인
  const tableExists = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='daily_view_counts'
  `).get();

  if (!tableExists) {
    console.log('⚠️  daily_view_counts 테이블이 없습니다. 건너뜁니다.');
    return 0;
  }

  // 오늘 데이터가 이미 있는지 확인
  const existing = db.prepare(`
    SELECT COUNT(*) as count FROM daily_view_counts WHERE recordDate = ?
  `).get(date) as {count: number};

  if (existing.count > 0) {
    console.log(`⚠️  ${date} 데이터가 이미 ${existing.count.toLocaleString()}개 있습니다. 건너뜁니다.`);
    return 0;
  }

  // 어제 데이터 가져오기 (증가량 계산용)
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // daily_view_counts 생성
  const result = db.prepare(`
    INSERT INTO daily_view_counts (vocadbId, youtubeId, viewCount, dailyIncrease, recordDate)
    SELECT
      s.vocadbId,
      s.youtubeId,
      s.viewCount,
      COALESCE(s.viewCount - prev.viewCount, 0) AS dailyIncrease,
      ? AS recordDate
    FROM songs s
    LEFT JOIN daily_view_counts prev ON prev.youtubeId = s.youtubeId
      AND prev.recordDate = ?
    WHERE s.viewCount IS NOT NULL
  `).run(date, yesterdayStr);

  return result.changes;
}

// 진행률 표시
function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 메인 실행
async function main() {
  const startTime = Date.now();

  // 전체 통계
  const totalSongs = db.prepare('SELECT COUNT(*) as count FROM songs').get() as {count: number};
  const songsWithViews = db.prepare('SELECT COUNT(*) as count FROM songs WHERE viewCount IS NOT NULL').get() as {count: number};

  console.log(`📊 현재 상태:`);
  console.log(`  전체 곡: ${totalSongs.count.toLocaleString()}곡`);
  console.log(`  조회수 있음: ${songsWithViews.count.toLocaleString()}곡 (${((songsWithViews.count / totalSongs.count) * 100).toFixed(1)}%)`);
  console.log(`  조회수 없음: ${(totalSongs.count - songsWithViews.count).toLocaleString()}곡\n`);

  // 업데이트할 곡 가져오기
  const songs = getSongsToUpdate();

  if (songs.length === 0) {
    console.log('✅ 업데이트할 곡이 없습니다!\n');
    return;
  }

  console.log(`🎯 업데이트 대상: ${songs.length.toLocaleString()}곡\n`);

  // 배치 처리
  const batches = Math.ceil(songs.length / BATCH_SIZE);
  let processed = 0;
  let updated = 0;
  let apiCalls = 0;

  for (let i = 0; i < batches; i++) {
    const start = i * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, songs.length);
    const batch = songs.slice(start, end);
    const videoIds = batch.map(s => s.youtubeId);

    // API 호출
    const viewCounts = await fetchViewCounts(videoIds);
    apiCalls++;

    // DB 업데이트
    if (viewCounts.size > 0) {
      updateViewCounts(viewCounts);
      updated += viewCounts.size;
    }

    processed += batch.length;

    // 진행률 표시
    const percent = ((processed / songs.length) * 100).toFixed(1);
    const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    const remaining = songs.length - processed;
    const eta = remaining > 0 ? ((Date.now() - startTime) / processed * remaining / 1000 / 60).toFixed(1) : 0;

    console.log(`📊 배치 ${i + 1}/${batches}: ${processed.toLocaleString()}/${songs.length.toLocaleString()}곡 (${percent}%) | ${elapsed}분 경과 | ETA: ${eta}분`);

    // Rate limiting
    if (i < batches - 1) {
      await delay(DELAY_MS);
    }
  }

  // 최종 통계
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000 / 60).toFixed(1);

  const finalStats = db.prepare('SELECT COUNT(*) as count FROM songs WHERE viewCount IS NOT NULL').get() as {count: number};

  console.log(`\n✅ 완료!`);
  console.log(`\n📊 최종 통계:`);
  console.log(`  처리된 곡: ${processed.toLocaleString()}곡`);
  console.log(`  업데이트된 곡: ${updated.toLocaleString()}곡`);
  console.log(`  API 호출: ${apiCalls.toLocaleString()}회`);
  console.log(`  소요 시간: ${duration}분`);
  console.log(`  조회수 데이터: ${finalStats.count.toLocaleString()}곡 (${((finalStats.count / totalSongs.count) * 100).toFixed(1)}%)\n`);

  // daily_view_counts 기록 생성
  if (updated > 0) {
    console.log(`📅 일별 조회수 기록 생성 중...`);
    const today = new Date().toISOString().split('T')[0];
    const dailyRecords = createDailyRecords(today);
    if (dailyRecords > 0) {
      console.log(`✅ ${dailyRecords.toLocaleString()}개 일별 기록 생성 완료 (${today})\n`);
    }
  }

  // TOP 10 조회수
  const top10 = db.prepare(`
    SELECT title, artist, viewCount, youtubeUrl
    FROM songs
    WHERE viewCount IS NOT NULL
    ORDER BY viewCount DESC
    LIMIT 10
  `).all();

  if (top10.length > 0) {
    console.log(`🏆 조회수 TOP 10:`);
    top10.forEach((song: any, idx) => {
      console.log(`${idx + 1}. ${song.title}`);
      console.log(`   ${song.artist}`);
      console.log(`   조회수: ${song.viewCount.toLocaleString()}회`);
      console.log(`   ${song.youtubeUrl}\n`);
    });
  }
}

// 실행
main()
  .then(() => {
    db.close();
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 오류:', error);
    db.close();
    process.exit(1);
  });

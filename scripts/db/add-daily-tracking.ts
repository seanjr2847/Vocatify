/**
 * daily_view_counts 테이블 추가
 * - 일별 조회수 추이 추적
 * - ERD v2.0 기준
 */

import Database from 'better-sqlite3';
import path from 'path';

console.log('📊 daily_view_counts 테이블 생성 시작\n');

const dbPath = path.join(process.cwd(), 'data', 'vocadb', 'vocatify.db');
const db = new Database(dbPath);

try {
  // songs 테이블에 viewCount 컬럼 추가 (없으면)
  try {
    db.exec(`ALTER TABLE songs ADD COLUMN viewCount INTEGER;`);
    console.log('✅ songs.viewCount 컬럼 추가');
  } catch (e: any) {
    if (!e.message.includes('duplicate column name')) {
      throw e;
    }
  }

  try {
    db.exec(`ALTER TABLE songs ADD COLUMN viewCountUpdatedAt TEXT;`);
    console.log('✅ songs.viewCountUpdatedAt 컬럼 추가');
  } catch (e: any) {
    if (!e.message.includes('duplicate column name')) {
      throw e;
    }
  }

  // 기존 테이블 삭제 (외래 키 문제 해결)
  db.exec(`DROP TABLE IF EXISTS daily_view_counts;`);

  // daily_view_counts 테이블 생성 (외래 키 제약 없이)
  db.exec(`
    CREATE TABLE daily_view_counts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vocadbId INTEGER NOT NULL,
      youtubeId TEXT NOT NULL,
      viewCount INTEGER NOT NULL,
      dailyIncrease INTEGER DEFAULT 0,
      recordDate TEXT NOT NULL,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('✅ daily_view_counts 테이블 생성 완료');

  // 인덱스 생성
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_youtube_date
      ON daily_view_counts(youtubeId, recordDate);
    CREATE INDEX IF NOT EXISTS idx_daily_vocadb
      ON daily_view_counts(vocadbId);
    CREATE INDEX IF NOT EXISTS idx_daily_date
      ON daily_view_counts(recordDate DESC);
    CREATE INDEX IF NOT EXISTS idx_daily_increase
      ON daily_view_counts(dailyIncrease DESC);
    CREATE INDEX IF NOT EXISTS idx_daily_date_increase
      ON daily_view_counts(recordDate, dailyIncrease DESC);
  `);
  console.log('✅ 인덱스 생성 완료');

  // 현재 상태 확인
  const songCount = db.prepare('SELECT COUNT(*) as count FROM songs').get() as {count: number};
  const songsWithViews = db.prepare('SELECT COUNT(*) as count FROM songs WHERE viewCount IS NOT NULL').get() as {count: number};

  console.log(`\n📊 현재 데이터 상태:`);
  console.log(`  전체 곡: ${songCount.count.toLocaleString()}곡`);
  console.log(`  조회수 있음: ${songsWithViews.count.toLocaleString()}곡`);

  // 초기 데이터 마이그레이션 여부 확인
  if (songsWithViews.count > 0) {
    console.log(`\n💡 초기 데이터를 마이그레이션하시겠습니까?`);
    console.log(`   현재 조회수를 오늘 날짜로 기록합니다.`);
    console.log(`\n   실행: npm run db:seed-daily\n`);
  } else {
    console.log(`\n💡 YouTube 조회수를 먼저 수집하세요:`);
    console.log(`   npm run youtube:new\n`);
  }

  console.log('✅ 완료!\n');

} catch (error: any) {
  console.error('❌ 오류:', error.message);
  process.exit(1);
} finally {
  db.close();
}

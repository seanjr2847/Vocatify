/**
 * 초기 daily_view_counts 데이터 생성
 * - 현재 songs.viewCount를 오늘 날짜로 기록
 */

import Database from 'better-sqlite3';
import path from 'path';

console.log('🌱 초기 daily_view_counts 데이터 생성 시작\n');

const dbPath = path.join(process.cwd(), 'data', 'vocadb', 'vocatify.db');
const db = new Database(dbPath);

try {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // 오늘 날짜로 이미 데이터가 있는지 확인
  const existing = db.prepare(`
    SELECT COUNT(*) as count FROM daily_view_counts WHERE recordDate = ?
  `).get(today) as {count: number};

  if (existing.count > 0) {
    console.log(`⚠️  오늘(${today}) 데이터가 이미 ${existing.count.toLocaleString()}개 있습니다.`);
    console.log(`   덮어쓰려면 먼저 삭제하세요:\n`);
    console.log(`   DELETE FROM daily_view_counts WHERE recordDate = '${today}';\n`);
    process.exit(0);
  }

  // 초기 데이터 삽입
  const result = db.prepare(`
    INSERT INTO daily_view_counts (vocadbId, youtubeId, viewCount, dailyIncrease, recordDate)
    SELECT
      vocadbId,
      youtubeId,
      viewCount,
      0 AS dailyIncrease,
      ? AS recordDate
    FROM songs
    WHERE viewCount IS NOT NULL
  `).run(today);

  console.log(`✅ ${result.changes.toLocaleString()}개 레코드 생성 완료`);
  console.log(`   날짜: ${today}`);
  console.log(`   dailyIncrease: 0 (첫 날이므로 증가량 없음)\n`);

  // 통계
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(viewCount) as totalViews,
      AVG(viewCount) as avgViews,
      MAX(viewCount) as maxViews
    FROM daily_view_counts
    WHERE recordDate = ?
  `).get(today) as any;

  console.log(`📊 통계:`);
  console.log(`   총 레코드: ${stats.total.toLocaleString()}개`);
  console.log(`   총 조회수: ${stats.totalViews.toLocaleString()}회`);
  console.log(`   평균 조회수: ${Math.round(stats.avgViews).toLocaleString()}회`);
  console.log(`   최고 조회수: ${stats.maxViews.toLocaleString()}회\n`);

  // TOP 5
  const top5 = db.prepare(`
    SELECT
      s.title,
      s.artist,
      d.viewCount
    FROM daily_view_counts d
    JOIN songs s ON d.youtubeId = s.youtubeId
    WHERE d.recordDate = ?
    ORDER BY d.viewCount DESC
    LIMIT 5
  `).all(today);

  console.log(`🏆 조회수 TOP 5:`);
  top5.forEach((song: any, idx) => {
    console.log(`${idx + 1}. ${song.title}`);
    console.log(`   ${song.artist}`);
    console.log(`   ${song.viewCount.toLocaleString()}회\n`);
  });

  console.log(`✅ 완료! 내일부터 dailyIncrease가 계산됩니다.\n`);

} catch (error: any) {
  console.error('❌ 오류:', error.message);
  process.exit(1);
} finally {
  db.close();
}

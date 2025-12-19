/**
 * daily_view_counts 테이블 구조 변경 마이그레이션
 *
 * 변경 사항:
 * - 복합 기본 키 (song_id, recorded_date) 사용
 * - dailyIncrease 제거 (쿼리 시 계산)
 * - 불필요한 컬럼 제거 (id, youtubeId, createdAt)
 */

import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'vocadb', 'vocatify.db');
const db = new Database(dbPath);

console.log('🔄 daily_view_counts 테이블 마이그레이션 시작...\n');

try {
  // 트랜잭션 시작
  db.exec('BEGIN TRANSACTION');

  // 1. 새로운 테이블 생성
  console.log('1️⃣ 새로운 테이블 생성 중...');
  db.exec(`
    CREATE TABLE daily_view_counts_new (
      song_id INTEGER NOT NULL,
      recorded_date DATE NOT NULL,
      total_views INTEGER NOT NULL,
      PRIMARY KEY (song_id, recorded_date),
      FOREIGN KEY (song_id) REFERENCES songs(vocadbId)
    )
  `);
  console.log('✅ 새 테이블 생성 완료\n');

  // 2. 기존 데이터 마이그레이션
  console.log('2️⃣ 기존 데이터 마이그레이션 중...');
  const oldCount = db.prepare('SELECT COUNT(*) as count FROM daily_view_counts').get() as { count: number };
  console.log(`   기존 레코드 수: ${oldCount.count.toLocaleString()}`);

  db.exec(`
    INSERT INTO daily_view_counts_new (song_id, recorded_date, total_views)
    SELECT vocadbId, recordDate, viewCount
    FROM daily_view_counts
  `);

  const newCount = db.prepare('SELECT COUNT(*) as count FROM daily_view_counts_new').get() as { count: number };
  console.log(`   마이그레이션된 레코드 수: ${newCount.count.toLocaleString()}`);
  console.log('✅ 데이터 마이그레이션 완료\n');

  // 3. 기존 테이블 삭제
  console.log('3️⃣ 기존 테이블 삭제 중...');
  db.exec('DROP TABLE daily_view_counts');
  console.log('✅ 기존 테이블 삭제 완료\n');

  // 4. 새 테이블 이름 변경
  console.log('4️⃣ 새 테이블 이름 변경 중...');
  db.exec('ALTER TABLE daily_view_counts_new RENAME TO daily_view_counts');
  console.log('✅ 테이블 이름 변경 완료\n');

  // 5. 인덱스 생성 (쿼리 성능 최적화)
  console.log('5️⃣ 인덱스 생성 중...');
  db.exec(`
    CREATE INDEX idx_daily_view_counts_date
    ON daily_view_counts(recorded_date);
  `);
  db.exec(`
    CREATE INDEX idx_daily_view_counts_song
    ON daily_view_counts(song_id);
  `);
  console.log('✅ 인덱스 생성 완료\n');

  // 트랜잭션 커밋
  db.exec('COMMIT');

  // 6. 결과 확인
  console.log('📊 마이그레이션 결과:');
  const finalSchema = db.prepare(`
    SELECT sql FROM sqlite_master
    WHERE type = 'table' AND name = 'daily_view_counts'
  `).get() as { sql: string };
  console.log('\n새 테이블 스키마:');
  console.log(finalSchema.sql);

  const sampleData = db.prepare(`
    SELECT * FROM daily_view_counts
    ORDER BY recorded_date DESC, total_views DESC
    LIMIT 5
  `).all();
  console.log('\n샘플 데이터:');
  console.table(sampleData);

  console.log('\n✅ 마이그레이션 완료!');

} catch (error) {
  // 에러 발생 시 롤백
  db.exec('ROLLBACK');
  console.error('\n❌ 마이그레이션 실패:', error);
  process.exit(1);
} finally {
  db.close();
}

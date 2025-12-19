/**
 * SQLite 데이터베이스 라이브러리
 * - 싱글톤 패턴으로 DB 연결 관리
 * - 타입 안전한 쿼리 인터페이스 제공
 */

import Database from 'better-sqlite3';
import path from 'path';

export interface Song {
  vocadbId: number;
  title: string;
  titleEnglish?: string;
  titleJapanese?: string;
  titleRomaji?: string;
  artist: string;
  artistType?: string;
  youtubeId: string;
  youtubeUrl: string;
  thumbUrl?: string;
  favoritedTimes: number;
  ratingScore: number;
  tags?: string;
  publishDate?: string;
  songType?: string;
  viewCount?: number;
  viewCountUpdatedAt?: string;
  crawledAt: string;
}

export interface DailyViewCount {
  id: number;
  vocadbId: number;
  recordDate: string;
  viewCount: number;
  dailyIncrease: number;
  createdAt: string;
}

export interface RankingItem extends Song {
  rank: number;
  dailyIncrease?: number;
  weeklyIncrease?: number;
}

let db: Database.Database | null = null;

/**
 * DB 인스턴스 가져오기 (싱글톤)
 */
export function getDb(): Database.Database {
  if (!db) {
    const dbPath = path.join(process.cwd(), 'data', 'vocadb', 'vocatify.db');
    db = new Database(dbPath, { readonly: false });

    // WAL 모드 활성화 (동시성 향상)
    db.pragma('journal_mode = WAL');
  }

  return db;
}

/**
 * DB 연결 종료
 */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * 총 조회수 기준 랭킹 조회
 */
export function getTotalRanking(limit: number = 100, offset: number = 0): RankingItem[] {
  const db = getDb();

  const query = `
    SELECT
      ROW_NUMBER() OVER (ORDER BY viewCount DESC) as rank,
      *
    FROM songs
    WHERE viewCount IS NOT NULL
      AND artistType = 'Vocaloid'
    ORDER BY viewCount DESC
    LIMIT ? OFFSET ?
  `;

  const stmt = db.prepare(query);
  return stmt.all(limit, offset) as RankingItem[];
}

/**
 * 일간 증가량 기준 랭킹 조회
 */
export function getDailyRanking(limit: number = 100, offset: number = 0): RankingItem[] {
  const db = getDb();

  const query = `
    SELECT
      ROW_NUMBER() OVER (ORDER BY dvc.dailyIncrease DESC) as rank,
      s.*,
      dvc.dailyIncrease
    FROM songs s
    INNER JOIN daily_view_counts dvc ON s.vocadbId = dvc.vocadbId
    WHERE dvc.recordDate = date('now', 'localtime')
      AND dvc.dailyIncrease > 0
      AND s.artistType = 'Vocaloid'
    ORDER BY dvc.dailyIncrease DESC
    LIMIT ? OFFSET ?
  `;

  const stmt = db.prepare(query);
  return stmt.all(limit, offset) as RankingItem[];
}

/**
 * 주간 증가량 기준 랭킹 조회
 */
export function getWeeklyRanking(limit: number = 100, offset: number = 0): RankingItem[] {
  const db = getDb();

  const query = `
    SELECT
      ROW_NUMBER() OVER (ORDER BY weeklyIncrease DESC) as rank,
      s.*,
      weeklyIncrease
    FROM (
      SELECT
        vocadbId,
        SUM(dailyIncrease) as weeklyIncrease
      FROM daily_view_counts
      WHERE recordDate >= date('now', '-7 days', 'localtime')
      GROUP BY vocadbId
      HAVING weeklyIncrease > 0
    ) weekly
    INNER JOIN songs s ON s.vocadbId = weekly.vocadbId
    ORDER BY weeklyIncrease DESC
    LIMIT ? OFFSET ?
  `;

  const stmt = db.prepare(query);
  return stmt.all(limit, offset) as RankingItem[];
}

/**
 * 신곡 랭킹 조회 (30일 이내)
 */
export function getNewSongsRanking(limit: number = 100, offset: number = 0): RankingItem[] {
  const db = getDb();

  const query = `
    SELECT
      ROW_NUMBER() OVER (ORDER BY viewCount DESC) as rank,
      *
    FROM songs
    WHERE publishDate >= date('now', '-30 days', 'localtime')
      AND viewCount IS NOT NULL
      AND viewCount <= 5000000
    ORDER BY viewCount DESC
    LIMIT ? OFFSET ?
  `;

  const stmt = db.prepare(query);
  return stmt.all(limit, offset) as RankingItem[];
}

/**
 * 곡 검색
 */
export function searchSongs(
  query: string,
  limit: number = 20,
  offset: number = 0
): Song[] {
  const db = getDb();

  const searchQuery = `
    SELECT *
    FROM songs
    WHERE title LIKE ?
       OR titleEnglish LIKE ?
       OR titleJapanese LIKE ?
       OR artist LIKE ?
    ORDER BY viewCount DESC NULLS LAST
    LIMIT ? OFFSET ?
  `;

  const searchPattern = `%${query}%`;
  const stmt = db.prepare(searchQuery);
  return stmt.all(
    searchPattern,
    searchPattern,
    searchPattern,
    searchPattern,
    limit,
    offset
  ) as Song[];
}

/**
 * 특정 곡 상세 정보 조회
 */
export function getSongById(vocadbId: number): Song | null {
  const db = getDb();

  const query = `
    SELECT *
    FROM songs
    WHERE vocadbId = ?
  `;

  const stmt = db.prepare(query);
  return (stmt.get(vocadbId) as Song) || null;
}

/**
 * 곡의 일별 조회수 기록 조회
 */
export function getDailyViewCounts(
  vocadbId: number,
  days: number = 30
): DailyViewCount[] {
  const db = getDb();

  const query = `
    SELECT *
    FROM daily_view_counts
    WHERE vocadbId = ?
      AND recordDate >= date('now', '-${days} days', 'localtime')
    ORDER BY recordDate ASC
  `;

  const stmt = db.prepare(query);
  return stmt.all(vocadbId) as DailyViewCount[];
}

/**
 * 전체 통계 조회
 */
export function getStats(): {
  totalSongs: number;
  songsWithViews: number;
  totalViews: number;
  lastUpdate: string | null;
} {
  const db = getDb();

  const query = `
    SELECT
      COUNT(*) as totalSongs,
      COUNT(viewCount) as songsWithViews,
      SUM(viewCount) as totalViews,
      MAX(viewCountUpdatedAt) as lastUpdate
    FROM songs
  `;

  const stmt = db.prepare(query);
  return stmt.get() as {
    totalSongs: number;
    songsWithViews: number;
    totalViews: number;
    lastUpdate: string | null;
  };
}

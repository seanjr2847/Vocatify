/**
 * SQLite 데이터베이스 라이브러리 (새로운 daily_view_counts 구조용)
 * - 복합 기본 키 (song_id, recorded_date)
 * - Window function으로 증가량 계산
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
  song_id: number;
  recorded_date: string;
  total_views: number;
}

export interface RankingItem extends Song {
  rank: number;
  dailyIncrease?: number;
  weeklyIncrease?: number;
}

export interface RankingPositions {
  total: number | null;
  daily: number | null;
  weekly: number | null;
}

export interface SongStatistics {
  dailyAverage: number;
  weeklyAverage: number;
  monthlyAverage: number;
  totalDays: number;
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
 * 총 조회수 기준 랭킹 조회 (보컬로이드만)
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
 * 일간 증가량 기준 랭킹 조회 (보컬로이드만)
 * Window function으로 전날 대비 증가량 계산
 */
export function getDailyRanking(limit: number = 100, offset: number = 0): RankingItem[] {
  const db = getDb();

  const query = `
    WITH daily_changes AS (
      SELECT
        song_id,
        recorded_date,
        total_views,
        total_views - LAG(total_views) OVER (
          PARTITION BY song_id
          ORDER BY recorded_date
        ) as daily_increase
      FROM daily_view_counts
      WHERE recorded_date >= date('now', '-2 days', 'localtime')
    ),
    today_changes AS (
      SELECT
        song_id,
        daily_increase
      FROM daily_changes
      WHERE recorded_date = date('now', 'localtime')
        AND daily_increase > 0
    )
    SELECT
      ROW_NUMBER() OVER (ORDER BY tc.daily_increase DESC) as rank,
      s.*,
      tc.daily_increase as dailyIncrease
    FROM today_changes tc
    INNER JOIN songs s ON s.vocadbId = tc.song_id
    WHERE s.artistType = 'Vocaloid'
    ORDER BY tc.daily_increase DESC
    LIMIT ? OFFSET ?
  `;

  const stmt = db.prepare(query);
  return stmt.all(limit, offset) as RankingItem[];
}

/**
 * 주간 증가량 기준 랭킹 조회 (보컬로이드만)
 * 최근 7일간 증가량 합계 계산
 */
export function getWeeklyRanking(limit: number = 100, offset: number = 0): RankingItem[] {
  const db = getDb();

  const query = `
    WITH weekly_data AS (
      SELECT
        song_id,
        recorded_date,
        total_views
      FROM daily_view_counts
      WHERE recorded_date >= date('now', '-8 days', 'localtime')
    ),
    weekly_changes AS (
      SELECT
        song_id,
        MAX(CASE WHEN recorded_date = date('now', 'localtime') THEN total_views END) as latest_views,
        MAX(CASE WHEN recorded_date = date('now', '-7 days', 'localtime') THEN total_views END) as week_ago_views
      FROM weekly_data
      GROUP BY song_id
    ),
    weekly_increases AS (
      SELECT
        song_id,
        latest_views - COALESCE(week_ago_views, 0) as weekly_increase
      FROM weekly_changes
      WHERE latest_views IS NOT NULL
        AND (latest_views - COALESCE(week_ago_views, 0)) > 0
    )
    SELECT
      ROW_NUMBER() OVER (ORDER BY wi.weekly_increase DESC) as rank,
      s.*,
      wi.weekly_increase as weeklyIncrease
    FROM weekly_increases wi
    INNER JOIN songs s ON s.vocadbId = wi.song_id
    WHERE s.artistType = 'Vocaloid'
    ORDER BY wi.weekly_increase DESC
    LIMIT ? OFFSET ?
  `;

  const stmt = db.prepare(query);
  return stmt.all(limit, offset) as RankingItem[];
}

/**
 * 신곡 랭킹 조회 (30일 이내, 500만 조회수 이하, 보컬로이드만)
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
      AND artistType = 'Vocaloid'
    ORDER BY viewCount DESC
    LIMIT ? OFFSET ?
  `;

  const stmt = db.prepare(query);
  return stmt.all(limit, offset) as RankingItem[];
}

/**
 * 곡 검색 (보컬로이드만)
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
    WHERE (title LIKE ?
       OR titleEnglish LIKE ?
       OR titleJapanese LIKE ?
       OR artist LIKE ?)
      AND artistType = 'Vocaloid'
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
    WHERE song_id = ?
      AND recorded_date >= date('now', '-' || ? || ' days', 'localtime')
    ORDER BY recorded_date ASC
  `;

  const stmt = db.prepare(query);
  return stmt.all(vocadbId, days) as DailyViewCount[];
}

/**
 * 전체 통계 조회 (보컬로이드만)
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
    WHERE artistType = 'Vocaloid'
  `;

  const stmt = db.prepare(query);
  return stmt.get() as {
    totalSongs: number;
    songsWithViews: number;
    totalViews: number;
    lastUpdate: string | null;
  };
}

/**
 * 곡의 랭킹 위치 조회 (전체/일간/주간)
 */
export function getSongRankPositions(vocadbId: number): RankingPositions {
  const db = getDb();

  // 총 조회수 랭킹 위치
  const totalQuery = `
    WITH ranked AS (
      SELECT
        vocadbId,
        ROW_NUMBER() OVER (ORDER BY viewCount DESC) as position
      FROM songs
      WHERE viewCount IS NOT NULL
        AND artistType = 'Vocaloid'
    )
    SELECT position FROM ranked WHERE vocadbId = ?
  `;

  // 일간 증가량 랭킹 위치
  const dailyQuery = `
    WITH daily_changes AS (
      SELECT
        song_id,
        recorded_date,
        total_views,
        total_views - LAG(total_views) OVER (
          PARTITION BY song_id
          ORDER BY recorded_date
        ) as daily_increase
      FROM daily_view_counts
      WHERE recorded_date >= date('now', '-2 days', 'localtime')
    ),
    today_changes AS (
      SELECT
        song_id,
        daily_increase
      FROM daily_changes
      WHERE recorded_date = date('now', 'localtime')
        AND daily_increase > 0
    ),
    ranked AS (
      SELECT
        song_id,
        ROW_NUMBER() OVER (ORDER BY daily_increase DESC) as position
      FROM today_changes
    )
    SELECT position FROM ranked WHERE song_id = ?
  `;

  // 주간 증가량 랭킹 위치
  const weeklyQuery = `
    WITH weekly_data AS (
      SELECT
        song_id,
        recorded_date,
        total_views
      FROM daily_view_counts
      WHERE recorded_date >= date('now', '-8 days', 'localtime')
    ),
    weekly_changes AS (
      SELECT
        song_id,
        MAX(CASE WHEN recorded_date = date('now', 'localtime') THEN total_views END) as latest_views,
        MAX(CASE WHEN recorded_date = date('now', '-7 days', 'localtime') THEN total_views END) as week_ago_views
      FROM weekly_data
      GROUP BY song_id
    ),
    weekly_increases AS (
      SELECT
        song_id,
        latest_views - COALESCE(week_ago_views, 0) as weekly_increase
      FROM weekly_changes
      WHERE latest_views IS NOT NULL
        AND (latest_views - COALESCE(week_ago_views, 0)) > 0
    ),
    ranked AS (
      SELECT
        song_id,
        ROW_NUMBER() OVER (ORDER BY weekly_increase DESC) as position
      FROM weekly_increases
    )
    SELECT position FROM ranked WHERE song_id = ?
  `;

  const totalStmt = db.prepare(totalQuery);
  const dailyStmt = db.prepare(dailyQuery);
  const weeklyStmt = db.prepare(weeklyQuery);

  const totalResult = totalStmt.get(vocadbId) as { position: number } | undefined;
  const dailyResult = dailyStmt.get(vocadbId) as { position: number } | undefined;
  const weeklyResult = weeklyStmt.get(vocadbId) as { position: number } | undefined;

  return {
    total: totalResult?.position ?? null,
    daily: dailyResult?.position ?? null,
    weekly: weeklyResult?.position ?? null,
  };
}

/**
 * 같은 아티스트의 다른 인기곡 조회
 */
export function getRelatedSongsByArtist(
  artist: string,
  currentVocadbId: number,
  limit: number = 6
): Song[] {
  const db = getDb();

  const query = `
    SELECT *
    FROM songs
    WHERE artist = ?
      AND vocadbId != ?
      AND viewCount IS NOT NULL
      AND artistType = 'Vocaloid'
    ORDER BY viewCount DESC
    LIMIT ?
  `;

  const stmt = db.prepare(query);
  return stmt.all(artist, currentVocadbId, limit) as Song[];
}

/**
 * 곡의 통계 정보 조회 (일/주/월 평균 증가량)
 */
export function getSongStatistics(vocadbId: number): SongStatistics | null {
  const db = getDb();

  // 일별 증가량 계산 및 통계
  const query = `
    WITH daily_increases AS (
      SELECT
        recorded_date,
        total_views,
        total_views - LAG(total_views) OVER (ORDER BY recorded_date) as daily_increase,
        strftime('%Y-%W', recorded_date) as week,
        strftime('%Y-%m', recorded_date) as month
      FROM daily_view_counts
      WHERE song_id = ?
      ORDER BY recorded_date
    ),
    daily_stats AS (
      SELECT
        AVG(CASE WHEN recorded_date >= date('now', '-30 days', 'localtime') AND daily_increase > 0 THEN daily_increase END) as daily_avg,
        COUNT(DISTINCT CASE WHEN recorded_date >= date('now', '-30 days', 'localtime') THEN recorded_date END) as total_days
      FROM daily_increases
    ),
    weekly_stats AS (
      SELECT
        AVG(weekly_increase) as weekly_avg
      FROM (
        SELECT
          week,
          MAX(total_views) - MIN(total_views) as weekly_increase
        FROM daily_increases
        WHERE recorded_date >= date('now', '-84 days', 'localtime')
        GROUP BY week
        HAVING weekly_increase > 0
      )
    ),
    monthly_stats AS (
      SELECT
        AVG(monthly_increase) as monthly_avg
      FROM (
        SELECT
          month,
          MAX(total_views) - MIN(total_views) as monthly_increase
        FROM daily_increases
        WHERE recorded_date >= date('now', '-180 days', 'localtime')
        GROUP BY month
        HAVING monthly_increase > 0
      )
    )
    SELECT
      COALESCE(d.daily_avg, 0) as dailyAverage,
      COALESCE(w.weekly_avg, 0) as weeklyAverage,
      COALESCE(m.monthly_avg, 0) as monthlyAverage,
      COALESCE(d.total_days, 0) as totalDays
    FROM daily_stats d
    CROSS JOIN weekly_stats w
    CROSS JOIN monthly_stats m
  `;

  const stmt = db.prepare(query);
  const result = stmt.get(vocadbId) as SongStatistics | undefined;

  // 데이터가 충분하지 않으면 null 반환 (최소 7일 필요)
  if (!result || result.totalDays < 7) {
    return null;
  }

  return result;
}

/**
 * PostgreSQL 데이터베이스 라이브러리 v2 (새 스키마)
 * - 관계형 테이블 구조: Song, SongName, Artist, SongArtist, PV, Tag, SongTag
 * - PV 테이블 기반 조회수 추적
 */

import { prisma } from './prisma';

// ============================================================
// Interfaces
// ============================================================

export interface RankingSong {
  vocadbId: number;
  defaultName: string;
  titleKorean: string | null;
  titleEnglish: string | null;
  titleJapanese: string | null;
  titleRomaji: string | null;
  artistString: string;
  youtubeId: string | null;
  youtubeUrl: string | null;
  thumbUrl: string | null;
  viewCount: bigint | null;
  viewCountUpdatedAt: Date | null;
  publishDate: Date | null;
  songType: string | null;
  favoritedTimes: number;
  ratingScore: number;
}

// Alias for backward compatibility
export type Song = RankingSong;

export interface RankingItem extends RankingSong {
  rank: number;
  dailyIncrease?: bigint;
  weeklyIncrease?: bigint;
}

export interface SongDetail {
  vocadbId: number;
  defaultName: string;
  songType: string | null;
  publishDate: Date | null;
  createDate: Date | null;
  lengthSeconds: number | null;
  favoritedTimes: number;
  ratingScore: number;
  thumbUrl: string | null;
  crawledAt: Date;
  names: { language: string; value: string }[];
  artists: {
    id: number;
    name: string;
    artistType: string;
    categories: string;
    roles: string | null;
    isSupport: boolean;
  }[];
  pvs: {
    id: number;
    pvId: string;
    service: string;
    pvType: string;
    name: string | null;
    url: string;
    viewCount: bigint | null;
    viewCountUpdatedAt: Date | null;
  }[];
  tags: { id: number; name: string; categoryName: string | null; count: number }[];
  lyrics: { id: number; translationType: string; cultureCode: string | null; url: string | null }[];
}

export interface RankingPositions {
  total: number | null;
  daily: number | null;
  weekly: number | null;
}

export interface DailyViewCount {
  pvId: number;
  recordedDate: Date;
  totalViews: bigint;
}

export interface SearchSong extends RankingSong {
  matchedField?: 'title' | 'titleEnglish' | 'titleJapanese' | 'titleKorean' | 'titleRomaji' | 'artist';
  relevanceScore?: number;
}

export type SortBy = 'viewCount' | 'publishDate' | 'title' | 'artist' | 'relevance';

export interface SongStatistics {
  viewsToday: bigint | null;
  viewsYesterday: bigint | null;
  viewsThisWeek: bigint | null;
  viewsLastWeek: bigint | null;
  avgDailyViews: bigint | null;
  peakDailyIncrease: bigint | null;
  peakDate: Date | null;
}

// ============================================================
// Excluded Tags Check (for raw SQL)
// ============================================================

const EXCLUDED_TAG_NAMES = ['human singers', 'out of scope (cover unifier)'];

// ============================================================
// Ranking Functions
// ============================================================

/**
 * 총 조회수 기준 랭킹 조회
 * - PV 테이블에서 YouTube 조회수 합산
 * - 제외 태그가 있는 곡 필터링
 */
export async function getTotalRanking(limit: number = 100, offset: number = 0): Promise<RankingItem[]> {
  const songs = await prisma.$queryRaw<any[]>`
    WITH song_views AS (
      SELECT
        p.song_id,
        SUM(p.view_count) as total_view_count,
        MAX(p.view_count_updated_at) as last_updated
      FROM pvs p
      WHERE p.service = 'Youtube' AND p.view_count IS NOT NULL
      GROUP BY p.song_id
    ),
    excluded_songs AS (
      SELECT DISTINCT st.song_id
      FROM song_tags st
      JOIN tags t ON st.tag_id = t.vocadb_id
      WHERE LOWER(t.name) IN ('human singers', 'out of scope (cover unifier)')
    )
    SELECT
      ROW_NUMBER() OVER (ORDER BY sv.total_view_count DESC) as rank,
      s.vocadb_id as "vocadbId",
      s.default_name as "defaultName",
      (SELECT value FROM song_names WHERE song_id = s.vocadb_id AND language = 'Korean' LIMIT 1) as "titleKorean",
      (SELECT value FROM song_names WHERE song_id = s.vocadb_id AND language = 'English' LIMIT 1) as "titleEnglish",
      (SELECT value FROM song_names WHERE song_id = s.vocadb_id AND language = 'Japanese' LIMIT 1) as "titleJapanese",
      (SELECT value FROM song_names WHERE song_id = s.vocadb_id AND language = 'Romaji' LIMIT 1) as "titleRomaji",
      (
        SELECT STRING_AGG(a.name, ', ' ORDER BY sa.id)
        FROM song_artists sa
        JOIN artists a ON sa.artist_id = a.vocadb_id
        WHERE sa.song_id = s.vocadb_id AND sa.is_support = false
      ) as "artistString",
      (SELECT pv_id FROM pvs WHERE song_id = s.vocadb_id AND service = 'Youtube' LIMIT 1) as "youtubeId",
      (SELECT url FROM pvs WHERE song_id = s.vocadb_id AND service = 'Youtube' LIMIT 1) as "youtubeUrl",
      s.thumb_url as "thumbUrl",
      sv.total_view_count as "viewCount",
      sv.last_updated as "viewCountUpdatedAt",
      s.publish_date as "publishDate",
      s.song_type as "songType",
      s.favorited_times as "favoritedTimes",
      s.rating_score as "ratingScore"
    FROM songs s
    JOIN song_views sv ON s.vocadb_id = sv.song_id
    WHERE s.vocadb_id NOT IN (SELECT song_id FROM excluded_songs)
    ORDER BY sv.total_view_count DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  return songs.map((song, idx) => ({
    ...song,
    rank: offset + idx + 1,
  }));
}

/**
 * 일간 증가량 기준 랭킹 조회
 */
export async function getDailyRanking(limit: number = 100, offset: number = 0): Promise<RankingItem[]> {
  const songs = await prisma.$queryRaw<any[]>`
    WITH daily_changes AS (
      SELECT
        pv.song_id,
        dvc.pv_id,
        dvc.recorded_date,
        dvc.total_views,
        dvc.total_views - LAG(dvc.total_views) OVER (
          PARTITION BY dvc.pv_id
          ORDER BY dvc.recorded_date
        ) as daily_increase
      FROM daily_view_counts dvc
      JOIN pvs pv ON dvc.pv_id = pv.id
      WHERE dvc.recorded_date >= CURRENT_DATE - INTERVAL '2 days'
        AND pv.service = 'Youtube'
    ),
    today_changes AS (
      SELECT
        song_id,
        SUM(daily_increase) as daily_increase
      FROM daily_changes
      WHERE recorded_date = CURRENT_DATE
        AND daily_increase > 0
      GROUP BY song_id
    ),
    excluded_songs AS (
      SELECT DISTINCT st.song_id
      FROM song_tags st
      JOIN tags t ON st.tag_id = t.vocadb_id
      WHERE LOWER(t.name) IN ('human singers', 'out of scope (cover unifier)')
    ),
    song_views AS (
      SELECT song_id, SUM(view_count) as total_view_count
      FROM pvs WHERE service = 'Youtube' AND view_count IS NOT NULL
      GROUP BY song_id
    )
    SELECT
      ROW_NUMBER() OVER (ORDER BY tc.daily_increase DESC) as rank,
      s.vocadb_id as "vocadbId",
      s.default_name as "defaultName",
      (SELECT value FROM song_names WHERE song_id = s.vocadb_id AND language = 'Korean' LIMIT 1) as "titleKorean",
      (SELECT value FROM song_names WHERE song_id = s.vocadb_id AND language = 'English' LIMIT 1) as "titleEnglish",
      (SELECT value FROM song_names WHERE song_id = s.vocadb_id AND language = 'Japanese' LIMIT 1) as "titleJapanese",
      (SELECT value FROM song_names WHERE song_id = s.vocadb_id AND language = 'Romaji' LIMIT 1) as "titleRomaji",
      (
        SELECT STRING_AGG(a.name, ', ' ORDER BY sa.id)
        FROM song_artists sa
        JOIN artists a ON sa.artist_id = a.vocadb_id
        WHERE sa.song_id = s.vocadb_id AND sa.is_support = false
      ) as "artistString",
      (SELECT pv_id FROM pvs WHERE song_id = s.vocadb_id AND service = 'Youtube' LIMIT 1) as "youtubeId",
      (SELECT url FROM pvs WHERE song_id = s.vocadb_id AND service = 'Youtube' LIMIT 1) as "youtubeUrl",
      s.thumb_url as "thumbUrl",
      sv.total_view_count as "viewCount",
      s.publish_date as "publishDate",
      s.song_type as "songType",
      s.favorited_times as "favoritedTimes",
      s.rating_score as "ratingScore",
      tc.daily_increase as "dailyIncrease"
    FROM today_changes tc
    JOIN songs s ON s.vocadb_id = tc.song_id
    LEFT JOIN song_views sv ON s.vocadb_id = sv.song_id
    WHERE tc.song_id NOT IN (SELECT song_id FROM excluded_songs)
    ORDER BY tc.daily_increase DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  return songs;
}

/**
 * 주간 증가량 기준 랭킹 조회
 */
export async function getWeeklyRanking(limit: number = 100, offset: number = 0): Promise<RankingItem[]> {
  const songs = await prisma.$queryRaw<any[]>`
    WITH weekly_data AS (
      SELECT
        pv.song_id,
        dvc.pv_id,
        dvc.recorded_date,
        dvc.total_views
      FROM daily_view_counts dvc
      JOIN pvs pv ON dvc.pv_id = pv.id
      WHERE dvc.recorded_date >= CURRENT_DATE - INTERVAL '8 days'
        AND pv.service = 'Youtube'
    ),
    weekly_changes AS (
      SELECT
        song_id,
        SUM(CASE WHEN recorded_date = CURRENT_DATE THEN total_views ELSE 0 END) as latest_views,
        SUM(CASE WHEN recorded_date = CURRENT_DATE - INTERVAL '7 days' THEN total_views ELSE 0 END) as week_ago_views
      FROM weekly_data
      GROUP BY song_id
    ),
    weekly_increases AS (
      SELECT
        song_id,
        latest_views - week_ago_views as weekly_increase
      FROM weekly_changes
      WHERE latest_views > 0
        AND (latest_views - week_ago_views) > 0
    ),
    excluded_songs AS (
      SELECT DISTINCT st.song_id
      FROM song_tags st
      JOIN tags t ON st.tag_id = t.vocadb_id
      WHERE LOWER(t.name) IN ('human singers', 'out of scope (cover unifier)')
    ),
    song_views AS (
      SELECT song_id, SUM(view_count) as total_view_count
      FROM pvs WHERE service = 'Youtube' AND view_count IS NOT NULL
      GROUP BY song_id
    )
    SELECT
      ROW_NUMBER() OVER (ORDER BY wi.weekly_increase DESC) as rank,
      s.vocadb_id as "vocadbId",
      s.default_name as "defaultName",
      (SELECT value FROM song_names WHERE song_id = s.vocadb_id AND language = 'Korean' LIMIT 1) as "titleKorean",
      (SELECT value FROM song_names WHERE song_id = s.vocadb_id AND language = 'English' LIMIT 1) as "titleEnglish",
      (SELECT value FROM song_names WHERE song_id = s.vocadb_id AND language = 'Japanese' LIMIT 1) as "titleJapanese",
      (SELECT value FROM song_names WHERE song_id = s.vocadb_id AND language = 'Romaji' LIMIT 1) as "titleRomaji",
      (
        SELECT STRING_AGG(a.name, ', ' ORDER BY sa.id)
        FROM song_artists sa
        JOIN artists a ON sa.artist_id = a.vocadb_id
        WHERE sa.song_id = s.vocadb_id AND sa.is_support = false
      ) as "artistString",
      (SELECT pv_id FROM pvs WHERE song_id = s.vocadb_id AND service = 'Youtube' LIMIT 1) as "youtubeId",
      (SELECT url FROM pvs WHERE song_id = s.vocadb_id AND service = 'Youtube' LIMIT 1) as "youtubeUrl",
      s.thumb_url as "thumbUrl",
      sv.total_view_count as "viewCount",
      s.publish_date as "publishDate",
      s.song_type as "songType",
      s.favorited_times as "favoritedTimes",
      s.rating_score as "ratingScore",
      wi.weekly_increase as "weeklyIncrease"
    FROM weekly_increases wi
    JOIN songs s ON s.vocadb_id = wi.song_id
    LEFT JOIN song_views sv ON s.vocadb_id = sv.song_id
    WHERE wi.song_id NOT IN (SELECT song_id FROM excluded_songs)
    ORDER BY wi.weekly_increase DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  return songs;
}

/**
 * 신곡 랭킹 조회 (발매일 최신순)
 */
export async function getNewSongsRanking(limit: number = 100, offset: number = 0): Promise<RankingItem[]> {
  const songs = await prisma.$queryRaw<any[]>`
    WITH excluded_songs AS (
      SELECT DISTINCT st.song_id
      FROM song_tags st
      JOIN tags t ON st.tag_id = t.vocadb_id
      WHERE LOWER(t.name) IN ('human singers', 'out of scope (cover unifier)')
    ),
    song_views AS (
      SELECT song_id, SUM(view_count) as total_view_count, MAX(view_count_updated_at) as last_updated
      FROM pvs WHERE service = 'Youtube' AND view_count IS NOT NULL
      GROUP BY song_id
    )
    SELECT
      ROW_NUMBER() OVER (ORDER BY s.publish_date DESC) as rank,
      s.vocadb_id as "vocadbId",
      s.default_name as "defaultName",
      (SELECT value FROM song_names WHERE song_id = s.vocadb_id AND language = 'Korean' LIMIT 1) as "titleKorean",
      (SELECT value FROM song_names WHERE song_id = s.vocadb_id AND language = 'English' LIMIT 1) as "titleEnglish",
      (SELECT value FROM song_names WHERE song_id = s.vocadb_id AND language = 'Japanese' LIMIT 1) as "titleJapanese",
      (SELECT value FROM song_names WHERE song_id = s.vocadb_id AND language = 'Romaji' LIMIT 1) as "titleRomaji",
      (
        SELECT STRING_AGG(a.name, ', ' ORDER BY sa.id)
        FROM song_artists sa
        JOIN artists a ON sa.artist_id = a.vocadb_id
        WHERE sa.song_id = s.vocadb_id AND sa.is_support = false
      ) as "artistString",
      (SELECT pv_id FROM pvs WHERE song_id = s.vocadb_id AND service = 'Youtube' LIMIT 1) as "youtubeId",
      (SELECT url FROM pvs WHERE song_id = s.vocadb_id AND service = 'Youtube' LIMIT 1) as "youtubeUrl",
      s.thumb_url as "thumbUrl",
      sv.total_view_count as "viewCount",
      sv.last_updated as "viewCountUpdatedAt",
      s.publish_date as "publishDate",
      s.song_type as "songType",
      s.favorited_times as "favoritedTimes",
      s.rating_score as "ratingScore"
    FROM songs s
    LEFT JOIN song_views sv ON s.vocadb_id = sv.song_id
    WHERE s.publish_date IS NOT NULL
      AND s.vocadb_id NOT IN (SELECT song_id FROM excluded_songs)
    ORDER BY s.publish_date DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  return songs.map((song, idx) => ({
    ...song,
    rank: offset + idx + 1,
  }));
}

// ============================================================
// Song Detail Functions
// ============================================================

/**
 * 특정 곡 상세 정보 조회 (모든 관련 데이터 포함)
 */
export async function getSongById(vocadbId: number): Promise<SongDetail | null> {
  const song = await prisma.song.findUnique({
    where: { vocadbId },
    include: {
      names: true,
      artists: {
        include: { artist: true },
        orderBy: { id: 'asc' },
      },
      pvs: {
        orderBy: [{ service: 'asc' }, { id: 'asc' }],
      },
      tags: {
        include: { tag: true },
        orderBy: { count: 'desc' },
      },
      lyrics: true,
    },
  });

  if (!song) return null;

  return {
    vocadbId: song.vocadbId,
    defaultName: song.defaultName,
    songType: song.songType,
    publishDate: song.publishDate,
    createDate: song.createDate,
    lengthSeconds: song.lengthSeconds,
    favoritedTimes: song.favoritedTimes,
    ratingScore: song.ratingScore,
    thumbUrl: song.thumbUrl,
    crawledAt: song.crawledAt,
    names: song.names.map(n => ({ language: n.language, value: n.value })),
    artists: song.artists.map(sa => ({
      id: sa.artist.vocadbId,
      name: sa.artist.name,
      artistType: sa.artist.artistType,
      categories: sa.categories,
      roles: sa.roles,
      isSupport: sa.isSupport,
    })),
    pvs: song.pvs.map(pv => ({
      id: pv.id,
      pvId: pv.pvId,
      service: pv.service,
      pvType: pv.pvType,
      name: pv.name,
      url: pv.url,
      viewCount: pv.viewCount,
      viewCountUpdatedAt: pv.viewCountUpdatedAt,
    })),
    tags: song.tags.map(st => ({
      id: st.tag.vocadbId,
      name: st.tag.name,
      categoryName: st.tag.categoryName,
      count: st.count,
    })),
    lyrics: song.lyrics.map(l => ({
      id: l.id,
      translationType: l.translationType,
      cultureCode: l.cultureCode,
      url: l.url,
    })),
  };
}

/**
 * 곡의 일별 조회수 기록 조회 (YouTube PV 기준)
 */
export async function getDailyViewCounts(
  vocadbId: number,
  days: number = 30
): Promise<{ date: Date; views: bigint }[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const results = await prisma.$queryRaw<{ date: Date; views: bigint }[]>`
    SELECT
      dvc.recorded_date as date,
      SUM(dvc.total_views) as views
    FROM daily_view_counts dvc
    JOIN pvs p ON dvc.pv_id = p.id
    WHERE p.song_id = ${vocadbId}
      AND p.service = 'Youtube'
      AND dvc.recorded_date >= ${startDate}
    GROUP BY dvc.recorded_date
    ORDER BY dvc.recorded_date ASC
  `;

  return results;
}

// ============================================================
// Statistics Functions
// ============================================================

/**
 * 전체 통계 조회
 */
export async function getStats(): Promise<{
  totalSongs: number;
  songsWithViews: number;
  totalViews: bigint;
  lastUpdate: Date | null;
}> {
  const [songCount, viewStats] = await Promise.all([
    prisma.song.count(),
    prisma.$queryRaw<[{ songs_with_views: bigint; total_views: bigint; last_update: Date | null }]>`
      SELECT
        COUNT(DISTINCT song_id) as songs_with_views,
        COALESCE(SUM(view_count), 0) as total_views,
        MAX(view_count_updated_at) as last_update
      FROM pvs
      WHERE service = 'Youtube' AND view_count IS NOT NULL
    `,
  ]);

  return {
    totalSongs: songCount,
    songsWithViews: Number(viewStats[0].songs_with_views),
    totalViews: viewStats[0].total_views,
    lastUpdate: viewStats[0].last_update,
  };
}

/**
 * 곡의 랭킹 위치 조회 (전체/일간/주간)
 */
export async function getSongRankPositions(vocadbId: number): Promise<RankingPositions> {
  // 총 조회수 랭킹 위치
  const totalRank = await prisma.$queryRaw<{ position: bigint }[]>`
    WITH song_views AS (
      SELECT song_id, SUM(view_count) as total_view_count
      FROM pvs WHERE service = 'Youtube' AND view_count IS NOT NULL
      GROUP BY song_id
    ),
    excluded_songs AS (
      SELECT DISTINCT st.song_id
      FROM song_tags st
      JOIN tags t ON st.tag_id = t.vocadb_id
      WHERE LOWER(t.name) IN ('human singers', 'out of scope (cover unifier)')
    ),
    ranked AS (
      SELECT
        song_id,
        ROW_NUMBER() OVER (ORDER BY total_view_count DESC) as position
      FROM song_views
      WHERE song_id NOT IN (SELECT song_id FROM excluded_songs)
    )
    SELECT position FROM ranked WHERE song_id = ${vocadbId}
  `;

  // 일간/주간 랭킹은 데이터가 없을 수 있으므로 간단하게 null 반환
  // (실제 구현은 위의 getDailyRanking/getWeeklyRanking과 유사)

  return {
    total: totalRank[0] ? Number(totalRank[0].position) : null,
    daily: null, // TODO: Implement when daily data exists
    weekly: null, // TODO: Implement when weekly data exists
  };
}

// ============================================================
// Search Functions
// ============================================================

export interface SearchResult {
  songs: SearchSong[];
  total: number;
}

/**
 * 곡 검색 (모든 언어 제목 + 아티스트)
 * @param query 검색어
 * @param limit 결과 제한
 * @param offset 시작 위치
 * @param sortBy 정렬 기준 (viewCount, publishDate, title, artist, relevance)
 * @param artistType Vocaloid 필터 ('Vocaloid' 또는 null로 모든 아티스트)
 */
export async function searchSongs(
  query: string,
  limit: number = 20,
  offset: number = 0,
  sortBy: SortBy = 'viewCount',
  artistType: string | null = 'Vocaloid'
): Promise<SearchResult> {
  const searchTerm = `%${query}%`;

  // Build ORDER BY clause based on sortBy
  const orderClause = (() => {
    switch (sortBy) {
      case 'publishDate':
        return 'ORDER BY s.publish_date DESC NULLS LAST';
      case 'title':
        return 'ORDER BY s.default_name ASC';
      case 'artist':
        return 'ORDER BY artist_string ASC NULLS LAST';
      case 'relevance':
        // Relevance: exact match > starts with > contains
        return `ORDER BY
          CASE
            WHEN s.default_name ILIKE ${query} THEN 1
            WHEN s.default_name ILIKE ${query + '%'} THEN 2
            ELSE 3
          END,
          COALESCE(sv.total_view_count, 0) DESC`;
      case 'viewCount':
      default:
        return 'ORDER BY COALESCE(sv.total_view_count, 0) DESC';
    }
  })();

  const songs = await prisma.$queryRaw<any[]>`
    WITH matching_songs AS (
      SELECT DISTINCT s.vocadb_id
      FROM songs s
      LEFT JOIN song_names sn ON s.vocadb_id = sn.song_id
      LEFT JOIN song_artists sa ON s.vocadb_id = sa.song_id
      LEFT JOIN artists a ON sa.artist_id = a.vocadb_id
      WHERE (s.default_name ILIKE ${searchTerm}
         OR sn.value ILIKE ${searchTerm}
         OR a.name ILIKE ${searchTerm})
        ${artistType ? `AND EXISTS (
          SELECT 1 FROM song_artists sa2
          JOIN artists a2 ON sa2.artist_id = a2.vocadb_id
          WHERE sa2.song_id = s.vocadb_id
            AND a2.artist_type = ${artistType}
        )` : ''}
    ),
    song_views AS (
      SELECT song_id, SUM(view_count) as total_view_count, MAX(view_count_updated_at) as last_updated
      FROM pvs WHERE service = 'Youtube' AND view_count IS NOT NULL
      GROUP BY song_id
    )
    SELECT
      s.vocadb_id as "vocadbId",
      s.default_name as "defaultName",
      (SELECT value FROM song_names WHERE song_id = s.vocadb_id AND language = 'Korean' LIMIT 1) as "titleKorean",
      (SELECT value FROM song_names WHERE song_id = s.vocadb_id AND language = 'English' LIMIT 1) as "titleEnglish",
      (SELECT value FROM song_names WHERE song_id = s.vocadb_id AND language = 'Japanese' LIMIT 1) as "titleJapanese",
      (SELECT value FROM song_names WHERE song_id = s.vocadb_id AND language = 'Romaji' LIMIT 1) as "titleRomaji",
      (
        SELECT STRING_AGG(a.name, ', ' ORDER BY sa.id)
        FROM song_artists sa
        JOIN artists a ON sa.artist_id = a.vocadb_id
        WHERE sa.song_id = s.vocadb_id AND sa.is_support = false
      ) as "artistString",
      (SELECT pv_id FROM pvs WHERE song_id = s.vocadb_id AND service = 'Youtube' LIMIT 1) as "youtubeId",
      (SELECT url FROM pvs WHERE song_id = s.vocadb_id AND service = 'Youtube' LIMIT 1) as "youtubeUrl",
      s.thumb_url as "thumbUrl",
      sv.total_view_count as "viewCount",
      sv.last_updated as "viewCountUpdatedAt",
      s.publish_date as "publishDate",
      s.song_type as "songType",
      s.favorited_times as "favoritedTimes",
      s.rating_score as "ratingScore"
    FROM songs s
    JOIN matching_songs ms ON s.vocadb_id = ms.vocadb_id
    LEFT JOIN song_views sv ON s.vocadb_id = sv.song_id
    ORDER BY COALESCE(sv.total_view_count, 0) DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(DISTINCT s.vocadb_id) as count
    FROM songs s
    LEFT JOIN song_names sn ON s.vocadb_id = sn.song_id
    LEFT JOIN song_artists sa ON s.vocadb_id = sa.song_id
    LEFT JOIN artists a ON sa.artist_id = a.vocadb_id
    WHERE (s.default_name ILIKE ${searchTerm}
       OR sn.value ILIKE ${searchTerm}
       OR a.name ILIKE ${searchTerm})
      ${artistType ? `AND EXISTS (
        SELECT 1 FROM song_artists sa2
        JOIN artists a2 ON sa2.artist_id = a2.vocadb_id
        WHERE sa2.song_id = s.vocadb_id
          AND a2.artist_type = ${artistType}
      )` : ''}
  `;

  return {
    songs,
    total: Number(countResult[0].count),
  };
}

// ============================================================
// Related Songs
// ============================================================

/**
 * 같은 아티스트의 다른 인기곡 조회
 */
export async function getRelatedSongsByArtist(
  artistId: number,
  currentVocadbId: number,
  limit: number = 6
): Promise<RankingSong[]> {
  const songs = await prisma.$queryRaw<any[]>`
    WITH artist_songs AS (
      SELECT DISTINCT sa.song_id
      FROM song_artists sa
      WHERE sa.artist_id = ${artistId}
        AND sa.song_id != ${currentVocadbId}
    ),
    song_views AS (
      SELECT song_id, SUM(view_count) as total_view_count
      FROM pvs WHERE service = 'Youtube' AND view_count IS NOT NULL
      GROUP BY song_id
    )
    SELECT
      s.vocadb_id as "vocadbId",
      s.default_name as "defaultName",
      (SELECT value FROM song_names WHERE song_id = s.vocadb_id AND language = 'Korean' LIMIT 1) as "titleKorean",
      (SELECT value FROM song_names WHERE song_id = s.vocadb_id AND language = 'English' LIMIT 1) as "titleEnglish",
      (SELECT value FROM song_names WHERE song_id = s.vocadb_id AND language = 'Japanese' LIMIT 1) as "titleJapanese",
      (SELECT value FROM song_names WHERE song_id = s.vocadb_id AND language = 'Romaji' LIMIT 1) as "titleRomaji",
      (
        SELECT STRING_AGG(a.name, ', ' ORDER BY sa.id)
        FROM song_artists sa
        JOIN artists a ON sa.artist_id = a.vocadb_id
        WHERE sa.song_id = s.vocadb_id AND sa.is_support = false
      ) as "artistString",
      (SELECT pv_id FROM pvs WHERE song_id = s.vocadb_id AND service = 'Youtube' LIMIT 1) as "youtubeId",
      (SELECT url FROM pvs WHERE song_id = s.vocadb_id AND service = 'Youtube' LIMIT 1) as "youtubeUrl",
      s.thumb_url as "thumbUrl",
      sv.total_view_count as "viewCount",
      s.publish_date as "publishDate",
      s.song_type as "songType",
      s.favorited_times as "favoritedTimes",
      s.rating_score as "ratingScore"
    FROM songs s
    JOIN artist_songs asng ON s.vocadb_id = asng.song_id
    LEFT JOIN song_views sv ON s.vocadb_id = sv.song_id
    ORDER BY COALESCE(sv.total_view_count, 0) DESC
    LIMIT ${limit}
  `;

  return songs;
}

// ============================================================
// Song Statistics
// ============================================================

/**
 * 곡의 통계 정보 조회 (오늘/어제/이번주/지난주 조회수 증가량 등)
 */
export async function getSongStatistics(vocadbId: number): Promise<SongStatistics | null> {
  try {
    const result = await prisma.$queryRaw<any[]>`
      WITH pv_ids AS (
        SELECT id FROM pvs WHERE song_id = ${vocadbId} AND service = 'Youtube'
      ),
      daily_data AS (
        SELECT
          dvc.recorded_date,
          SUM(dvc.total_views) as total_views
        FROM daily_view_counts dvc
        WHERE dvc.pv_id IN (SELECT id FROM pv_ids)
          AND dvc.recorded_date >= CURRENT_DATE - INTERVAL '14 days'
        GROUP BY dvc.recorded_date
        ORDER BY dvc.recorded_date DESC
      ),
      daily_increases AS (
        SELECT
          recorded_date,
          total_views,
          total_views - LAG(total_views) OVER (ORDER BY recorded_date) as daily_increase
        FROM daily_data
      )
      SELECT
        (SELECT total_views FROM daily_data WHERE recorded_date = CURRENT_DATE) as "viewsToday",
        (SELECT total_views FROM daily_data WHERE recorded_date = CURRENT_DATE - INTERVAL '1 day') as "viewsYesterday",
        (SELECT SUM(daily_increase) FROM daily_increases WHERE recorded_date > CURRENT_DATE - INTERVAL '7 days') as "viewsThisWeek",
        (SELECT SUM(daily_increase) FROM daily_increases WHERE recorded_date <= CURRENT_DATE - INTERVAL '7 days' AND recorded_date > CURRENT_DATE - INTERVAL '14 days') as "viewsLastWeek",
        (SELECT AVG(daily_increase) FROM daily_increases WHERE daily_increase > 0) as "avgDailyViews",
        (SELECT MAX(daily_increase) FROM daily_increases) as "peakDailyIncrease",
        (SELECT recorded_date FROM daily_increases WHERE daily_increase = (SELECT MAX(daily_increase) FROM daily_increases) LIMIT 1) as "peakDate"
    `;

    if (result.length === 0) return null;

    return {
      viewsToday: result[0].viewsToday,
      viewsYesterday: result[0].viewsYesterday,
      viewsThisWeek: result[0].viewsThisWeek,
      viewsLastWeek: result[0].viewsLastWeek,
      avgDailyViews: result[0].avgDailyViews,
      peakDailyIncrease: result[0].peakDailyIncrease,
      peakDate: result[0].peakDate,
    };
  } catch (error) {
    console.error('Error fetching song statistics:', error);
    return null;
  }
}

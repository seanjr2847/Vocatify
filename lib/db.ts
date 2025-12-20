/**
 * PostgreSQL 데이터베이스 라이브러리 (Prisma 사용)
 * - daily_view_counts 테이블 활용
 * - Prisma를 통한 타입 안전 쿼리
 */

import { prisma } from './prisma';

export interface Song {
  vocadbId: number;
  title: string;
  titleEnglish?: string | null;
  titleJapanese?: string | null;
  titleRomaji?: string | null;
  titleKorean?: string | null;
  titleOriginal?: string | null;
  artist: string;
  artistType?: string | null;
  youtubeId: string;
  youtubeUrl: string;
  thumbUrl?: string | null;
  favoritedTimes: number;
  ratingScore: number;
  tags?: string | null;
  publishDate?: Date | null;
  songType?: string | null;
  viewCount?: bigint | null;
  viewCountUpdatedAt?: Date | null;
  crawledAt: Date;
  defaultLanguage?: string | null;
}

export interface DailyViewCount {
  songId: number;
  recordedDate: Date;
  totalViews: bigint;
}

export interface RankingItem extends Song {
  rank: number;
  dailyIncrease?: bigint;
  weeklyIncrease?: bigint;
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

/**
 * 총 조회수 기준 랭킹 조회 (보컬로이드만)
 */
export async function getTotalRanking(limit: number = 100, offset: number = 0): Promise<RankingItem[]> {
  const songs = await prisma.$queryRaw<RankingItem[]>`
    SELECT
      ROW_NUMBER() OVER (ORDER BY view_count DESC) as rank,
      vocadb_id as "vocadbId",
      title,
      title_english as "titleEnglish",
      title_japanese as "titleJapanese",
      title_romaji as "titleRomaji",
      title_korean as "titleKorean",
      title_original as "titleOriginal",
      artist,
      artist_type as "artistType",
      youtube_id as "youtubeId",
      youtube_url as "youtubeUrl",
      thumb_url as "thumbUrl",
      favorited_times as "favoritedTimes",
      rating_score as "ratingScore",
      tags,
      publish_date as "publishDate",
      song_type as "songType",
      view_count as "viewCount",
      view_count_updated_at as "viewCountUpdatedAt",
      crawled_at as "crawledAt",
      default_language as "defaultLanguage"
    FROM songs
    WHERE view_count IS NOT NULL
      AND artist_type = 'Vocaloid'
    ORDER BY view_count DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  return songs.map((song, idx) => ({
    ...song,
    rank: offset + idx + 1,
  }));
}

/**
 * 일간 증가량 기준 랭킹 조회 (보컬로이드만)
 */
export async function getDailyRanking(limit: number = 100, offset: number = 0): Promise<RankingItem[]> {
  const songs = await prisma.$queryRaw<any[]>`
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
      WHERE recorded_date >= CURRENT_DATE - INTERVAL '2 days'
    ),
    today_changes AS (
      SELECT
        song_id,
        daily_increase
      FROM daily_changes
      WHERE recorded_date = CURRENT_DATE
        AND daily_increase > 0
    )
    SELECT
      ROW_NUMBER() OVER (ORDER BY tc.daily_increase DESC) as rank,
      s.vocadb_id as "vocadbId",
      s.title,
      s.title_english as "titleEnglish",
      s.title_japanese as "titleJapanese",
      s.title_romaji as "titleRomaji",
      s.title_korean as "titleKorean",
      s.title_original as "titleOriginal",
      s.artist,
      s.artist_type as "artistType",
      s.youtube_id as "youtubeId",
      s.youtube_url as "youtubeUrl",
      s.thumb_url as "thumbUrl",
      s.favorited_times as "favoritedTimes",
      s.rating_score as "ratingScore",
      s.tags,
      s.publish_date as "publishDate",
      s.song_type as "songType",
      s.view_count as "viewCount",
      s.view_count_updated_at as "viewCountUpdatedAt",
      s.crawled_at as "crawledAt",
      s.default_language as "defaultLanguage",
      tc.daily_increase as "dailyIncrease"
    FROM today_changes tc
    INNER JOIN songs s ON s.vocadb_id = tc.song_id
    WHERE s.artist_type = 'Vocaloid'
    ORDER BY tc.daily_increase DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  return songs;
}

/**
 * 주간 증가량 기준 랭킹 조회 (보컬로이드만)
 */
export async function getWeeklyRanking(limit: number = 100, offset: number = 0): Promise<RankingItem[]> {
  const songs = await prisma.$queryRaw<any[]>`
    WITH weekly_data AS (
      SELECT
        song_id,
        recorded_date,
        total_views
      FROM daily_view_counts
      WHERE recorded_date >= CURRENT_DATE - INTERVAL '8 days'
    ),
    weekly_changes AS (
      SELECT
        song_id,
        MAX(CASE WHEN recorded_date = CURRENT_DATE THEN total_views END) as latest_views,
        MAX(CASE WHEN recorded_date = CURRENT_DATE - INTERVAL '7 days' THEN total_views END) as week_ago_views
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
      s.vocadb_id as "vocadbId",
      s.title,
      s.title_english as "titleEnglish",
      s.title_japanese as "titleJapanese",
      s.title_romaji as "titleRomaji",
      s.title_korean as "titleKorean",
      s.title_original as "titleOriginal",
      s.artist,
      s.artist_type as "artistType",
      s.youtube_id as "youtubeId",
      s.youtube_url as "youtubeUrl",
      s.thumb_url as "thumbUrl",
      s.favorited_times as "favoritedTimes",
      s.rating_score as "ratingScore",
      s.tags,
      s.publish_date as "publishDate",
      s.song_type as "songType",
      s.view_count as "viewCount",
      s.view_count_updated_at as "viewCountUpdatedAt",
      s.crawled_at as "crawledAt",
      s.default_language as "defaultLanguage",
      wi.weekly_increase as "weeklyIncrease"
    FROM weekly_increases wi
    INNER JOIN songs s ON s.vocadb_id = wi.song_id
    WHERE s.artist_type = 'Vocaloid'
    ORDER BY wi.weekly_increase DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  return songs;
}

/**
 * 신곡 랭킹 조회 (30일 이내, 500만 조회수 이하, 보컬로이드만)
 */
export async function getNewSongsRanking(limit: number = 100, offset: number = 0): Promise<RankingItem[]> {
  const songs = await prisma.$queryRaw<RankingItem[]>`
    SELECT
      ROW_NUMBER() OVER (ORDER BY view_count DESC) as rank,
      vocadb_id as "vocadbId",
      title,
      title_english as "titleEnglish",
      title_japanese as "titleJapanese",
      title_romaji as "titleRomaji",
      title_korean as "titleKorean",
      title_original as "titleOriginal",
      artist,
      artist_type as "artistType",
      youtube_id as "youtubeId",
      youtube_url as "youtubeUrl",
      thumb_url as "thumbUrl",
      favorited_times as "favoritedTimes",
      rating_score as "ratingScore",
      tags,
      publish_date as "publishDate",
      song_type as "songType",
      view_count as "viewCount",
      view_count_updated_at as "viewCountUpdatedAt",
      crawled_at as "crawledAt",
      default_language as "defaultLanguage"
    FROM songs
    WHERE publish_date >= CURRENT_DATE - INTERVAL '30 days'
      AND view_count IS NOT NULL
      AND view_count <= 5000000
      AND artist_type = 'Vocaloid'
    ORDER BY view_count DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  return songs.map((song, idx) => ({
    ...song,
    rank: offset + idx + 1,
  }));
}

/**
 * 곡 검색 (보컬로이드만)
 */
export async function searchSongs(
  query: string,
  limit: number = 20,
  offset: number = 0
): Promise<Song[]> {
  const searchPattern = `%${query}%`;

  return await prisma.song.findMany({
    where: {
      AND: [
        {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { titleEnglish: { contains: query, mode: 'insensitive' } },
            { titleJapanese: { contains: query, mode: 'insensitive' } },
            { titleKorean: { contains: query, mode: 'insensitive' } },
            { artist: { contains: query, mode: 'insensitive' } },
          ],
        },
        { artistType: 'Vocaloid' },
      ],
    },
    orderBy: [
      { viewCount: 'desc' },
    ],
    take: limit,
    skip: offset,
  });
}

/**
 * 특정 곡 상세 정보 조회
 */
export async function getSongById(vocadbId: number): Promise<Song | null> {
  return await prisma.song.findUnique({
    where: { vocadbId },
  });
}

/**
 * 곡의 일별 조회수 기록 조회
 */
export async function getDailyViewCounts(
  vocadbId: number,
  days: number = 30
): Promise<DailyViewCount[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return await prisma.dailyViewCount.findMany({
    where: {
      songId: vocadbId,
      recordedDate: {
        gte: startDate,
      },
    },
    orderBy: {
      recordedDate: 'asc',
    },
  });
}

/**
 * 전체 통계 조회 (보컬로이드만)
 */
export async function getStats(): Promise<{
  totalSongs: number;
  songsWithViews: number;
  totalViews: bigint;
  lastUpdate: Date | null;
}> {
  const result = await prisma.song.aggregate({
    where: { artistType: 'Vocaloid' },
    _count: {
      vocadbId: true,
      viewCount: true,
    },
    _sum: {
      viewCount: true,
    },
    _max: {
      viewCountUpdatedAt: true,
    },
  });

  return {
    totalSongs: result._count.vocadbId || 0,
    songsWithViews: result._count.viewCount || 0,
    totalViews: result._sum.viewCount || BigInt(0),
    lastUpdate: result._max.viewCountUpdatedAt,
  };
}

/**
 * 곡의 랭킹 위치 조회 (전체/일간/주간)
 */
export async function getSongRankPositions(vocadbId: number): Promise<RankingPositions> {
  // 총 조회수 랭킹 위치
  const totalRank = await prisma.$queryRaw<{ position: bigint }[]>`
    WITH ranked AS (
      SELECT
        vocadb_id,
        ROW_NUMBER() OVER (ORDER BY view_count DESC) as position
      FROM songs
      WHERE view_count IS NOT NULL
        AND artist_type = 'Vocaloid'
    )
    SELECT position FROM ranked WHERE vocadb_id = ${vocadbId}
  `;

  // 일간 증가량 랭킹 위치
  const dailyRank = await prisma.$queryRaw<{ position: bigint }[]>`
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
      WHERE recorded_date >= CURRENT_DATE - INTERVAL '2 days'
    ),
    today_changes AS (
      SELECT
        song_id,
        daily_increase
      FROM daily_changes
      WHERE recorded_date = CURRENT_DATE
        AND daily_increase > 0
    ),
    ranked AS (
      SELECT
        song_id,
        ROW_NUMBER() OVER (ORDER BY daily_increase DESC) as position
      FROM today_changes
    )
    SELECT position FROM ranked WHERE song_id = ${vocadbId}
  `;

  // 주간 증가량 랭킹 위치
  const weeklyRank = await prisma.$queryRaw<{ position: bigint }[]>`
    WITH weekly_data AS (
      SELECT
        song_id,
        recorded_date,
        total_views
      FROM daily_view_counts
      WHERE recorded_date >= CURRENT_DATE - INTERVAL '8 days'
    ),
    weekly_changes AS (
      SELECT
        song_id,
        MAX(CASE WHEN recorded_date = CURRENT_DATE THEN total_views END) as latest_views,
        MAX(CASE WHEN recorded_date = CURRENT_DATE - INTERVAL '7 days' THEN total_views END) as week_ago_views
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
    SELECT position FROM ranked WHERE song_id = ${vocadbId}
  `;

  return {
    total: totalRank[0] ? Number(totalRank[0].position) : null,
    daily: dailyRank[0] ? Number(dailyRank[0].position) : null,
    weekly: weeklyRank[0] ? Number(weeklyRank[0].position) : null,
  };
}

/**
 * 같은 아티스트의 다른 인기곡 조회
 */
export async function getRelatedSongsByArtist(
  artist: string,
  currentVocadbId: number,
  limit: number = 6
): Promise<Song[]> {
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

/**
 * 곡의 통계 정보 조회 (일/주/월 평균 증가량)
 */
export async function getSongStatistics(vocadbId: number): Promise<SongStatistics | null> {
  const result = await prisma.$queryRaw<SongStatistics[]>`
    WITH daily_increases AS (
      SELECT
        recorded_date,
        total_views,
        total_views - LAG(total_views) OVER (ORDER BY recorded_date) as daily_increase,
        TO_CHAR(recorded_date, 'IYYY-IW') as week,
        TO_CHAR(recorded_date, 'YYYY-MM') as month
      FROM daily_view_counts
      WHERE song_id = ${vocadbId}
      ORDER BY recorded_date
    ),
    daily_stats AS (
      SELECT
        AVG(CASE WHEN recorded_date >= CURRENT_DATE - INTERVAL '30 days' AND daily_increase > 0 THEN daily_increase END) as daily_avg,
        COUNT(DISTINCT CASE WHEN recorded_date >= CURRENT_DATE - INTERVAL '30 days' THEN recorded_date END) as total_days
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
        WHERE recorded_date >= CURRENT_DATE - INTERVAL '84 days'
        GROUP BY week
        HAVING MAX(total_views) - MIN(total_views) > 0
      ) t
    ),
    monthly_stats AS (
      SELECT
        AVG(monthly_increase) as monthly_avg
      FROM (
        SELECT
          month,
          MAX(total_views) - MIN(total_views) as monthly_increase
        FROM daily_increases
        WHERE recorded_date >= CURRENT_DATE - INTERVAL '180 days'
        GROUP BY month
        HAVING MAX(total_views) - MIN(total_views) > 0
      ) t
    )
    SELECT
      COALESCE(d.daily_avg, 0)::FLOAT as "dailyAverage",
      COALESCE(w.weekly_avg, 0)::FLOAT as "weeklyAverage",
      COALESCE(m.monthly_avg, 0)::FLOAT as "monthlyAverage",
      COALESCE(d.total_days, 0)::INT as "totalDays"
    FROM daily_stats d
    CROSS JOIN weekly_stats w
    CROSS JOIN monthly_stats m
  `;

  if (!result[0] || result[0].totalDays < 7) {
    return null;
  }

  return result[0];
}

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
  lengthSeconds: number | null;
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
  lyrics: { id: number; translationType: string; cultureCode: string | null; source: string | null; url: string | null; value: string | null }[];
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
 * - 최적화:
 *   1. 재사용 가능한 CTE로 중복 제거
 *   2. Composite index 활용 (idx_pvs_youtube_views)
 *   3. LEFT JOIN ANTI 패턴으로 NOT IN 대체
 */
export async function getTotalRanking(limit: number = 100, offset: number = 0): Promise<RankingItem[]> {
  const excludedType = 'OtherVoiceSynthesizer';
  const songs = await prisma.$queryRaw<any[]>`
    WITH excluded_songs AS (
      SELECT DISTINCT song_id
      FROM song_artists
      JOIN artists ON song_artists.artist_id = artists.vocadb_id
      WHERE artists.artist_type = ${excludedType}
    ),
    song_views AS (
      SELECT
        song_id,
        MAX(view_count) as total_view_count,
        MAX(view_count_updated_at) as last_updated
      FROM pvs
      WHERE service = 'Youtube' AND view_count IS NOT NULL
      GROUP BY song_id
    ),
    song_titles AS (
      SELECT
        song_id,
        MAX(CASE WHEN language = 'Korean' THEN value END) as title_korean,
        MAX(CASE WHEN language = 'English' THEN value END) as title_english,
        MAX(CASE WHEN language = 'Japanese' THEN value END) as title_japanese,
        MAX(CASE WHEN language = 'Romaji' THEN value END) as title_romaji
      FROM song_names
      GROUP BY song_id
    ),
    song_artists AS (
      SELECT
        sa.song_id,
        STRING_AGG(a.name, ', ' ORDER BY sa.id) as artist_string
      FROM song_artists sa
      JOIN artists a ON sa.artist_id = a.vocadb_id
      WHERE sa.is_support = false
      GROUP BY sa.song_id
    ),
    song_youtube AS (
      SELECT DISTINCT ON (song_id)
        song_id,
        pv_id as youtube_id,
        url as youtube_url
      FROM pvs
      WHERE service = 'Youtube' AND view_count IS NOT NULL
      ORDER BY song_id, view_count DESC NULLS LAST
    )
    SELECT
      ROW_NUMBER() OVER (ORDER BY sv.total_view_count DESC) as rank,
      s.vocadb_id as "vocadbId",
      s.default_name as "defaultName",
      st.title_korean as "titleKorean",
      st.title_english as "titleEnglish",
      st.title_japanese as "titleJapanese",
      st.title_romaji as "titleRomaji",
      sa.artist_string as "artistString",
      sy.youtube_id as "youtubeId",
      sy.youtube_url as "youtubeUrl",
      s.thumb_url as "thumbUrl",
      sv.total_view_count as "viewCount",
      sv.last_updated as "viewCountUpdatedAt",
      s.publish_date as "publishDate",
      s.song_type as "songType",
      s.favorited_times as "favoritedTimes",
      s.rating_score as "ratingScore",
      s.length_seconds as "lengthSeconds"
    FROM songs s
    LEFT JOIN excluded_songs es ON s.vocadb_id = es.song_id
    JOIN song_views sv ON s.vocadb_id = sv.song_id
    LEFT JOIN song_titles st ON s.vocadb_id = st.song_id
    LEFT JOIN song_artists sa ON s.vocadb_id = sa.song_id
    LEFT JOIN song_youtube sy ON s.vocadb_id = sy.song_id
    WHERE es.song_id IS NULL
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
 * - 최적화:
 *   1. 재사용 가능한 CTE로 중복 제거
 *   2. Composite index 활용 (idx_daily_recent_changes)
 *   3. LEFT JOIN ANTI 패턴으로 NOT IN 대체
 *   4. Window function 최적화
 */
export async function getDailyRanking(limit: number = 100, offset: number = 0): Promise<RankingItem[]> {
  const excludedType = 'OtherVoiceSynthesizer';
  const songs = await prisma.$queryRaw<any[]>`
    WITH excluded_songs AS (
      SELECT DISTINCT song_id
      FROM song_artists
      JOIN artists ON song_artists.artist_id = artists.vocadb_id
      WHERE artists.artist_type = ${excludedType}
    ),
    daily_changes AS (
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
        MAX(daily_increase) as daily_increase
      FROM daily_changes
      WHERE recorded_date = CURRENT_DATE
        AND daily_increase > 0
      GROUP BY song_id
    ),
    song_views AS (
      SELECT song_id, MAX(view_count) as total_view_count, MAX(view_count_updated_at) as last_updated
      FROM pvs WHERE service = 'Youtube' AND view_count IS NOT NULL
      GROUP BY song_id
    ),
    song_titles AS (
      SELECT
        song_id,
        MAX(CASE WHEN language = 'Korean' THEN value END) as title_korean,
        MAX(CASE WHEN language = 'English' THEN value END) as title_english,
        MAX(CASE WHEN language = 'Japanese' THEN value END) as title_japanese,
        MAX(CASE WHEN language = 'Romaji' THEN value END) as title_romaji
      FROM song_names
      GROUP BY song_id
    ),
    song_artists AS (
      SELECT
        sa.song_id,
        STRING_AGG(a.name, ', ' ORDER BY sa.id) as artist_string
      FROM song_artists sa
      JOIN artists a ON sa.artist_id = a.vocadb_id
      WHERE sa.is_support = false
      GROUP BY sa.song_id
    ),
    song_youtube AS (
      SELECT DISTINCT ON (song_id)
        song_id,
        pv_id as youtube_id,
        url as youtube_url
      FROM pvs
      WHERE service = 'Youtube' AND view_count IS NOT NULL
      ORDER BY song_id, view_count DESC NULLS LAST
    )
    SELECT
      ROW_NUMBER() OVER (ORDER BY tc.daily_increase DESC) as rank,
      s.vocadb_id as "vocadbId",
      s.default_name as "defaultName",
      st.title_korean as "titleKorean",
      st.title_english as "titleEnglish",
      st.title_japanese as "titleJapanese",
      st.title_romaji as "titleRomaji",
      sa.artist_string as "artistString",
      sy.youtube_id as "youtubeId",
      sy.youtube_url as "youtubeUrl",
      s.thumb_url as "thumbUrl",
      sv.total_view_count as "viewCount",
      sv.last_updated as "viewCountUpdatedAt",
      s.publish_date as "publishDate",
      s.song_type as "songType",
      s.favorited_times as "favoritedTimes",
      s.rating_score as "ratingScore",
      s.length_seconds as "lengthSeconds",
      tc.daily_increase as "dailyIncrease"
    FROM today_changes tc
    JOIN songs s ON s.vocadb_id = tc.song_id
    LEFT JOIN excluded_songs es ON s.vocadb_id = es.song_id
    LEFT JOIN song_views sv ON s.vocadb_id = sv.song_id
    LEFT JOIN song_titles st ON s.vocadb_id = st.song_id
    LEFT JOIN song_artists sa ON s.vocadb_id = sa.song_id
    LEFT JOIN song_youtube sy ON s.vocadb_id = sy.song_id
    WHERE es.song_id IS NULL
    ORDER BY tc.daily_increase DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  return songs.map((song, idx) => ({
    ...song,
    rank: offset + idx + 1,
  }));
}

/**
 * 주간 증가량 기준 랭킹 조회
 * - 최적화:
 *   1. 재사용 가능한 CTE로 중복 제거
 *   2. LEFT JOIN ANTI 패턴으로 NOT IN 대체
 *   3. 주간 데이터 집계 최적화
 */
export async function getWeeklyRanking(limit: number = 100, offset: number = 0): Promise<RankingItem[]> {
  const excludedType = 'OtherVoiceSynthesizer';
  const songs = await prisma.$queryRaw<any[]>`
    WITH excluded_songs AS (
      SELECT DISTINCT song_id
      FROM song_artists
      JOIN artists ON song_artists.artist_id = artists.vocadb_id
      WHERE artists.artist_type = ${excludedType}
    ),
    weekly_data AS (
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
        MAX(CASE WHEN recorded_date = CURRENT_DATE THEN total_views ELSE 0 END) as latest_views,
        MAX(CASE WHEN recorded_date = CURRENT_DATE - INTERVAL '7 days' THEN total_views ELSE 0 END) as week_ago_views
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
    song_views AS (
      SELECT song_id, MAX(view_count) as total_view_count, MAX(view_count_updated_at) as last_updated
      FROM pvs WHERE service = 'Youtube' AND view_count IS NOT NULL
      GROUP BY song_id
    ),
    song_titles AS (
      SELECT
        song_id,
        MAX(CASE WHEN language = 'Korean' THEN value END) as title_korean,
        MAX(CASE WHEN language = 'English' THEN value END) as title_english,
        MAX(CASE WHEN language = 'Japanese' THEN value END) as title_japanese,
        MAX(CASE WHEN language = 'Romaji' THEN value END) as title_romaji
      FROM song_names
      GROUP BY song_id
    ),
    song_artists AS (
      SELECT
        sa.song_id,
        STRING_AGG(a.name, ', ' ORDER BY sa.id) as artist_string
      FROM song_artists sa
      JOIN artists a ON sa.artist_id = a.vocadb_id
      WHERE sa.is_support = false
      GROUP BY sa.song_id
    ),
    song_youtube AS (
      SELECT DISTINCT ON (song_id)
        song_id,
        pv_id as youtube_id,
        url as youtube_url
      FROM pvs
      WHERE service = 'Youtube' AND view_count IS NOT NULL
      ORDER BY song_id, view_count DESC NULLS LAST
    )
    SELECT
      ROW_NUMBER() OVER (ORDER BY wi.weekly_increase DESC) as rank,
      s.vocadb_id as "vocadbId",
      s.default_name as "defaultName",
      st.title_korean as "titleKorean",
      st.title_english as "titleEnglish",
      st.title_japanese as "titleJapanese",
      st.title_romaji as "titleRomaji",
      sa.artist_string as "artistString",
      sy.youtube_id as "youtubeId",
      sy.youtube_url as "youtubeUrl",
      s.thumb_url as "thumbUrl",
      sv.total_view_count as "viewCount",
      sv.last_updated as "viewCountUpdatedAt",
      s.publish_date as "publishDate",
      s.song_type as "songType",
      s.favorited_times as "favoritedTimes",
      s.rating_score as "ratingScore",
      s.length_seconds as "lengthSeconds",
      wi.weekly_increase as "weeklyIncrease"
    FROM weekly_increases wi
    JOIN songs s ON s.vocadb_id = wi.song_id
    LEFT JOIN excluded_songs es ON s.vocadb_id = es.song_id
    LEFT JOIN song_views sv ON s.vocadb_id = sv.song_id
    LEFT JOIN song_titles st ON s.vocadb_id = st.song_id
    LEFT JOIN song_artists sa ON s.vocadb_id = sa.song_id
    LEFT JOIN song_youtube sy ON s.vocadb_id = sy.song_id
    WHERE es.song_id IS NULL
    ORDER BY wi.weekly_increase DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  return songs.map((song, idx) => ({
    ...song,
    rank: offset + idx + 1,
  }));
}

/**
 * 신곡 랭킹 조회 (발매일 최신순)
 * - 최적화:
 *   1. 재사용 가능한 CTE로 중복 제거
 *   2. LEFT JOIN ANTI 패턴으로 NOT IN 대체
 *   3. idx_songs_publish 인덱스 활용
 */
export async function getNewSongsRanking(limit: number = 100, offset: number = 0): Promise<RankingItem[]> {
  const excludedType = 'OtherVoiceSynthesizer';
  const songs = await prisma.$queryRaw<any[]>`
    WITH excluded_songs AS (
      SELECT DISTINCT song_id
      FROM song_artists
      JOIN artists ON song_artists.artist_id = artists.vocadb_id
      WHERE artists.artist_type = ${excludedType}
    ),
    song_views AS (
      SELECT song_id, MAX(view_count) as total_view_count, MAX(view_count_updated_at) as last_updated
      FROM pvs WHERE service = 'Youtube' AND view_count IS NOT NULL
      GROUP BY song_id
    ),
    song_titles AS (
      SELECT
        song_id,
        MAX(CASE WHEN language = 'Korean' THEN value END) as title_korean,
        MAX(CASE WHEN language = 'English' THEN value END) as title_english,
        MAX(CASE WHEN language = 'Japanese' THEN value END) as title_japanese,
        MAX(CASE WHEN language = 'Romaji' THEN value END) as title_romaji
      FROM song_names
      GROUP BY song_id
    ),
    song_artists AS (
      SELECT
        sa.song_id,
        STRING_AGG(a.name, ', ' ORDER BY sa.id) as artist_string
      FROM song_artists sa
      JOIN artists a ON sa.artist_id = a.vocadb_id
      WHERE sa.is_support = false
      GROUP BY sa.song_id
    ),
    song_youtube AS (
      SELECT DISTINCT ON (song_id)
        song_id,
        pv_id as youtube_id,
        url as youtube_url
      FROM pvs
      WHERE service = 'Youtube' AND view_count IS NOT NULL
      ORDER BY song_id, view_count DESC NULLS LAST
    )
    SELECT
      ROW_NUMBER() OVER (ORDER BY s.publish_date DESC) as rank,
      s.vocadb_id as "vocadbId",
      s.default_name as "defaultName",
      st.title_korean as "titleKorean",
      st.title_english as "titleEnglish",
      st.title_japanese as "titleJapanese",
      st.title_romaji as "titleRomaji",
      sa.artist_string as "artistString",
      sy.youtube_id as "youtubeId",
      sy.youtube_url as "youtubeUrl",
      s.thumb_url as "thumbUrl",
      sv.total_view_count as "viewCount",
      sv.last_updated as "viewCountUpdatedAt",
      s.publish_date as "publishDate",
      s.song_type as "songType",
      s.favorited_times as "favoritedTimes",
      s.rating_score as "ratingScore",
      s.length_seconds as "lengthSeconds"
    FROM songs s
    LEFT JOIN excluded_songs es ON s.vocadb_id = es.song_id
    LEFT JOIN song_views sv ON s.vocadb_id = sv.song_id
    LEFT JOIN song_titles st ON s.vocadb_id = st.song_id
    LEFT JOIN song_artists sa ON s.vocadb_id = sa.song_id
    LEFT JOIN song_youtube sy ON s.vocadb_id = sy.song_id
    WHERE s.publish_date IS NOT NULL
      AND es.song_id IS NULL
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
  const song = await prisma.songs.findUnique({
    where: { vocadb_id: vocadbId },
    include: {
      song_names: true,
      song_artists: {
        include: { artists: true },
        orderBy: { id: 'asc' },
      },
      pvs: {
        orderBy: [{ service: 'asc' }, { id: 'asc' }],
      },
      song_tags: {
        include: { tags: true },
        orderBy: { count: 'desc' },
      },
      lyrics: true,
    },
  });

  if (!song) return null;

  return {
    vocadbId: song.vocadb_id,
    defaultName: song.default_name,
    songType: song.song_type,
    publishDate: song.publish_date,
    createDate: song.create_date,
    lengthSeconds: song.length_seconds,
    favoritedTimes: song.favorited_times,
    ratingScore: song.rating_score,
    thumbUrl: song.thumb_url,
    crawledAt: song.crawled_at,
    names: song.song_names.map(n => ({ language: n.language, value: n.value })),
    artists: song.song_artists.map(sa => ({
      id: sa.artists.vocadb_id,
      name: sa.artists.name,
      artistType: sa.artists.artist_type,
      categories: sa.categories,
      roles: sa.roles,
      isSupport: sa.is_support,
    })),
    pvs: song.pvs.map(pv => ({
      id: pv.id,
      pvId: pv.pv_id,
      service: pv.service,
      pvType: pv.pv_type,
      name: pv.name,
      url: pv.url,
      viewCount: pv.view_count,
      viewCountUpdatedAt: pv.view_count_updated_at,
    })),
    tags: song.song_tags.map(st => ({
      id: st.tags.vocadb_id,
      name: st.tags.name,
      categoryName: st.tags.category_name,
      count: st.count,
    })),
    lyrics: song.lyrics.map(l => ({
      id: l.id,
      translationType: l.translation_type,
      cultureCode: l.culture_code,
      source: l.source,
      url: l.url,
      value: l.value,
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
    prisma.songs.count(),
    prisma.$queryRaw<[{ songs_with_views: bigint; total_views: bigint; last_update: Date | null }]>`
      WITH song_max_views AS (
        SELECT song_id, MAX(view_count) as max_view_count
        FROM pvs
        WHERE service = 'Youtube' AND view_count IS NOT NULL
        GROUP BY song_id
      )
      SELECT
        COUNT(*) as songs_with_views,
        COALESCE(SUM(max_view_count), 0) as total_views,
        (SELECT MAX(view_count_updated_at) FROM pvs WHERE service = 'Youtube') as last_update
      FROM song_max_views
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
 * - 최적화: LEFT JOIN ANTI 패턴으로 NOT IN 제거
 */
export async function getSongRankPositions(vocadbId: number): Promise<RankingPositions> {
  // 총 조회수 랭킹 위치
  const totalRank = await prisma.$queryRaw<{ position: bigint }[]>`
    WITH song_views AS (
      SELECT song_id, MAX(view_count) as total_view_count
      FROM pvs WHERE service = 'Youtube' AND view_count IS NOT NULL
      GROUP BY song_id
    ),
    ranked AS (
      SELECT
        sv.song_id,
        ROW_NUMBER() OVER (ORDER BY sv.total_view_count DESC) as position
      FROM song_views sv
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
      SELECT song_id, MAX(view_count) as total_view_count, MAX(view_count_updated_at) as last_updated
      FROM pvs WHERE service = 'Youtube' AND view_count IS NOT NULL
      GROUP BY song_id
    ),
    song_titles AS (
      SELECT
        song_id,
        MAX(CASE WHEN language = 'Korean' THEN value END) as title_korean,
        MAX(CASE WHEN language = 'English' THEN value END) as title_english,
        MAX(CASE WHEN language = 'Japanese' THEN value END) as title_japanese,
        MAX(CASE WHEN language = 'Romaji' THEN value END) as title_romaji
      FROM song_names
      GROUP BY song_id
    ),
    song_artists AS (
      SELECT
        sa.song_id,
        STRING_AGG(a.name, ', ' ORDER BY sa.id) as artist_string
      FROM song_artists sa
      JOIN artists a ON sa.artist_id = a.vocadb_id
      WHERE sa.is_support = false
      GROUP BY sa.song_id
    ),
    song_youtube AS (
      SELECT DISTINCT ON (song_id)
        song_id,
        pv_id as youtube_id,
        url as youtube_url
      FROM pvs
      WHERE service = 'Youtube' AND view_count IS NOT NULL
      ORDER BY song_id, view_count DESC NULLS LAST
    )
    SELECT
      s.vocadb_id as "vocadbId",
      s.default_name as "defaultName",
      st.title_korean as "titleKorean",
      st.title_english as "titleEnglish",
      st.title_japanese as "titleJapanese",
      st.title_romaji as "titleRomaji",
      sa.artist_string as "artistString",
      sy.youtube_id as "youtubeId",
      sy.youtube_url as "youtubeUrl",
      s.thumb_url as "thumbUrl",
      sv.total_view_count as "viewCount",
      sv.last_updated as "viewCountUpdatedAt",
      s.publish_date as "publishDate",
      s.song_type as "songType",
      s.favorited_times as "favoritedTimes",
      s.rating_score as "ratingScore",
      s.length_seconds as "lengthSeconds"
    FROM songs s
    JOIN matching_songs ms ON s.vocadb_id = ms.vocadb_id
    LEFT JOIN song_views sv ON s.vocadb_id = sv.song_id
    LEFT JOIN song_titles st ON s.vocadb_id = st.song_id
    LEFT JOIN song_artists sa ON s.vocadb_id = sa.song_id
    LEFT JOIN song_youtube sy ON s.vocadb_id = sy.song_id
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
 * - 최적화: 재사용 가능한 CTE로 중복 제거
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
      SELECT song_id, MAX(view_count) as total_view_count
      FROM pvs WHERE service = 'Youtube' AND view_count IS NOT NULL
      GROUP BY song_id
    ),
    song_titles AS (
      SELECT
        song_id,
        MAX(CASE WHEN language = 'Korean' THEN value END) as title_korean,
        MAX(CASE WHEN language = 'English' THEN value END) as title_english,
        MAX(CASE WHEN language = 'Japanese' THEN value END) as title_japanese,
        MAX(CASE WHEN language = 'Romaji' THEN value END) as title_romaji
      FROM song_names
      GROUP BY song_id
    ),
    song_artists AS (
      SELECT
        sa.song_id,
        STRING_AGG(a.name, ', ' ORDER BY sa.id) as artist_string
      FROM song_artists sa
      JOIN artists a ON sa.artist_id = a.vocadb_id
      WHERE sa.is_support = false
      GROUP BY sa.song_id
    ),
    song_youtube AS (
      SELECT DISTINCT ON (song_id)
        song_id,
        pv_id as youtube_id,
        url as youtube_url
      FROM pvs
      WHERE service = 'Youtube' AND view_count IS NOT NULL
      ORDER BY song_id, view_count DESC NULLS LAST
    )
    SELECT
      s.vocadb_id as "vocadbId",
      s.default_name as "defaultName",
      st.title_korean as "titleKorean",
      st.title_english as "titleEnglish",
      st.title_japanese as "titleJapanese",
      st.title_romaji as "titleRomaji",
      sa.artist_string as "artistString",
      sy.youtube_id as "youtubeId",
      sy.youtube_url as "youtubeUrl",
      s.thumb_url as "thumbUrl",
      sv.total_view_count as "viewCount",
      NULL as "viewCountUpdatedAt",
      s.publish_date as "publishDate",
      s.song_type as "songType",
      s.favorited_times as "favoritedTimes",
      s.rating_score as "ratingScore"
    FROM songs s
    JOIN artist_songs asng ON s.vocadb_id = asng.song_id
    LEFT JOIN song_views sv ON s.vocadb_id = sv.song_id
    LEFT JOIN song_titles st ON s.vocadb_id = st.song_id
    LEFT JOIN song_artists sa ON s.vocadb_id = sa.song_id
    LEFT JOIN song_youtube sy ON s.vocadb_id = sy.song_id
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
 * - 최적화: 중첩 서브쿼리를 집계 함수로 변경하여 단일 스캔으로 처리
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
        JOIN pvs p ON dvc.pv_id = p.id
        WHERE p.song_id = ${vocadbId}
          AND p.service = 'Youtube'
          AND dvc.recorded_date >= CURRENT_DATE - INTERVAL '14 days'
        GROUP BY dvc.recorded_date
      ),
      daily_increases AS (
        SELECT
          recorded_date,
          total_views,
          total_views - LAG(total_views) OVER (ORDER BY recorded_date) as daily_increase
        FROM daily_data
      )
      SELECT
        MAX(CASE WHEN recorded_date = CURRENT_DATE THEN total_views END) as "viewsToday",
        MAX(CASE WHEN recorded_date = CURRENT_DATE - INTERVAL '1 day' THEN total_views END) as "viewsYesterday",
        SUM(CASE WHEN recorded_date > CURRENT_DATE - INTERVAL '7 days' THEN daily_increase ELSE 0 END) as "viewsThisWeek",
        SUM(CASE WHEN recorded_date <= CURRENT_DATE - INTERVAL '7 days' AND recorded_date > CURRENT_DATE - INTERVAL '14 days' THEN daily_increase ELSE 0 END) as "viewsLastWeek",
        AVG(CASE WHEN daily_increase > 0 THEN daily_increase END) as "avgDailyViews",
        MAX(daily_increase) as "peakDailyIncrease",
        MAX(CASE WHEN daily_increase = (SELECT MAX(daily_increase) FROM daily_increases) THEN recorded_date END) as "peakDate"
      FROM daily_increases
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

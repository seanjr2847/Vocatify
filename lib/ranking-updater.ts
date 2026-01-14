/**
 * Ranking Cache Updater
 *
 * Pre-computes and stores rankings in database for fast retrieval.
 * Called by cron job after YouTube view count updates.
 */

import { prisma } from './prisma';
import { Prisma } from '@prisma/client';
import { INCLUDED_VOICE_SYNTHESIZER_TYPES } from './constants';

const RANKING_LIMIT = 100; // Store top 100 for each ranking type

/**
 * Helper function to map raw query results to ranking cache rows
 */
function mapToRankingCacheRow(
  row: any,
  rankingType: 'total' | 'weekly' | 'new'
): any {
  return {
    ranking_type: rankingType,
    rank: Number(row.rank),
    song_id: row.song_id,
    default_name: row.default_name,
    title_korean: row.title_korean,
    title_english: row.title_english,
    title_japanese: row.title_japanese,
    title_romaji: row.title_romaji,
    artist_string: row.artist_string,
    youtube_id: row.youtube_id,
    youtube_url: row.youtube_url,
    thumb_url: row.thumb_url,
    view_count: row.view_count,
    view_count_updated_at: row.view_count_updated_at,
    publish_date: row.publish_date,
    song_type: row.song_type,
    favorited_times: row.favorited_times,
    rating_score: row.rating_score,
    length_seconds: row.length_seconds,
    weekly_increase: row.weekly_increase ?? null,
  };
}

export async function updateRankingCache() {
  console.log('[Ranking Cache] Starting update...');
  const startTime = Date.now();

  try {
    // Calculate rankings separately to avoid timeout
    // Total and New rankings are fast (<1s each)
    // Weekly ranking is slower (~30s) due to daily_view_counts scan
    console.log('[Ranking Cache] Calculating total ranking...');
    const totalRankings = await calculateTotalRanking();
    console.log(`[Ranking Cache] Total: ${totalRankings.length} rankings`);

    // Skip weekly ranking if song_weekly_stats table is empty
    console.log('[Ranking Cache] Checking weekly stats availability...');
    const hasWeeklyStats = await prisma.song_weekly_stats.count();

    let weeklyRankings: any[] = [];
    if (hasWeeklyStats > 0) {
      console.log('[Ranking Cache] Calculating weekly ranking...');
      weeklyRankings = await calculateWeeklyRanking();
      console.log(`[Ranking Cache] Weekly: ${weeklyRankings.length} rankings`);
    } else {
      console.log('[Ranking Cache] Skipping weekly ranking (no weekly stats data)');
    }

    console.log('[Ranking Cache] Calculating new ranking...');
    const newRankings = await calculateNewRanking();
    console.log(`[Ranking Cache] New: ${newRankings.length} rankings`);

    const allRankings = [...totalRankings, ...weeklyRankings, ...newRankings];

    console.log(`[Ranking Cache] Calculated ${allRankings.length} rankings total`);

    // Count by type
    const counts = allRankings.reduce((acc, row) => {
      acc[row.ranking_type] = (acc[row.ranking_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Clear old cache and insert new data in transaction
    await prisma.$transaction(async (tx) => {
      // Delete all old rankings
      await tx.ranking_cache.deleteMany({});

      // Insert new rankings
      await tx.ranking_cache.createMany({
        data: allRankings,
      });
    });

    const duration = Date.now() - startTime;
    console.log(`[Ranking Cache] Update completed in ${duration}ms`);

    return {
      success: true,
      totalCount: counts['total'] || 0,
      weeklyCount: counts['weekly'] || 0,
      newCount: counts['new'] || 0,
      duration,
    };
  } catch (error) {
    console.error('[Ranking Cache] Update failed:', error);
    throw error;
  }
}

/**
 * Calculate Total Ranking (by total views)
 * Fast query (~1s) - no daily_view_counts scan
 */
async function calculateTotalRanking() {
  const result = await prisma.$queryRaw<any[]>`
    WITH included_songs AS (
      SELECT DISTINCT song_id
      FROM song_artists
      JOIN artists ON song_artists.artist_id = artists.vocadb_id
      WHERE artists.artist_type IN ('Vocaloid', 'UTAU', 'SynthesizerV', 'CeVIO', 'VOICEVOX', 'AIVOICE', 'VoiSona', 'Voiceroid', 'NEUTRINO', 'ACEVirtualSinger')
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
      'total' as ranking_type,
      ROW_NUMBER() OVER (ORDER BY sv.total_view_count DESC) as rank,
      s.vocadb_id as song_id,
      s.default_name,
      st.title_korean,
      st.title_english,
      st.title_japanese,
      st.title_romaji,
      sa.artist_string,
      sy.youtube_id,
      sy.youtube_url,
      s.thumb_url,
      sv.total_view_count as view_count,
      sv.last_updated as view_count_updated_at,
      s.publish_date,
      s.song_type,
      s.favorited_times,
      s.rating_score,
      s.length_seconds,
      NULL::bigint as weekly_increase
    FROM songs s
    INNER JOIN included_songs inc ON s.vocadb_id = inc.song_id
    JOIN song_views sv ON s.vocadb_id = sv.song_id
    LEFT JOIN song_titles st ON s.vocadb_id = st.song_id
    LEFT JOIN song_artists sa ON s.vocadb_id = sa.song_id
    LEFT JOIN song_youtube sy ON s.vocadb_id = sy.song_id
    ORDER BY sv.total_view_count DESC
    LIMIT ${RANKING_LIMIT}
  `;

  return result.map(row => mapToRankingCacheRow(row, 'total'));
}

/**
 * Calculate Weekly Ranking (by weekly increase)
 * Fast query (~1s) - uses pre-computed song_weekly_stats cache
 */
async function calculateWeeklyRanking() {
  const result = await prisma.$queryRaw<any[]>`
    WITH included_songs AS (
      SELECT DISTINCT song_id
      FROM song_artists
      JOIN artists ON song_artists.artist_id = artists.vocadb_id
      WHERE artists.artist_type IN ('Vocaloid', 'UTAU', 'SynthesizerV', 'CeVIO', 'VOICEVOX', 'AIVOICE', 'VoiSona', 'Voiceroid', 'NEUTRINO', 'ACEVirtualSinger')
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
      'weekly' as ranking_type,
      ROW_NUMBER() OVER (ORDER BY ws.weekly_increase DESC) as rank,
      s.vocadb_id as song_id,
      s.default_name,
      st.title_korean,
      st.title_english,
      st.title_japanese,
      st.title_romaji,
      sa.artist_string,
      sy.youtube_id,
      sy.youtube_url,
      s.thumb_url,
      sv.total_view_count as view_count,
      sv.last_updated as view_count_updated_at,
      s.publish_date,
      s.song_type,
      s.favorited_times,
      s.rating_score,
      s.length_seconds,
      ws.weekly_increase
    FROM song_weekly_stats ws
    JOIN songs s ON s.vocadb_id = ws.song_id
    INNER JOIN included_songs inc ON s.vocadb_id = inc.song_id
    LEFT JOIN song_views sv ON s.vocadb_id = sv.song_id
    LEFT JOIN song_titles st ON s.vocadb_id = st.song_id
    LEFT JOIN song_artists sa ON s.vocadb_id = sa.song_id
    LEFT JOIN song_youtube sy ON s.vocadb_id = sy.song_id
    ORDER BY ws.weekly_increase DESC
    LIMIT ${RANKING_LIMIT}
  `;

  return result.map(row => mapToRankingCacheRow(row, 'weekly'));
}

/**
 * Calculate New Ranking (by publish date)
 * Fast query (~1s) - no daily_view_counts scan
 */
async function calculateNewRanking() {
  const result = await prisma.$queryRaw<any[]>`
    WITH included_songs AS (
      SELECT DISTINCT song_id
      FROM song_artists
      JOIN artists ON song_artists.artist_id = artists.vocadb_id
      WHERE artists.artist_type IN ('Vocaloid', 'UTAU', 'SynthesizerV', 'CeVIO', 'VOICEVOX', 'AIVOICE', 'VoiSona', 'Voiceroid', 'NEUTRINO', 'ACEVirtualSinger')
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
      'new' as ranking_type,
      ROW_NUMBER() OVER (ORDER BY s.publish_date DESC) as rank,
      s.vocadb_id as song_id,
      s.default_name,
      st.title_korean,
      st.title_english,
      st.title_japanese,
      st.title_romaji,
      sa.artist_string,
      sy.youtube_id,
      sy.youtube_url,
      s.thumb_url,
      sv.total_view_count as view_count,
      sv.last_updated as view_count_updated_at,
      s.publish_date,
      s.song_type,
      s.favorited_times,
      s.rating_score,
      s.length_seconds,
      NULL::bigint as weekly_increase
    FROM songs s
    INNER JOIN included_songs inc ON s.vocadb_id = inc.song_id
    LEFT JOIN song_views sv ON s.vocadb_id = sv.song_id
    LEFT JOIN song_titles st ON s.vocadb_id = st.song_id
    LEFT JOIN song_artists sa ON s.vocadb_id = sa.song_id
    LEFT JOIN song_youtube sy ON s.vocadb_id = sy.song_id
    WHERE s.publish_date IS NOT NULL
      AND s.publish_date >= CURRENT_DATE - INTERVAL '30 days'
    ORDER BY s.publish_date DESC
    LIMIT ${RANKING_LIMIT}
  `;

  return result.map(row => mapToRankingCacheRow(row, 'new'));
}

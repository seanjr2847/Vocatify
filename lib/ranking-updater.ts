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
    // Calculate all rankings in a single unified query for efficiency
    const allRankings = await calculateAllRankings();

    console.log(`[Ranking Cache] Calculated ${allRankings.length} rankings`);

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
 * Unified ranking calculation using shared CTEs for all ranking types
 * Computes total, weekly, and new rankings in a single query for efficiency
 */
async function calculateAllRankings() {
  // Build the voice synthesizer types as a SQL array literal
  const voiceTypes = INCLUDED_VOICE_SYNTHESIZER_TYPES.map(t => `'${t}'`).join(', ');

  const result = await prisma.$queryRaw<any[]>`
    WITH included_songs AS (
      SELECT DISTINCT song_id
      FROM song_artists
      JOIN artists ON song_artists.artist_id = artists.vocadb_id
      WHERE artists.artist_type IN (${Prisma.raw(voiceTypes)})
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
    -- Total Ranking (by total views)
    total_ranking AS (
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
    ),
    -- Weekly Ranking (by weekly increase)
    weekly_ranking AS (
      SELECT
        'weekly' as ranking_type,
        ROW_NUMBER() OVER (ORDER BY wi.weekly_increase DESC) as rank,
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
        wi.weekly_increase
      FROM weekly_increases wi
      JOIN songs s ON s.vocadb_id = wi.song_id
      INNER JOIN included_songs inc ON s.vocadb_id = inc.song_id
      LEFT JOIN song_views sv ON s.vocadb_id = sv.song_id
      LEFT JOIN song_titles st ON s.vocadb_id = st.song_id
      LEFT JOIN song_artists sa ON s.vocadb_id = sa.song_id
      LEFT JOIN song_youtube sy ON s.vocadb_id = sy.song_id
      ORDER BY wi.weekly_increase DESC
      LIMIT ${RANKING_LIMIT}
    ),
    -- New Ranking (by publish date)
    new_ranking AS (
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
    )
    -- Union all rankings together
    SELECT * FROM total_ranking
    UNION ALL
    SELECT * FROM weekly_ranking
    UNION ALL
    SELECT * FROM new_ranking
  `;

  return result.map(row => mapToRankingCacheRow(row, row.ranking_type));
}

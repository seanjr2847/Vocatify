import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { INCLUDED_VOICE_SYNTHESIZER_TYPES } from '@/lib/constants';

export interface RadioSong {
  vocadbId: number;
  defaultName: string;
  titleKorean: string | null;
  titleEnglish: string | null;
  titleJapanese: string | null;
  titleRomaji: string | null;
  artistString: string | null;
  youtubeId: string | null;
  youtubeUrl: string | null;
  thumbUrl: string | null;
  viewCount: bigint | null;
  lengthSeconds: number | null;
}

/**
 * 인기곡 기반 재생목록 (조회수 순)
 */
export async function getPopularPlaylist(
  minViews: number,
  excludeIds: number[],
  limit: number = 15
): Promise<RadioSong[]> {
  const artistTypes = INCLUDED_VOICE_SYNTHESIZER_TYPES;

  const songs = await prisma.$queryRaw<RadioSong[]>`
    WITH included_songs AS (
      SELECT DISTINCT song_id
      FROM song_artists
      JOIN artists ON song_artists.artist_id = artists.vocadb_id
      WHERE artists.artist_type = ANY(${artistTypes}::text[])
    ),
    song_views AS (
      SELECT
        song_id,
        MAX(view_count) as total_view_count,
        MAX(pv_id) as youtube_id,
        MAX(url) as youtube_url
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
    song_artist_names AS (
      SELECT
        sa.song_id,
        STRING_AGG(a.name, ', ' ORDER BY sa.id) as artist_string
      FROM song_artists sa
      JOIN artists a ON sa.artist_id = a.vocadb_id
      WHERE sa.is_support = false
      GROUP BY sa.song_id
    )
    SELECT
      s.vocadb_id as "vocadbId",
      s.default_name as "defaultName",
      st.title_korean as "titleKorean",
      st.title_english as "titleEnglish",
      st.title_japanese as "titleJapanese",
      st.title_romaji as "titleRomaji",
      san.artist_string as "artistString",
      sv.youtube_id as "youtubeId",
      sv.youtube_url as "youtubeUrl",
      s.thumb_url as "thumbUrl",
      sv.total_view_count as "viewCount",
      s.length_seconds as "lengthSeconds"
    FROM songs s
    INNER JOIN included_songs inc ON s.vocadb_id = inc.song_id
    JOIN song_views sv ON s.vocadb_id = sv.song_id
    LEFT JOIN song_titles st ON s.vocadb_id = st.song_id
    LEFT JOIN song_artist_names san ON s.vocadb_id = san.song_id
    WHERE sv.total_view_count >= ${minViews}
      AND s.vocadb_id != ALL(${excludeIds}::int[])
    ORDER BY sv.total_view_count DESC
    LIMIT ${limit * 3}
  `;

  // 티어별 랜덤화 (항상 같은 곡만 나오는 것 방지)
  const tier1 = songs.slice(0, Math.floor(songs.length / 3));
  const tier2 = songs.slice(Math.floor(songs.length / 3), Math.floor(songs.length * 2 / 3));
  const tier3 = songs.slice(Math.floor(songs.length * 2 / 3));

  const shuffled = [
    ...shuffle(tier1),
    ...shuffle(tier2),
    ...shuffle(tier3),
  ].slice(0, limit);

  return shuffled;
}

/**
 * 랜덤 재생목록 (조회수 범위 내에서 랜덤)
 */
export async function getRandomPlaylist(
  minViews: number,
  maxViews: number | undefined,
  excludeIds: number[],
  limit: number = 15
): Promise<RadioSong[]> {
  const artistTypes = INCLUDED_VOICE_SYNTHESIZER_TYPES;

  // maxViews가 있으면 범위 쿼리, 없으면 최소값만
  const viewCondition = maxViews
    ? Prisma.sql`AND sv.total_view_count <= ${maxViews}`
    : Prisma.sql``;

  const songs = await prisma.$queryRaw<RadioSong[]>`
    WITH included_songs AS (
      SELECT DISTINCT song_id
      FROM song_artists
      JOIN artists ON song_artists.artist_id = artists.vocadb_id
      WHERE artists.artist_type = ANY(${artistTypes}::text[])
    ),
    song_views AS (
      SELECT
        song_id,
        MAX(view_count) as total_view_count,
        MAX(pv_id) as youtube_id,
        MAX(url) as youtube_url
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
    song_artist_names AS (
      SELECT
        sa.song_id,
        STRING_AGG(a.name, ', ' ORDER BY sa.id) as artist_string
      FROM song_artists sa
      JOIN artists a ON sa.artist_id = a.vocadb_id
      WHERE sa.is_support = false
      GROUP BY sa.song_id
    )
    SELECT
      s.vocadb_id as "vocadbId",
      s.default_name as "defaultName",
      st.title_korean as "titleKorean",
      st.title_english as "titleEnglish",
      st.title_japanese as "titleJapanese",
      st.title_romaji as "titleRomaji",
      san.artist_string as "artistString",
      sv.youtube_id as "youtubeId",
      sv.youtube_url as "youtubeUrl",
      s.thumb_url as "thumbUrl",
      sv.total_view_count as "viewCount",
      s.length_seconds as "lengthSeconds"
    FROM songs s
    INNER JOIN included_songs inc ON s.vocadb_id = inc.song_id
    JOIN song_views sv ON s.vocadb_id = sv.song_id
    LEFT JOIN song_titles st ON s.vocadb_id = st.song_id
    LEFT JOIN song_artist_names san ON s.vocadb_id = san.song_id
    WHERE sv.total_view_count >= ${minViews}
      ${viewCondition}
      AND s.vocadb_id != ALL(${excludeIds}::int[])
    ORDER BY RANDOM()
    LIMIT ${limit}
  `;

  return songs;
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

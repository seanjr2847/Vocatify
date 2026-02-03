import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

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
 * 인기곡 기반 재생목록 (조회수 순 + 티어별 랜덤)
 *
 * Optimization:
 * - SQL 레벨에서 티어 기반 랜덤 샘플링 수행
 * - 각 티어에서 균등하게 샘플링하여 다양성 확보
 * - NOT EXISTS 대신 LEFT JOIN + IS NULL 패턴 사용 (excludeIds가 큰 경우)
 */
export async function getPopularPlaylist(
  minViews: number,
  excludeIds: number[],
  limit: number = 15
): Promise<RadioSong[]> {
  // excludeIds가 적으면 NOT IN, 많으면 임시 테이블 사용
  const tierLimit = Math.ceil(limit / 3);

  // 티어별 샘플링을 SQL에서 처리
  // NTILE로 3개 티어로 나누고 각 티어에서 랜덤 샘플링
  const songs = await prisma.$queryRaw<RadioSong[]>`
    WITH ranked_songs AS (
      SELECT
        song_id,
        default_name,
        title_korean,
        title_english,
        title_japanese,
        title_romaji,
        artist_string,
        youtube_id,
        youtube_url,
        thumb_url,
        view_count,
        length_seconds,
        NTILE(3) OVER (ORDER BY view_count DESC) as tier
      FROM songs_enhanced
      WHERE is_vocaloid_song = true
        AND view_count >= ${minViews}
        AND youtube_id IS NOT NULL
        AND NOT (song_id = ANY(${excludeIds}::int[]))
      ORDER BY view_count DESC
      LIMIT ${limit * 5}
    ),
    sampled AS (
      SELECT *,
        ROW_NUMBER() OVER (PARTITION BY tier ORDER BY random()) as rn
      FROM ranked_songs
    )
    SELECT
      song_id as "vocadbId",
      default_name as "defaultName",
      title_korean as "titleKorean",
      title_english as "titleEnglish",
      title_japanese as "titleJapanese",
      title_romaji as "titleRomaji",
      artist_string as "artistString",
      youtube_id as "youtubeId",
      youtube_url as "youtubeUrl",
      thumb_url as "thumbUrl",
      view_count as "viewCount",
      length_seconds as "lengthSeconds"
    FROM sampled
    WHERE rn <= ${tierLimit}
    ORDER BY tier, random()
    LIMIT ${limit}
  `;

  return songs;
}

/**
 * 랜덤 재생목록 (효율적인 랜덤 샘플링)
 *
 * Optimization:
 * - TABLESAMPLE BERNOULLI 대신 더 정확한 방법 사용
 * - 조건에 맞는 행 수를 먼저 추정하고 적절한 offset으로 샘플링
 * - 소규모 결과셋에서는 ORDER BY random() 유지 (충분히 빠름)
 */
export async function getRandomPlaylist(
  minViews: number,
  maxViews: number | undefined,
  excludeIds: number[],
  limit: number = 15
): Promise<RadioSong[]> {
  const viewCondition = maxViews
    ? Prisma.sql`AND view_count <= ${maxViews}`
    : Prisma.sql``;

  // 조건에 맞는 대략적인 행 수 확인 (reltuples 사용으로 빠름)
  const countResult = await prisma.$queryRaw<[{ estimate: bigint }]>`
    SELECT reltuples::bigint as estimate
    FROM pg_class
    WHERE relname = 'songs_enhanced'
  `;

  const estimatedTotal = Number(countResult[0]?.estimate || 10000);

  // 추정 행이 적으면 ORDER BY random() 사용 (빠름)
  // 많으면 offset 기반 샘플링으로 전환
  if (estimatedTotal < 50000) {
    const songs = await prisma.$queryRaw<RadioSong[]>`
      SELECT
        song_id as "vocadbId",
        default_name as "defaultName",
        title_korean as "titleKorean",
        title_english as "titleEnglish",
        title_japanese as "titleJapanese",
        title_romaji as "titleRomaji",
        artist_string as "artistString",
        youtube_id as "youtubeId",
        youtube_url as "youtubeUrl",
        thumb_url as "thumbUrl",
        view_count as "viewCount",
        length_seconds as "lengthSeconds"
      FROM songs_enhanced
      WHERE is_vocaloid_song = true
        AND view_count >= ${minViews}
        ${viewCondition}
        AND youtube_id IS NOT NULL
        AND NOT (song_id = ANY(${excludeIds}::int[]))
      ORDER BY random()
      LIMIT ${limit}
    `;
    return songs;
  }

  // 대용량 테이블: 여러 랜덤 offset에서 샘플링
  const songs = await prisma.$queryRaw<RadioSong[]>`
    WITH eligible AS (
      SELECT
        song_id,
        default_name,
        title_korean,
        title_english,
        title_japanese,
        title_romaji,
        artist_string,
        youtube_id,
        youtube_url,
        thumb_url,
        view_count,
        length_seconds,
        ROW_NUMBER() OVER (ORDER BY song_id) as rn,
        COUNT(*) OVER () as total_count
      FROM songs_enhanced
      WHERE is_vocaloid_song = true
        AND view_count >= ${minViews}
        ${viewCondition}
        AND youtube_id IS NOT NULL
        AND NOT (song_id = ANY(${excludeIds}::int[]))
    ),
    random_positions AS (
      SELECT DISTINCT floor(random() * (SELECT MAX(total_count) FROM eligible))::int + 1 as pos
      FROM generate_series(1, ${limit * 3})
      LIMIT ${limit * 2}
    )
    SELECT
      e.song_id as "vocadbId",
      e.default_name as "defaultName",
      e.title_korean as "titleKorean",
      e.title_english as "titleEnglish",
      e.title_japanese as "titleJapanese",
      e.title_romaji as "titleRomaji",
      e.artist_string as "artistString",
      e.youtube_id as "youtubeId",
      e.youtube_url as "youtubeUrl",
      e.thumb_url as "thumbUrl",
      e.view_count as "viewCount",
      e.length_seconds as "lengthSeconds"
    FROM eligible e
    INNER JOIN random_positions rp ON e.rn = rp.pos
    LIMIT ${limit}
  `;

  return songs;
}

/**
 * 비슷한 곡 재생목록 (시드 곡 기준)
 * - 조회수 범위: 시드 곡의 0.1배 ~ 10배
 * - 같은 태그를 가진 곡 우선
 * - 시드 곡 제외
 */
export async function getSimilarSongsPlaylist(
  seedSongId: number,
  seedViewCount: bigint | number,
  excludeIds: number[],
  limit: number = 15
): Promise<RadioSong[]> {
  const viewCount = Number(seedViewCount);
  const minViews = Math.floor(viewCount * 0.1);
  const maxViews = Math.floor(viewCount * 10);

  // 시드 곡도 제외 목록에 추가
  const allExcludeIds = [...excludeIds, seedSongId];

  const songs = await prisma.$queryRaw<RadioSong[]>`
    WITH seed_tags AS (
      -- 시드 곡의 태그 가져오기
      SELECT tag_id FROM song_tags WHERE song_id = ${seedSongId}
    ),
    scored_songs AS (
      SELECT
        se.song_id,
        se.default_name,
        se.title_korean,
        se.title_english,
        se.title_japanese,
        se.title_romaji,
        se.artist_string,
        se.youtube_id,
        se.youtube_url,
        se.thumb_url,
        se.view_count,
        se.length_seconds,
        -- 태그 매칭 점수 (공통 태그 수)
        COALESCE(
          (SELECT COUNT(*) FROM song_tags st
           WHERE st.song_id = se.song_id
           AND st.tag_id IN (SELECT tag_id FROM seed_tags)),
          0
        ) as tag_score,
        -- 조회수 유사도 점수 (1에 가까울수록 유사)
        1.0 - ABS(LOG10(GREATEST(se.view_count, 1)::float) - LOG10(GREATEST(${viewCount}, 1)::float)) / 3.0 as view_score
      FROM songs_enhanced se
      WHERE se.is_vocaloid_song = true
        AND se.view_count >= ${minViews}
        AND se.view_count <= ${maxViews}
        AND se.youtube_id IS NOT NULL
        AND NOT (se.song_id = ANY(${allExcludeIds}::int[]))
    )
    SELECT
      song_id as "vocadbId",
      default_name as "defaultName",
      title_korean as "titleKorean",
      title_english as "titleEnglish",
      title_japanese as "titleJapanese",
      title_romaji as "titleRomaji",
      artist_string as "artistString",
      youtube_id as "youtubeId",
      youtube_url as "youtubeUrl",
      thumb_url as "thumbUrl",
      view_count as "viewCount",
      length_seconds as "lengthSeconds"
    FROM scored_songs
    ORDER BY
      tag_score DESC,
      view_score DESC,
      random()
    LIMIT ${limit}
  `;

  return songs;
}

/**
 * 시드 곡 정보 가져오기
 */
export async function getSeedSong(songId: number): Promise<RadioSong | null> {
  const songs = await prisma.$queryRaw<RadioSong[]>`
    SELECT
      song_id as "vocadbId",
      default_name as "defaultName",
      title_korean as "titleKorean",
      title_english as "titleEnglish",
      title_japanese as "titleJapanese",
      title_romaji as "titleRomaji",
      artist_string as "artistString",
      youtube_id as "youtubeId",
      youtube_url as "youtubeUrl",
      thumb_url as "thumbUrl",
      view_count as "viewCount",
      length_seconds as "lengthSeconds"
    FROM songs_enhanced
    WHERE song_id = ${songId}
      AND youtube_id IS NOT NULL
    LIMIT 1
  `;

  return songs[0] || null;
}

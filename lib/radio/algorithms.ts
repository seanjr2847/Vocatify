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
 * 유사도 가중치 설정
 * 총합 = 1.0 (100%)
 */
const SIMILARITY_WEIGHTS = {
  sameProducer: 0.30, // 같은 프로듀서 (최고 가중치)
  sameVocalist: 0.15, // 같은 보컬리스트
  tagMood: 0.20, // 분위기 태그 (Sad, Happy, Dark 등)
  tagGenre: 0.10, // 장르 태그 (Rock, Electronic 등)
  tagOther: 0.05, // 기타 태그
  viewSimilarity: 0.08, // 조회수 유사성
  lengthSimilarity: 0.05, // 길이 유사성
  dateSimilarity: 0.05, // 발매일 유사성
  qualityBonus: 0.02, // 품질 보너스 (favorited + rating)
};

/**
 * 비슷한 곡 재생목록 (시드 곡 기준)
 *
 * 9개 요소 복합 점수 시스템:
 * 1. 같은 프로듀서 (30%) - 가장 강력한 유사성 지표
 * 2. 같은 보컬리스트 (15%) - 음색 유사성
 * 3. 분위기 태그 매칭 (20%) - Sad, Happy, Dark 등
 * 4. 장르 태그 매칭 (10%) - Rock, Electronic 등
 * 5. 기타 태그 매칭 (5%)
 * 6. 조회수 유사성 (8%) - 비슷한 인기도
 * 7. 곡 길이 유사성 (5%) - 비슷한 길이
 * 8. 발매일 유사성 (5%) - 같은 시기
 * 9. 품질 점수 (2%) - favorited + rating
 */
export async function getSimilarSongsPlaylist(
  seedSongId: number,
  seedViewCount: bigint | number,
  excludeIds: number[],
  limit: number = 15
): Promise<RadioSong[]> {
  const viewCount = Number(seedViewCount);
  // 조회수 범위를 넓혀서 더 많은 후보 확보
  const minViews = Math.floor(viewCount * 0.05);
  const maxViews = Math.floor(viewCount * 20);

  // 시드 곡도 제외 목록에 추가
  const allExcludeIds = [...excludeIds, seedSongId];

  const songs = await prisma.$queryRaw<RadioSong[]>`
    WITH
    -- 시드 곡의 프로듀서 목록 (Producer, Composer 등)
    seed_producers AS (
      SELECT DISTINCT sa.artist_id
      FROM song_artists sa
      WHERE sa.song_id = ${seedSongId}
        AND sa.is_support = false
        AND (
          sa.categories LIKE '%Producer%'
          OR sa.roles LIKE '%Composer%'
          OR sa.roles LIKE '%Arranger%'
        )
    ),

    -- 시드 곡의 보컬리스트 목록 (Vocalist, Vocaloid 등)
    seed_vocalists AS (
      SELECT DISTINCT sa.artist_id
      FROM song_artists sa
      JOIN artists a ON sa.artist_id = a.vocadb_id
      WHERE sa.song_id = ${seedSongId}
        AND (
          sa.categories LIKE '%Vocalist%'
          OR a.artist_type = 'Vocaloid'
          OR a.artist_type = 'UTAU'
          OR a.artist_type = 'CeVIO'
          OR a.artist_type = 'SynthesizerV'
        )
    ),

    -- 시드 곡의 태그 (카테고리별 분류)
    seed_tags AS (
      SELECT
        st.tag_id,
        t.category_name,
        t.name as tag_name
      FROM song_tags st
      JOIN tags t ON st.tag_id = t.vocadb_id
      WHERE st.song_id = ${seedSongId}
    ),

    -- 시드 곡 메타데이터
    seed_meta AS (
      SELECT
        se.length_seconds,
        se.publish_date
      FROM songs_enhanced se
      WHERE se.song_id = ${seedSongId}
    ),

    -- 후보 곡들에 점수 부여
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
        se.favorited_times,
        se.rating_score,
        se.publish_date,

        -- 1. 프로듀서 매칭 (0 or 1)
        CASE WHEN EXISTS (
          SELECT 1 FROM song_artists sa
          WHERE sa.song_id = se.song_id
            AND sa.is_support = false
            AND sa.artist_id IN (SELECT artist_id FROM seed_producers)
        ) THEN 1.0 ELSE 0.0 END as producer_match,

        -- 2. 보컬리스트 매칭 (0 or 1)
        CASE WHEN EXISTS (
          SELECT 1 FROM song_artists sa
          WHERE sa.song_id = se.song_id
            AND sa.artist_id IN (SELECT artist_id FROM seed_vocalists)
        ) THEN 1.0 ELSE 0.0 END as vocalist_match,

        -- 3. 분위기(Mood) 태그 점수 (0~1, 정규화됨)
        COALESCE(
          (SELECT COUNT(*)::float / GREATEST((SELECT COUNT(*) FROM seed_tags WHERE category_name IN ('Moods', 'Themes')), 1)
           FROM song_tags st
           JOIN tags t ON st.tag_id = t.vocadb_id
           WHERE st.song_id = se.song_id
             AND t.category_name IN ('Moods', 'Themes')
             AND st.tag_id IN (SELECT tag_id FROM seed_tags WHERE category_name IN ('Moods', 'Themes'))),
          0.0
        ) as mood_score,

        -- 4. 장르(Genre) 태그 점수 (0~1, 정규화됨)
        COALESCE(
          (SELECT COUNT(*)::float / GREATEST((SELECT COUNT(*) FROM seed_tags WHERE category_name IN ('Genres', 'Instrumentation')), 1)
           FROM song_tags st
           JOIN tags t ON st.tag_id = t.vocadb_id
           WHERE st.song_id = se.song_id
             AND t.category_name IN ('Genres', 'Instrumentation')
             AND st.tag_id IN (SELECT tag_id FROM seed_tags WHERE category_name IN ('Genres', 'Instrumentation'))),
          0.0
        ) as genre_score,

        -- 5. 기타 태그 점수 (0~1, 정규화됨)
        COALESCE(
          (SELECT COUNT(*)::float / GREATEST((SELECT COUNT(*) FROM seed_tags WHERE category_name NOT IN ('Moods', 'Themes', 'Genres', 'Instrumentation') OR category_name IS NULL), 1)
           FROM song_tags st
           JOIN tags t ON st.tag_id = t.vocadb_id
           WHERE st.song_id = se.song_id
             AND (t.category_name NOT IN ('Moods', 'Themes', 'Genres', 'Instrumentation') OR t.category_name IS NULL)
             AND st.tag_id IN (SELECT tag_id FROM seed_tags WHERE category_name NOT IN ('Moods', 'Themes', 'Genres', 'Instrumentation') OR category_name IS NULL)),
          0.0
        ) as other_tag_score,

        -- 6. 조회수 유사도 (0~1, log 스케일 거리 기반)
        GREATEST(0.0, 1.0 - ABS(LOG10(GREATEST(se.view_count, 1)::float) - LOG10(GREATEST(${viewCount}, 1)::float)) / 4.0) as view_score,

        -- 7. 길이 유사도 (0~1, ±60초 이내면 고득점)
        CASE
          WHEN se.length_seconds IS NULL OR (SELECT length_seconds FROM seed_meta) IS NULL THEN 0.5
          ELSE GREATEST(0.0, 1.0 - ABS(se.length_seconds - COALESCE((SELECT length_seconds FROM seed_meta), se.length_seconds))::float / 120.0)
        END as length_score,

        -- 8. 발매일 유사도 (0~1, ±1년 이내면 고득점)
        CASE
          WHEN se.publish_date IS NULL OR (SELECT publish_date FROM seed_meta) IS NULL THEN 0.5
          ELSE GREATEST(0.0, 1.0 - ABS(EXTRACT(EPOCH FROM (se.publish_date::timestamp - (SELECT publish_date FROM seed_meta)::timestamp))::float / (365.25 * 24.0 * 3600.0)) / 3.0)
        END as date_score,

        -- 9. 품질 점수 (0~1, favorited와 rating 정규화)
        LEAST(1.0, (se.favorited_times::float / 1000.0 + se.rating_score::float / 100.0) / 2.0) as quality_score

      FROM songs_enhanced se
      WHERE se.is_vocaloid_song = true
        AND se.view_count >= ${minViews}
        AND se.view_count <= ${maxViews}
        AND se.youtube_id IS NOT NULL
        AND NOT (se.song_id = ANY(${allExcludeIds}::int[]))
    ),

    -- 가중치 적용하여 최종 점수 계산
    final_scored AS (
      SELECT
        *,
        (
          producer_match * ${SIMILARITY_WEIGHTS.sameProducer} +
          vocalist_match * ${SIMILARITY_WEIGHTS.sameVocalist} +
          mood_score * ${SIMILARITY_WEIGHTS.tagMood} +
          genre_score * ${SIMILARITY_WEIGHTS.tagGenre} +
          other_tag_score * ${SIMILARITY_WEIGHTS.tagOther} +
          view_score * ${SIMILARITY_WEIGHTS.viewSimilarity} +
          length_score * ${SIMILARITY_WEIGHTS.lengthSimilarity} +
          date_score * ${SIMILARITY_WEIGHTS.dateSimilarity} +
          quality_score * ${SIMILARITY_WEIGHTS.qualityBonus}
        ) as similarity_score
      FROM scored_songs
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
    FROM final_scored
    ORDER BY
      similarity_score DESC,
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

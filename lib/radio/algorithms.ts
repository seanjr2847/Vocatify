import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * 태그 기반 곡 추천 알고리즘
 * 점수 = (태그매칭*0.5 + log(조회수)*0.3 + 인기도*0.15 + 평점*0.05)
 */
export async function getTagBasedPlaylist(
  tags: string[],
  excludeIds: number[],
  limit: number = 10
) {
  // 1단계: 태그 ID 조회
  const tagRecords = await prisma.tags.findMany({
    where: { name: { in: tags } },
    select: { vocadb_id: true }
  });
  const tagIds = tagRecords.map(t => t.vocadb_id);

  if (tagIds.length === 0) {
    // 태그 없으면 인기곡으로 대체
    return getPopularPlaylist(excludeIds, limit);
  }

  // 2단계: 태그 점수 계산 (CTE) - 최적화: FILTER 사용
  const query = Prisma.sql`
    WITH tag_matches AS (
      SELECT
        song_id,
        COUNT(*) FILTER (WHERE tag_id = ANY(${tagIds}::int[])) as matched_tags,
        SUM(count) FILTER (WHERE tag_id = ANY(${tagIds}::int[])) as tag_weight
      FROM song_tags
      WHERE song_id != ALL(${excludeIds}::int[])
        AND tag_id = ANY(${tagIds}::int[])
      GROUP BY song_id
      HAVING COUNT(*) FILTER (WHERE tag_id = ANY(${tagIds}::int[])) > 0
    ),
    combined_scores AS (
      SELECT
        s.song_id as vocadb_id,
        s.default_name,
        s.title_korean,
        s.title_english,
        s.title_japanese,
        s.title_romaji,
        s.artist_string,
        s.youtube_id,
        s.thumb_url,
        s.view_count,
        s.favorited_times,
        s.rating_score,
        s.publish_date,
        (
          tm.tag_weight * 0.5 +
          LOG(GREATEST(s.view_count::numeric / 1000000, 1)) * 0.3 +
          s.favorited_times * 0.00015 +
          s.rating_score / 100.0 * 0.05
        ) as final_score
      FROM tag_matches tm
      JOIN songs_enhanced s ON tm.song_id = s.song_id
      WHERE s.view_count > 5000 AND s.is_vocaloid_song = true
    )
    SELECT * FROM combined_scores
    ORDER BY
      CASE
        WHEN final_score >= 8 THEN 1
        WHEN final_score >= 5 THEN 2
        ELSE 3
      END,
      RANDOM()
    LIMIT ${limit};
  `;

  return prisma.$queryRaw(query);
}

/**
 * 랭킹 기반 재생목록
 */
export async function getRankingPlaylist(
  rankingType: 'weekly' | 'daily' | 'total',
  excludeIds: number[],
  limit: number = 10
) {
  const cached = await prisma.ranking_cache.findMany({
    where: {
      ranking_type: rankingType,
      rank: { lte: 100 },
      song_id: { notIn: excludeIds }
    },
    take: limit * 3, // 3배 가져와서 랜덤화
    orderBy: { rank: 'asc' }
  });

  // 티어별 랜덤화
  const tier1 = cached.filter((c) => c.rank <= 30);
  const tier2 = cached.filter((c) => c.rank > 30 && c.rank <= 70);
  const tier3 = cached.filter((c) => c.rank > 70);

  const shuffled = [
    ...shuffle(tier1),
    ...shuffle(tier2),
    ...shuffle(tier3)
  ].slice(0, limit);

  // 전체 곡 정보 가져오기 (songs_enhanced 사용)
  const songIds = shuffled.map((s) => s.song_id);
  return prisma.songs_enhanced.findMany({
    where: { song_id: { in: songIds } },
    select: {
      song_id: true,
      default_name: true,
      title_korean: true,
      title_english: true,
      title_japanese: true,
      title_romaji: true,
      artist_string: true,
      youtube_id: true,
      youtube_url: true,
      thumb_url: true,
      view_count: true,
      favorited_times: true,
      rating_score: true,
      publish_date: true,
      length_seconds: true,
    }
  });
}

/**
 * 인기곡 플레이리스트 (태그 매칭 실패시 대체)
 */
export async function getPopularPlaylist(
  excludeIds: number[],
  limit: number = 10
) {
  // ranking_cache에서 인기곡 가져오기
  const cached = await prisma.ranking_cache.findMany({
    where: {
      ranking_type: 'total',
      rank: { lte: 200 },
      song_id: { notIn: excludeIds },
      view_count: { gt: 100000 }
    },
    take: limit * 2,
    orderBy: { rank: 'asc' }
  });

  // 랜덤 셔플
  const shuffled = shuffle(cached).slice(0, limit);

  // 전체 곡 정보 가져오기 (songs_enhanced 사용)
  const songIds = shuffled.map((s) => s.song_id);
  return prisma.songs_enhanced.findMany({
    where: { song_id: { in: songIds } },
    select: {
      song_id: true,
      default_name: true,
      title_korean: true,
      title_english: true,
      title_japanese: true,
      title_romaji: true,
      artist_string: true,
      youtube_id: true,
      youtube_url: true,
      thumb_url: true,
      view_count: true,
      favorited_times: true,
      rating_score: true,
      publish_date: true,
      length_seconds: true,
    }
  });
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

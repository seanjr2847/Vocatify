/**
 * Batch Upsert Utilities for PostgreSQL
 *
 * Uses raw SQL with INSERT ... ON CONFLICT for bulk operations
 * Significantly faster than individual Prisma upserts
 */

import { PrismaClient, Prisma } from '@prisma/client';

// Chunk size to avoid Neon memory limits
const CHUNK_SIZE = 25;

/**
 * Helper to chunk arrays
 */
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Batch upsert songs
 */
export async function batchUpsertSongs(
  prisma: PrismaClient,
  songs: Array<{
    vocadb_id: number;
    default_name: string;
    song_type: string | null;
    publish_date: Date | null;
    create_date: Date | null;
    length_seconds: number | null;
    favorited_times: number;
    rating_score: number;
    thumb_url: string | null;
    thumb_url_small: string | null;
  }>
): Promise<void> {
  if (songs.length === 0) return;

  const chunks = chunk(songs, CHUNK_SIZE);
  for (const batch of chunks) {
    const values = batch.map(s => Prisma.sql`(
      ${s.vocadb_id}, ${s.default_name}, ${s.song_type}, ${s.publish_date}, ${s.create_date},
      ${s.length_seconds}, ${s.favorited_times}, ${s.rating_score}, ${s.thumb_url}, ${s.thumb_url_small}, NOW()
    )`);

    await prisma.$executeRaw`
      INSERT INTO songs (vocadb_id, default_name, song_type, publish_date, create_date,
                         length_seconds, favorited_times, rating_score, thumb_url, thumb_url_small, crawled_at)
      VALUES ${Prisma.join(values)}
      ON CONFLICT (vocadb_id) DO UPDATE SET
        default_name = EXCLUDED.default_name,
        song_type = EXCLUDED.song_type,
        publish_date = EXCLUDED.publish_date,
        create_date = EXCLUDED.create_date,
        length_seconds = EXCLUDED.length_seconds,
        favorited_times = EXCLUDED.favorited_times,
        rating_score = EXCLUDED.rating_score,
        thumb_url = EXCLUDED.thumb_url,
        thumb_url_small = EXCLUDED.thumb_url_small,
        crawled_at = EXCLUDED.crawled_at
    `;
  }
}

/**
 * Batch upsert song names
 */
export async function batchUpsertSongNames(
  prisma: PrismaClient,
  names: Array<{ song_id: number; language: string; value: string }>
): Promise<void> {
  if (names.length === 0) return;

  const chunks = chunk(names, CHUNK_SIZE * 2);
  for (const batch of chunks) {
    const values = batch.map(n => Prisma.sql`(${n.song_id}, ${n.language}, ${n.value})`);

    await prisma.$executeRaw`
      INSERT INTO song_names (song_id, language, value)
      VALUES ${Prisma.join(values)}
      ON CONFLICT (song_id, language) DO UPDATE SET value = EXCLUDED.value
    `;
  }
}

/**
 * Batch upsert artists (master table)
 */
export async function batchUpsertArtists(
  prisma: PrismaClient,
  artists: Array<{
    vocadb_id: number;
    name: string;
    artist_type: string;
    thumb_url: string | null;
  }>
): Promise<void> {
  if (artists.length === 0) return;

  // Deduplicate by vocadb_id
  const uniqueArtists = Array.from(
    new Map(artists.map(a => [a.vocadb_id, a])).values()
  );

  const chunks = chunk(uniqueArtists, CHUNK_SIZE);
  for (const batch of chunks) {
    const values = batch.map(a => Prisma.sql`(${a.vocadb_id}, ${a.name}, ${a.artist_type}, ${a.thumb_url})`);

    await prisma.$executeRaw`
      INSERT INTO artists (vocadb_id, name, artist_type, thumb_url)
      VALUES ${Prisma.join(values)}
      ON CONFLICT (vocadb_id) DO UPDATE SET
        name = EXCLUDED.name,
        artist_type = EXCLUDED.artist_type,
        thumb_url = EXCLUDED.thumb_url
    `;
  }
}

/**
 * Batch upsert song-artist relationships
 */
export async function batchUpsertSongArtists(
  prisma: PrismaClient,
  songArtists: Array<{
    song_id: number;
    artist_id: number;
    categories: string;
    roles: string | null;
    is_support: boolean;
    name: string | null;
  }>
): Promise<void> {
  if (songArtists.length === 0) return;

  const chunks = chunk(songArtists, CHUNK_SIZE * 2);
  for (const batch of chunks) {
    const values = batch.map(sa => Prisma.sql`(
      ${sa.song_id}, ${sa.artist_id}, ${sa.categories}, ${sa.roles}, ${sa.is_support}, ${sa.name}
    )`);

    await prisma.$executeRaw`
      INSERT INTO song_artists (song_id, artist_id, categories, roles, is_support, name)
      VALUES ${Prisma.join(values)}
      ON CONFLICT (song_id, artist_id) DO UPDATE SET
        categories = EXCLUDED.categories,
        roles = EXCLUDED.roles,
        is_support = EXCLUDED.is_support,
        name = EXCLUDED.name
    `;
  }
}

/**
 * Batch upsert PVs
 */
export async function batchUpsertPVs(
  prisma: PrismaClient,
  pvs: Array<{
    song_id: number;
    pv_id: string;
    service: string;
    pv_type: string;
    name: string | null;
    url: string;
    thumb_url: string | null;
    disabled: boolean;
  }>
): Promise<void> {
  if (pvs.length === 0) return;

  const chunks = chunk(pvs, CHUNK_SIZE * 2);
  for (const batch of chunks) {
    const values = batch.map(p => Prisma.sql`(
      ${p.song_id}, ${p.pv_id}, ${p.service}, ${p.pv_type}, ${p.name}, ${p.url}, ${p.thumb_url}, ${p.disabled}
    )`);

    await prisma.$executeRaw`
      INSERT INTO pvs (song_id, pv_id, service, pv_type, name, url, thumb_url, disabled)
      VALUES ${Prisma.join(values)}
      ON CONFLICT (song_id, service, pv_id) DO UPDATE SET
        pv_type = EXCLUDED.pv_type,
        name = EXCLUDED.name,
        url = EXCLUDED.url,
        thumb_url = EXCLUDED.thumb_url,
        disabled = EXCLUDED.disabled
    `;
  }
}

/**
 * Batch upsert tags (master table)
 */
export async function batchUpsertTags(
  prisma: PrismaClient,
  tags: Array<{
    vocadb_id: number;
    name: string;
    category_name: string | null;
  }>
): Promise<void> {
  if (tags.length === 0) return;

  // Deduplicate by vocadb_id
  const uniqueTags = Array.from(
    new Map(tags.map(t => [t.vocadb_id, t])).values()
  );

  const chunks = chunk(uniqueTags, CHUNK_SIZE * 2);
  for (const batch of chunks) {
    const values = batch.map(t => Prisma.sql`(${t.vocadb_id}, ${t.name}, ${t.category_name})`);

    await prisma.$executeRaw`
      INSERT INTO tags (vocadb_id, name, category_name)
      VALUES ${Prisma.join(values)}
      ON CONFLICT (vocadb_id) DO UPDATE SET
        name = EXCLUDED.name,
        category_name = EXCLUDED.category_name
    `;
  }
}

/**
 * Batch upsert song-tag relationships
 */
export async function batchUpsertSongTags(
  prisma: PrismaClient,
  songTags: Array<{
    song_id: number;
    tag_id: number;
    count: number;
  }>
): Promise<void> {
  if (songTags.length === 0) return;

  const chunks = chunk(songTags, CHUNK_SIZE * 2);
  for (const batch of chunks) {
    const values = batch.map(st => Prisma.sql`(${st.song_id}, ${st.tag_id}, ${st.count})`);

    await prisma.$executeRaw`
      INSERT INTO song_tags (song_id, tag_id, count)
      VALUES ${Prisma.join(values)}
      ON CONFLICT (song_id, tag_id) DO UPDATE SET count = EXCLUDED.count
    `;
  }
}

/**
 * Batch create lyrics (delete existing first, then bulk insert)
 */
export async function batchReplaceLyrics(
  prisma: PrismaClient,
  songIds: number[],
  lyrics: Array<{
    song_id: number;
    translation_type: string;
    culture_code: string | null;
    source: string | null;
    url: string | null;
    value: string | null;
  }>
): Promise<void> {
  if (songIds.length === 0) return;

  // Delete existing lyrics for these songs
  await prisma.lyrics.deleteMany({
    where: { song_id: { in: songIds } },
  });

  if (lyrics.length === 0) return;

  // Bulk insert new lyrics
  await prisma.lyrics.createMany({
    data: lyrics,
    skipDuplicates: true,
  });
}

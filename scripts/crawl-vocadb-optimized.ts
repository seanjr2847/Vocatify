import { PrismaClient } from '@prisma/client';
import fs from 'fs';

// Configuration
const TOTAL_SONGS_ESTIMATE = 1000000;  // Increased to 1M to ensure we get all songs
const BATCH_SIZE = 100;
const API_PARALLEL = 10;  // Fetch 10 batches concurrently
const DB_PARALLEL = 10;   // Process 10 songs concurrently (reduced for memory safety)
const EXCLUDED_TAGS = ['human singers', 'out of scope (cover unifier)'];
const CHECKPOINT_FILE = 'vocadb-progress.json';

// Types
interface Checkpoint {
  offset: number;
  processed: number;
  inserted: number;
  skipped: number;
  timestamp: string;
}

interface SongData {
  id: number;
  name: string;
  defaultName: string;
  names?: Array<{ language: string; value: string }>;
  pvs?: Array<{ service: string; pvId: string; pvType: string; name?: string; url?: string; thumbUrl?: string }>;
  artists?: Array<{
    artist: { id: number; name: string; artistType?: string };
    roles?: string;
    categories?: string;
    isSupport?: boolean;
    name?: string;
  }>;
  tags?: Array<{ tag: { id: number; name: string }; count?: number }>;
  lyrics?: Array<{
    language: string;
    value: string;
    source?: string;
    translationType?: string;
    cultureCode?: string;
    url?: string;
  }>;
  songType: string;
  publishDate?: string;
  createDate?: string;
  lengthSeconds?: number;
  favoritedTimes?: number;
  ratingScore?: number;
  thumbUrl?: string;
}

// Checkpoint management
function loadCheckpoint(): Checkpoint {
  try {
    if (fs.existsSync(CHECKPOINT_FILE)) {
      return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf-8'));
    }
  } catch (error) {
    console.log('⚠️  Could not load checkpoint, starting fresh');
  }
  return { offset: 0, processed: 0, inserted: 0, skipped: 0, timestamp: new Date().toISOString() };
}

function saveCheckpoint(checkpoint: Checkpoint) {
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));
}

// Parallel API fetching
async function fetchVocaDBBatch(start: number): Promise<SongData[]> {
  const url = `https://vocadb.net/api/songs?` +
    `start=${start}&maxResults=${BATCH_SIZE}&` +
    `getTotalCount=false&` +
    `fields=Artists,Names,PVs,Tags,Lyrics,ThumbUrl,MainPicture,AdditionalNames&` +
    `songTypes=Original&` +
    `sort=AdditionDate&` +
    `artistType=Vocaloid`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`VocaDB API error: ${response.status} at offset ${start}`);
  }

  const data = await response.json();
  return data.items || [];
}

async function fetchParallelBatches(offsets: number[]): Promise<SongData[]> {
  const promises = offsets.map(offset =>
    fetchVocaDBBatch(offset)
      .catch(error => {
        console.error(`❌ Fetch failed at offset ${offset}:`, error.message);
        return [];
      })
  );

  const results = await Promise.all(promises);
  return results.flat();
}

// Song filtering
function shouldSkipSong(song: SongData): boolean {
  // Skip: No PVs
  if (!song.pvs || song.pvs.length === 0) {
    return true;
  }

  // Skip: Excluded tags
  const tags = song.tags?.map(t => t.tag?.name).filter(Boolean) || [];
  const hasExcludedTag = tags.some(tag =>
    EXCLUDED_TAGS.some(excluded => tag.toLowerCase() === excluded.toLowerCase())
  );

  return hasExcludedTag;
}

// Batch upsert artists (PostgreSQL supports skipDuplicates)
async function upsertArtistsBatch(artists: Array<{ vocadbId: number; name: string; artistType: string }>, prisma: PrismaClient) {
  if (artists.length === 0) return;

  // Split into chunks of 1000 to avoid query size limits
  const chunkSize = 1000;
  for (let i = 0; i < artists.length; i += chunkSize) {
    const chunk = artists.slice(i, i + chunkSize);
    await prisma.artist.createMany({
      data: chunk.map(a => ({
        vocadbId: a.vocadbId,
        name: a.name,
        artistType: a.artistType,
        thumbUrl: null
      })),
      skipDuplicates: true
    });
  }
}

// Batch upsert tags (PostgreSQL supports skipDuplicates)
async function upsertTagsBatch(tags: Array<{ vocadbId: number; name: string }>, prisma: PrismaClient) {
  if (tags.length === 0) return;

  // Split into chunks of 1000 to avoid query size limits
  const chunkSize = 1000;
  for (let i = 0; i < tags.length; i += chunkSize) {
    const chunk = tags.slice(i, i + chunkSize);
    await prisma.tag.createMany({
      data: chunk.map(t => ({
        vocadbId: t.vocadbId,
        name: t.name
      })),
      skipDuplicates: true
    });
  }
}

// Fast song processing (artists/tags already exist)
async function processSong(song: SongData, prisma: PrismaClient): Promise<boolean> {
  try {
    await prisma.$transaction(async (tx) => {
      // 1. Upsert Song
      await tx.song.upsert({
        where: { vocadbId: song.id },
        create: {
          vocadbId: song.id,
          defaultName: song.defaultName || song.name,
          songType: song.songType || 'Original',
          publishDate: song.publishDate ? new Date(song.publishDate) : null,
          createDate: song.createDate ? new Date(song.createDate) : null,
          lengthSeconds: song.lengthSeconds,
          favoritedTimes: song.favoritedTimes || 0,
          ratingScore: song.ratingScore || 0,
          thumbUrl: song.thumbUrl,
          thumbUrlSmall: song.thumbUrl,
          crawledAt: new Date()
        },
        update: {
          defaultName: song.defaultName || song.name,
          songType: song.songType || 'Original',
          publishDate: song.publishDate ? new Date(song.publishDate) : null,
          createDate: song.createDate ? new Date(song.createDate) : null,
          lengthSeconds: song.lengthSeconds,
          favoritedTimes: song.favoritedTimes || 0,
          ratingScore: song.ratingScore || 0,
          thumbUrl: song.thumbUrl,
          thumbUrlSmall: song.thumbUrl,
          crawledAt: new Date()
        }
      });

      // 2. Delete existing relations
      await Promise.all([
        tx.songName.deleteMany({ where: { songId: song.id } }),
        tx.pV.deleteMany({ where: { songId: song.id } }),
        tx.songArtist.deleteMany({ where: { songId: song.id } }),
        tx.songTag.deleteMany({ where: { songId: song.id } }),
        tx.lyrics.deleteMany({ where: { songId: song.id } })
      ]);

      // 3. Insert SongNames (deduplicate by language)
      if (song.names?.length) {
        const uniqueNames = Array.from(
          new Map(song.names.map(n => [n.language, n])).values()
        );
        await tx.songName.createMany({
          data: uniqueNames.map(n => ({ songId: song.id, language: n.language, value: n.value }))
        });
      }

      // 4. Insert PVs
      if (song.pvs?.length) {
        await tx.pV.createMany({
          data: song.pvs.map(pv => ({
            songId: song.id,
            service: pv.service,
            pvId: pv.pvId,
            pvType: pv.pvType,
            name: pv.name,
            url: pv.url,
            thumbUrl: pv.thumbUrl
          }))
        });
      }

      // 5. Insert SongArtists (artists already exist from batch)
      if (song.artists?.length) {
        const validArtists = song.artists.filter(a => a.artist?.id);
        if (validArtists.length > 0) {
          await tx.songArtist.createMany({
            data: validArtists.map(a => ({
              songId: song.id,
              artistId: a.artist.id,
              categories: a.categories || 'Vocalist',
              roles: a.roles,
              isSupport: a.isSupport || false,
              name: a.name
            }))
          });
        }
      }

      // 6. Insert SongTags (tags already exist from batch)
      if (song.tags?.length) {
        const validTags = song.tags.filter(t => t.tag?.id);
        if (validTags.length > 0) {
          await tx.songTag.createMany({
            data: validTags.map(t => ({
              songId: song.id,
              tagId: t.tag.id,
              count: t.count || 0
            }))
          });
        }
      }

      // 7. Insert Lyrics
      if (song.lyrics?.length) {
        await tx.lyrics.createMany({
          data: song.lyrics.map(l => ({
            songId: song.id,
            translationType: l.translationType || 'Original',
            cultureCode: l.cultureCode || l.language,
            source: l.source,
            url: l.url,
            value: l.value
          }))
        });
      }
    }, { timeout: 15000 }); // Reduced timeout since no individual upserts

    return true;
  } catch (error: any) {
    console.error(`❌ DB error for song ${song.id} (${song.name}):`, error.message);
    return false;
  }
}

async function processParallelSongs(songs: SongData[], prisma: PrismaClient): Promise<{ inserted: number; failed: number }> {
  // Step 1: Collect all unique artists and tags from all songs
  const artistMap = new Map<number, { vocadbId: number; name: string; artistType: string }>();
  const tagMap = new Map<number, { vocadbId: number; name: string }>();

  for (const song of songs) {
    if (song.artists?.length) {
      for (const artistLink of song.artists) {
        if (artistLink.artist?.id && !artistMap.has(artistLink.artist.id)) {
          artistMap.set(artistLink.artist.id, {
            vocadbId: artistLink.artist.id,
            name: artistLink.name || artistLink.artist.name,
            artistType: artistLink.artist.artistType || 'Vocaloid'
          });
        }
      }
    }

    if (song.tags?.length) {
      for (const tagUsage of song.tags) {
        if (tagUsage.tag?.id && !tagMap.has(tagUsage.tag.id)) {
          tagMap.set(tagUsage.tag.id, {
            vocadbId: tagUsage.tag.id,
            name: tagUsage.tag.name
          });
        }
      }
    }
  }

  // Step 2: Batch upsert all artists and tags
  console.log(`   📋 Upserting ${artistMap.size} unique artists and ${tagMap.size} unique tags...`);
  await upsertArtistsBatch(Array.from(artistMap.values()), prisma);
  console.log(`   ✅ Artists upserted`);
  await upsertTagsBatch(Array.from(tagMap.values()), prisma);
  console.log(`   ✅ Tags upserted`);

  // Step 3: Process songs in parallel (artists/tags already exist)
  const chunks: SongData[][] = [];
  for (let i = 0; i < songs.length; i += DB_PARALLEL) {
    chunks.push(songs.slice(i, i + DB_PARALLEL));
  }

  let inserted = 0;
  let failed = 0;

  console.log(`   🔄 Processing ${chunks.length} chunks of songs...`);
  for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
    const chunk = chunks[chunkIdx];
    const results = await Promise.all(
      chunk.map(song => processSong(song, prisma))
    );

    inserted += results.filter(r => r).length;
    failed += results.filter(r => !r).length;

    // Progress update every 10 chunks
    if ((chunkIdx + 1) % 10 === 0) {
      console.log(`   ⏳ Progress: ${chunkIdx + 1}/${chunks.length} chunks (${inserted} inserted, ${failed} failed)`);
    }
  }

  return { inserted, failed };
}

// Main crawler
async function crawl() {
  console.log('🚀 Starting Optimized VocaDB Crawler\n');
  console.log(`⚡ Parallel API calls: ${API_PARALLEL}`);
  console.log(`⚡ Parallel DB operations: ${DB_PARALLEL}\n`);

  const prisma = new PrismaClient();
  const checkpoint = loadCheckpoint();

  let offset = checkpoint.offset;
  let totalProcessed = checkpoint.processed;
  let totalInserted = checkpoint.inserted;
  let totalSkipped = checkpoint.skipped;

  const startTime = Date.now();

  try {
    while (offset < TOTAL_SONGS_ESTIMATE) {
      const batchNumber = Math.floor(offset / BATCH_SIZE) + 1;
      console.log(`\n📦 Batch Group #${Math.floor(batchNumber / API_PARALLEL) + 1} (offset: ${offset})`);

      // Fetch API_PARALLEL batches concurrently
      const offsets = Array.from({ length: API_PARALLEL }, (_, i) => offset + i * BATCH_SIZE);
      const songs = await fetchParallelBatches(offsets);

      if (songs.length === 0) {
        console.log('✅ No more songs - crawl completed!');
        break;
      }

      // Filter songs
      const validSongs = songs.filter(song => !shouldSkipSong(song));
      const skipped = songs.length - validSongs.length;

      console.log(`   Fetched: ${songs.length} songs`);
      console.log(`   Valid: ${validSongs.length} songs`);
      console.log(`   Skipped: ${skipped} songs`);

      // Process valid songs in parallel
      console.log(`   🔄 Processing ${validSongs.length} songs...`);
      const { inserted, failed } = await processParallelSongs(validSongs, prisma);

      totalProcessed += songs.length;
      totalInserted += inserted;
      totalSkipped += skipped + failed;

      console.log(`   ✅ Inserted: ${inserted}`);
      if (failed > 0) console.log(`   ❌ Failed: ${failed}`);

      // Update checkpoint
      offset += API_PARALLEL * BATCH_SIZE;
      const newCheckpoint: Checkpoint = {
        offset,
        processed: totalProcessed,
        inserted: totalInserted,
        skipped: totalSkipped,
        timestamp: new Date().toISOString()
      };
      saveCheckpoint(newCheckpoint);

      const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
      const rate = (totalProcessed / (Date.now() - startTime) * 1000).toFixed(1);
      console.log(`\n📊 Total: ${totalProcessed} processed, ${totalInserted} inserted (${elapsed}m, ${rate} songs/sec)`);
    }

    const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    console.log(`\n🎉 CRAWL COMPLETE!`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`   Total processed: ${totalProcessed}`);
    console.log(`   Total inserted: ${totalInserted}`);
    console.log(`   Total skipped: ${totalSkipped}`);
    console.log(`   Time: ${totalTime} minutes`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // Clean up checkpoint file
    fs.unlinkSync(CHECKPOINT_FILE);

  } catch (error: any) {
    console.error('\n❌ Fatal error:', error);
    console.log(`\n💾 Progress saved at offset ${offset}`);
    console.log(`   Run script again to resume from checkpoint\n`);
  } finally {
    await prisma.$disconnect();
  }
}

crawl().catch(console.error);

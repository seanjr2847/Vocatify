import crypto from 'crypto';
/**
 * VocaDB PostgreSQL Chunked Crawler - v2
 *
 * Features:
 * - Full relational schema with separate tables for names, artists, pvs, tags, lyrics
 * - PostgreSQL with Prisma ORM
 * - CrawlerProgress tracking for resumption
 * - Configurable chunk sizes for serverless execution
 * - Error recovery and retry logic
 * - Designed for Vercel Cron jobs
 */

import { PrismaClient } from '@/lib/generated/prisma';
import {
  batchUpsertSongs,
  batchUpsertSongNames,
  batchUpsertArtists,
  batchUpsertSongArtists,
  batchUpsertPVs,
  batchUpsertTags,
  batchUpsertSongTags,
  batchReplaceLyrics,
} from './batch-upsert';
import { INCLUDED_VOICE_SYNTHESIZER_TYPES } from '../constants';

const VOCADB_API_BASE = 'https://vocadb.net/api';

// Excluded tags - songs with these tags will be skipped
const EXCLUDED_TAGS = ['human singers', 'out of scope (cover unifier)'];
const SYNTHETIC_VOCALIST_TYPES = [
  ...INCLUDED_VOICE_SYNTHESIZER_TYPES,
  'OtherVoiceSynthesizer',  // Crawler includes this, rankings exclude it
];

/**
 * VocaDB API song item (partial type)
 */
interface VocaDBSongItem {
  id: number;
  name: string;
  songType?: string;
  artistString?: string;
  lengthSeconds?: number;
  favoritedTimes?: number;
  ratingScore?: number;
  names?: Array<{ value?: string; language?: string }>;
  artists?: Array<{
    artist?: {
      id?: number;
      name?: string;
      artistType?: string;
      mainPicture?: { urlThumb?: string };
    };
    name?: string;
    categories?: string;
    roles?: string;
    isSupport?: boolean;
  }>;
  pvs?: Array<{
    pvId?: string;
    service?: string;
    pvType?: string;
    name?: string;
    url?: string;
    thumbUrl?: string;
    disabled?: boolean;
  }>;
  tags?: Array<{ tag?: { id?: number; name?: string; categoryName?: string }; name?: string; count?: number }>;
  lyrics?: Array<{
    translationType?: string;
    cultureCode?: string;
    source?: string;
    url?: string;
    value?: string;
    [key: string]: unknown;
  }>;
  mainPicture?: {
    urlThumb?: string;
    urlSmallThumb?: string;
  };
  thumbUrl?: string;
  publishDate?: string;
  createDate?: string;
  [key: string]: unknown;
}

export interface VocaDBCrawlerOptions {
  batchSize?: number;
  maxSongsPerRun?: number;
  startOffset?: number;
  songTypes?: string;
  enableResume?: boolean;
}

export interface VocaDBCrawlerResult {
  success: boolean;
  songsProcessed: number;
  songsInserted: number;
  songsSkipped: number;
  lastOffset: number;
  completed: boolean;
  error?: string;
}

export interface VocaDBCrawlerStatus {
  status: string;
  startedAt?: Date | null;
  completedAt?: Date | null;
  lastOffset?: number | null;
  totalProcessed?: number | null;
  totalTarget?: number | null;
  errorMessage?: string | null;
  metadata?: unknown;
  message?: string;
}

export class VocaDBCrawler {
  private prisma: PrismaClient;
  private options: Required<VocaDBCrawlerOptions>;
  private progressId?: string;

  constructor(prisma: PrismaClient, options: VocaDBCrawlerOptions = {}) {
    this.prisma = prisma;
    this.options = {
      batchSize: options.batchSize ?? 100,
      maxSongsPerRun: options.maxSongsPerRun ?? 1000,
      startOffset: options.startOffset ?? 0,
      songTypes: options.songTypes ?? 'Original',
      enableResume: options.enableResume ?? true,
    };
  }

  async crawl(): Promise<VocaDBCrawlerResult> {
    const startTime = Date.now();
    let songsProcessed = 0;
    let songsInserted = 0;
    let songsSkipped = 0;
    let currentOffset = this.options.startOffset;
    let consecutiveEmpty = 0;
    let completed = false;

    try {
      // Get latest publish_date from DB for incremental crawling
      const latestSong = await this.prisma.songs.findFirst({
        where: {
          publish_date: { not: null },
        },
        orderBy: { publish_date: 'desc' },
        select: { publish_date: true, default_name: true },
      });

      const afterDate = latestSong?.publish_date?.toISOString();

      if (afterDate) {
        console.log(`📅 Incremental crawl: fetching songs published after ${afterDate.split('T')[0]}`);
        console.log(`   Latest song in DB: "${latestSong.default_name}"`);
      } else {
        console.log(`📥 Initial crawl: fetching all songs (no publish_date filter)`);
      }

      // Initialize or resume progress
      let resumedAfterDate: string | null = null;
      if (this.options.enableResume) {
        const existingProgress = await this.prisma.crawler_progress.findFirst({
          where: { crawler_type: 'vocadb', status: 'running' },
        });

        if (existingProgress) {
          this.progressId = existingProgress.id;
          currentOffset = existingProgress.last_offset;
          // Use the same afterDate from the original session for consistency
          resumedAfterDate = (existingProgress.metadata as { afterDate?: string | null })?.afterDate || null;
          console.log(`🔄 Resuming VocaDB crawler from offset ${currentOffset}`);
          if (resumedAfterDate) {
            console.log(`   Using original session filter: afterDate=${resumedAfterDate.split('T')[0]}`);
          }
        } else {
          const progress = await this.prisma.crawler_progress.create({
            data: {
              id: crypto.randomUUID(),
              crawler_type: 'vocadb',
              status: 'running',
              started_at: new Date(),
              last_offset: currentOffset,
              total_processed: 0,
              metadata: {
                batchSize: this.options.batchSize,
                maxSongsPerRun: this.options.maxSongsPerRun,
                songTypes: this.options.songTypes,
                afterDate: afterDate || null,
              },
            },
          });
          this.progressId = progress.id;
          console.log(`🚀 Starting new VocaDB crawler session`);
        }
      }

      // Use resumed afterDate if available, otherwise use current
      const effectiveAfterDate = resumedAfterDate || afterDate;

      // Crawl loop
      while (songsProcessed < this.options.maxSongsPerRun) {
        // Request all fields including Lyrics
        const fields = 'Names,Artists,PVs,Tags,Lyrics,ThumbUrl,MainPicture';
        let url = `${VOCADB_API_BASE}/songs?start=${currentOffset}&maxResults=${this.options.batchSize}&fields=${fields}&songTypes=${this.options.songTypes}&sort=AdditionDate`;

        // Add date filter for incremental crawling
        if (effectiveAfterDate) {
          url += `&afterDate=${effectiveAfterDate}`;
        }

        console.log(`📥 Fetching batch at offset ${currentOffset}...`);

        try {
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'Vocatify/1.0',
              'Accept': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error(`VocaDB API error: ${response.status} ${response.statusText}`);
          }

          const data = await response.json();
          const items = data.items || [];

          if (items.length === 0) {
            consecutiveEmpty++;
            console.log(`⚠️  Empty batch (${consecutiveEmpty}/3)`);

            if (consecutiveEmpty >= 3) {
              console.log(`✅ No more data available (3 consecutive empty responses)`);
              completed = true;
              break;
            }
          } else {
            consecutiveEmpty = 0;
          }

          console.log(`   Received: ${items.length} songs`);

          const batchResult = await this.processBatch(items);
          songsProcessed += batchResult.processed;
          songsInserted += batchResult.inserted;
          songsSkipped += batchResult.skipped;

          console.log(`   Processed: ${batchResult.processed} songs (${batchResult.inserted} inserted, ${batchResult.skipped} skipped)`);
          console.log(`   Total progress: ${songsProcessed}/${this.options.maxSongsPerRun} songs\n`);

          // Update offset BEFORE saving to DB (to prevent infinite loop on crash)
          currentOffset += this.options.batchSize;

          if (this.progressId) {
            await this.prisma.crawler_progress.update({
              where: { id: this.progressId },
              data: { last_offset: currentOffset, total_processed: songsProcessed },
            });
          }

          if (songsProcessed >= this.options.maxSongsPerRun) {
            console.log(`✅ Reached max songs limit (${this.options.maxSongsPerRun})`);
            break;
          }

          if (items.length < this.options.batchSize) {
            console.log(`✅ Received fewer results than requested - end of data`);
            completed = true;
            break;
          }

          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
          console.error(`❌ Error fetching batch at offset ${currentOffset}:`, error);
          throw error;
        }
      }

      if (this.progressId) {
        await this.prisma.crawler_progress.update({
          where: { id: this.progressId },
          data: {
            status: completed ? 'completed' : 'running',
            completed_at: completed ? new Date() : null,
            last_offset: currentOffset,
            total_processed: songsProcessed,
          },
        });
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`\n✅ Crawler execution completed in ${duration}s`);
      console.log(`   Songs processed: ${songsProcessed}`);
      console.log(`   Songs inserted: ${songsInserted}`);
      console.log(`   Songs skipped: ${songsSkipped}`);
      console.log(`   Last offset: ${currentOffset}`);
      console.log(`   Fully completed: ${completed ? 'Yes' : 'No'}\n`);

      return { success: true, songsProcessed, songsInserted, songsSkipped, lastOffset: currentOffset, completed };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`💥 Crawler failed:`, errorMessage);

      if (this.progressId) {
        await this.prisma.crawler_progress.update({
          where: { id: this.progressId },
          data: { status: 'failed', completed_at: new Date(), error_message: errorMessage },
        });
      }

      return { success: false, songsProcessed, songsInserted, songsSkipped, lastOffset: currentOffset, completed: false, error: errorMessage };
    }
  }

  /**
   * Process entire batch using bulk SQL operations
   * Much faster than individual upserts
   */
  private async processBatch(items: VocaDBSongItem[]): Promise<{ processed: number; inserted: number; skipped: number }> {
    // 1. Filter valid items first
    const validItems: VocaDBSongItem[] = [];
    let skipped = 0;

    for (const item of items) {
      // Filter: Must have at least one PV
      if (!item.pvs || item.pvs.length === 0) {
        skipped++;
        continue;
      }

      // Check for excluded tags
      const allTags = (item.tags || [])
        .map((t) => t.tag?.name || t.name)
        .filter((t): t is string => !!t);

      const hasExcludedTag = allTags.some((tag: string) =>
        EXCLUDED_TAGS.some(excluded => tag.toLowerCase() === excluded.toLowerCase())
      );

      if (hasExcludedTag) {
        skipped++;
        continue;
      }

      validItems.push(item);
    }

    if (validItems.length === 0) {
      return { processed: items.length, inserted: 0, skipped };
    }

    try {
      // 2. Collect all data for batch operations
      const songs: Parameters<typeof batchUpsertSongs>[1] = [];
      const allNames: Parameters<typeof batchUpsertSongNames>[1] = [];
      const allArtists: Parameters<typeof batchUpsertArtists>[1] = [];
      const allSongArtists: Parameters<typeof batchUpsertSongArtists>[1] = [];
      const allPVs: Parameters<typeof batchUpsertPVs>[1] = [];
      const allTags: Parameters<typeof batchUpsertTags>[1] = [];
      const allSongTags: Parameters<typeof batchUpsertSongTags>[1] = [];
      const allLyrics: Parameters<typeof batchReplaceLyrics>[2] = [];
      const songIdsWithLyrics: number[] = [];

      for (const item of validItems) {
        // Song data
        const thumbUrl = item.mainPicture?.urlThumb || item.thumbUrl || null;
        const thumbUrlSmall = item.mainPicture?.urlSmallThumb || null;

        let publishDate = null;
        if (item.publishDate) {
          try {
            publishDate = new Date(item.publishDate);
            if (isNaN(publishDate.getTime())) publishDate = null;
          } catch {
            publishDate = null;
          }
        }

        let createDate = null;
        if (item.createDate) {
          try {
            createDate = new Date(item.createDate);
            if (isNaN(createDate.getTime())) createDate = null;
          } catch {
            createDate = null;
          }
        }

        songs.push({
          vocadb_id: item.id,
          default_name: item.name,
          song_type: item.songType || null,
          publish_date: publishDate,
          create_date: createDate,
          length_seconds: item.lengthSeconds || null,
          favorited_times: item.favoritedTimes || 0,
          rating_score: item.ratingScore || 0,
          thumb_url: thumbUrl,
          thumb_url_small: thumbUrlSmall,
        });

        // Song names
        for (const name of item.names || []) {
          if (name.value && name.language) {
            allNames.push({
              song_id: item.id,
              language: name.language,
              value: name.value,
            });
          }
        }

        // Artists
        for (const artistEntry of item.artists || []) {
          const artist = artistEntry.artist;
          if (!artist?.id || !artist?.name) continue;

          allArtists.push({
            vocadb_id: artist.id,
            name: artist.name,
            artist_type: artist.artistType || 'Unknown',
            thumb_url: artist.mainPicture?.urlThumb || null,
          });

          allSongArtists.push({
            song_id: item.id,
            artist_id: artist.id,
            categories: artistEntry.categories || '',
            roles: artistEntry.roles || null,
            is_support: artistEntry.isSupport || false,
            name: artistEntry.name || null,
          });
        }

        // PVs
        for (const pv of item.pvs || []) {
          if (!pv.pvId || !pv.service) continue;

          allPVs.push({
            song_id: item.id,
            pv_id: pv.pvId,
            service: pv.service,
            pv_type: pv.pvType || 'Original',
            name: pv.name || null,
            url: pv.url || `https://www.youtube.com/watch?v=${pv.pvId}`,
            thumb_url: pv.thumbUrl || null,
            disabled: pv.disabled || false,
          });
        }

        // Tags
        for (const tagEntry of item.tags || []) {
          const tag = tagEntry.tag;
          if (!tag?.id || !tag?.name) continue;

          allTags.push({
            vocadb_id: tag.id,
            name: tag.name,
            category_name: tag.categoryName || null,
          });

          allSongTags.push({
            song_id: item.id,
            tag_id: tag.id,
            count: tagEntry.count || 0,
          });
        }

        // Lyrics
        const itemLyrics = (item.lyrics || []).filter((l): l is typeof l & { translationType: string } => !!l.translationType);
        if (itemLyrics.length > 0) {
          songIdsWithLyrics.push(item.id);
          for (const lyric of itemLyrics) {
            allLyrics.push({
              song_id: item.id,
              translation_type: lyric.translationType,
              culture_code: lyric.cultureCode || null,
              source: lyric.source || null,
              url: lyric.url || null,
              value: lyric.value || null,
            });
          }
        }
      }

      // 3. Execute batch operations in optimal order
      // First: Songs (parent table)
      await batchUpsertSongs(this.prisma, songs);

      // Second: Master tables (Artists, Tags) - no dependencies
      await Promise.all([
        batchUpsertArtists(this.prisma, allArtists),
        batchUpsertTags(this.prisma, allTags),
      ]);

      // Third: All relation tables in parallel
      await Promise.all([
        batchUpsertSongNames(this.prisma, allNames),
        batchUpsertSongArtists(this.prisma, allSongArtists),
        batchUpsertPVs(this.prisma, allPVs),
        batchUpsertSongTags(this.prisma, allSongTags),
        batchReplaceLyrics(this.prisma, songIdsWithLyrics, allLyrics),
      ]);

      return {
        processed: items.length,
        inserted: validItems.length,
        skipped,
      };

    } catch (error) {
      console.error(`⚠️  Batch processing error:`, error);
      // On batch error, return partial results
      return {
        processed: items.length,
        inserted: 0,
        skipped: items.length,
      };
    }
  }

  static async resetProgress(prisma: PrismaClient): Promise<void> {
    await prisma.crawler_progress.updateMany({
      where: { crawler_type: 'vocadb', status: 'running' },
      data: { status: 'failed', completed_at: new Date(), error_message: 'Manually reset' },
    });
    console.log('✅ VocaDB crawler progress reset');
  }

  static async getStatus(prisma: PrismaClient): Promise<VocaDBCrawlerStatus> {
    const latestProgress = await prisma.crawler_progress.findFirst({
      where: { crawler_type: 'vocadb' },
      orderBy: { started_at: 'desc' },
    });

    if (!latestProgress) {
      return { status: 'never_run', message: 'No crawler progress found' };
    }

    return {
      status: latestProgress.status,
      startedAt: latestProgress.started_at,
      completedAt: latestProgress.completed_at,
      lastOffset: latestProgress.last_offset,
      totalProcessed: latestProgress.total_processed,
      totalTarget: latestProgress.total_target,
      errorMessage: latestProgress.error_message,
      metadata: latestProgress.metadata,
    };
  }
}

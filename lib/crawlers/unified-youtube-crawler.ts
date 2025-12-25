/**
 * Unified YouTube Crawler
 *
 * Features:
 * - Single API call for both view counts AND Korean titles
 * - Uses: part=statistics,snippet,localizations
 * - Reduces API quota usage by 50%
 * - CrawlerProgress tracking for resumption
 * - Smart selection modes (new, old, top, all)
 * - Designed for daily Vercel Cron jobs
 */

import { PrismaClient, Prisma } from '../generated/prisma';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

export type UnifiedCrawlerMode = 'new' | 'old' | 'top' | 'all';

export interface UnifiedYouTubeCrawlerOptions {
  mode?: UnifiedCrawlerMode;       // Selection mode (default: 'new')
  batchSize?: number;               // Songs per batch (default: 50, max 50 for YouTube API)
  maxSongsPerRun?: number;          // Max songs to process (default: 500)
  enableResume?: boolean;           // Enable progress tracking (default: true)
  updateLocalizations?: boolean;    // Also update Korean titles (default: true)
  startOffset?: number;             // Starting offset for chunked processing (default: 0)
}

export interface UnifiedYouTubeCrawlerResult {
  success: boolean;
  songsProcessed: number;
  songsUpdated: number;
  titlesUpdated: number;
  songsFailed: number;
  lastOffset: number;
  completed: boolean;
  error?: string;
}

interface YouTubeVideoItem {
  id: string;
  statistics?: {
    viewCount?: string;
  };
  snippet?: {
    title?: string;
    defaultLanguage?: string;
  };
  localizations?: {
    ko?: { title?: string };
    kr?: { title?: string };
    [key: string]: { title?: string } | undefined;
  };
}

export class UnifiedYouTubeCrawler {
  private prisma: PrismaClient;
  private options: Required<UnifiedYouTubeCrawlerOptions>;
  private progressId?: string;

  constructor(prisma: PrismaClient, options: UnifiedYouTubeCrawlerOptions = {}) {
    this.prisma = prisma;
    this.options = {
      mode: options.mode ?? 'new',
      batchSize: Math.min(options.batchSize ?? 50, 50), // YouTube API max 50
      maxSongsPerRun: options.maxSongsPerRun ?? 500,
      enableResume: options.enableResume ?? true,
      updateLocalizations: options.updateLocalizations ?? true,
      startOffset: options.startOffset ?? 0,
    };

    if (!YOUTUBE_API_KEY) {
      throw new Error('YOUTUBE_API_KEY environment variable is required');
    }
  }

  /**
   * Execute unified YouTube crawler with progress tracking
   */
  async crawl(): Promise<UnifiedYouTubeCrawlerResult> {
    const startTime = Date.now();
    let songsProcessed = 0;
    let songsUpdated = 0;
    let titlesUpdated = 0;
    let songsFailed = 0;
    let currentOffset = 0;
    let completed = false;

    try {
      // Get total count for this mode
      const totalSongsToProcess = await this.getTotalCountByMode();

      console.log(`🎬 Unified YouTube Crawler - Mode: ${this.options.mode}`);
      console.log(`   Localizations: ${this.options.updateLocalizations ? 'enabled' : 'disabled'}`);
      console.log(`   Start offset: ${this.options.startOffset.toLocaleString()}`);
      console.log(`   Max songs: ${this.options.maxSongsPerRun.toLocaleString()}`);
      console.log(`   Total songs in mode: ${totalSongsToProcess.toLocaleString()}`);

      // Initialize or resume progress
      if (this.options.enableResume) {
        const existingProgress = await this.prisma.crawlerProgress.findFirst({
          where: {
            crawlerType: 'youtube-unified',
            status: 'running',
          },
        });

        if (existingProgress) {
          this.progressId = existingProgress.id;
          currentOffset = existingProgress.lastOffset;
          console.log(`🔄 Resuming from offset ${currentOffset}`);
        } else {
          const progress = await this.prisma.crawlerProgress.create({
            data: {
              crawlerType: 'youtube-unified',
              status: 'running',
              startedAt: new Date(),
              lastOffset: 0,
              totalProcessed: 0,
              metadata: {
                mode: this.options.mode,
                batchSize: this.options.batchSize,
                maxSongsPerRun: this.options.maxSongsPerRun,
                updateLocalizations: this.options.updateLocalizations,
                startOffset: this.options.startOffset,
              },
            },
          });
          this.progressId = progress.id;
          console.log(`🚀 Starting new unified YouTube crawler session`);
        }
      }

      // Crawl loop
      while (songsProcessed < this.options.maxSongsPerRun) {
        // Get songs based on mode
        const songs = await this.getSongsByMode(currentOffset, this.options.batchSize);

        if (songs.length === 0) {
          console.log(`✅ No more songs to process`);
          completed = true;
          break;
        }

        console.log(`📥 Processing batch: ${songs.length} songs (offset ${currentOffset})...`);

        // Process batch with unified API call
        const batchResult = await this.processBatch(songs);
        songsProcessed += batchResult.processed;
        songsUpdated += batchResult.updated;
        titlesUpdated += batchResult.titlesUpdated;
        songsFailed += batchResult.failed;

        console.log(`   Views updated: ${batchResult.updated} songs`);
        console.log(`   Titles updated: ${batchResult.titlesUpdated} songs`);
        console.log(`   Failed: ${batchResult.failed} songs`);
        const percent = totalSongsToProcess > 0 ? ((songsProcessed / totalSongsToProcess) * 100).toFixed(1) : '0';
        console.log(`   Total progress: ${songsProcessed.toLocaleString()}/${totalSongsToProcess.toLocaleString()} songs (${percent}%)\n`);

        // Update progress
        if (this.progressId) {
          await this.prisma.crawlerProgress.update({
            where: { id: this.progressId },
            data: {
              lastOffset: currentOffset,
              totalProcessed: songsProcessed,
            },
          });
        }

        // Check if we've reached the limit
        if (songsProcessed >= this.options.maxSongsPerRun) {
          console.log(`✅ Reached max songs limit (${this.options.maxSongsPerRun})`);
          break;
        }

        // Check if we got fewer results than requested
        if (songs.length < this.options.batchSize) {
          console.log(`✅ Processed all available songs`);
          completed = true;
          break;
        }

        currentOffset += this.options.batchSize;
        // Note: No delay needed - YouTube API has daily quota limits, not rate limits
      }

      // Mark as completed
      if (this.progressId) {
        await this.prisma.crawlerProgress.update({
          where: { id: this.progressId },
          data: {
            status: completed ? 'completed' : 'running',
            completedAt: completed ? new Date() : null,
            lastOffset: currentOffset,
            totalProcessed: songsProcessed,
          },
        });
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`\n✅ Unified YouTube crawler completed in ${duration}s`);
      console.log(`   Songs processed: ${songsProcessed}`);
      console.log(`   Views updated: ${songsUpdated}`);
      console.log(`   Titles updated: ${titlesUpdated}`);
      console.log(`   Songs failed: ${songsFailed}`);
      console.log(`   Fully completed: ${completed ? 'Yes' : 'No'}\n`);

      return {
        success: true,
        songsProcessed,
        songsUpdated,
        titlesUpdated,
        songsFailed,
        lastOffset: currentOffset,
        completed,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`💥 Unified YouTube crawler failed:`, errorMessage);

      if (this.progressId) {
        await this.prisma.crawlerProgress.update({
          where: { id: this.progressId },
          data: {
            status: 'failed',
            completedAt: new Date(),
            errorMessage,
          },
        });
      }

      return {
        success: false,
        songsProcessed,
        songsUpdated,
        titlesUpdated,
        songsFailed,
        lastOffset: currentOffset,
        completed: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get total count of songs to process based on mode
   */
  private async getTotalCountByMode(): Promise<number> {
    switch (this.options.mode) {
      case 'new':
        return this.prisma.song.count({
          where: {
            OR: [
              { viewCountUpdatedAt: null },
              { viewCountUpdatedAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
            ],
          },
        });

      case 'old':
        return this.prisma.song.count({
          where: {
            OR: [
              { viewCountUpdatedAt: null },
              { viewCountUpdatedAt: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
            ],
          },
        });

      case 'top':
        return this.prisma.song.count({
          where: {
            OR: [
              { viewCount: { gt: 1000000 } },
              { favoritedTimes: { gt: 100 } },
            ],
          },
        });

      case 'all':
        return this.prisma.song.count();

      default:
        return 0;
    }
  }

  /**
   * Get songs based on mode
   * @param offset - Local offset within current run
   * @param limit - Number of songs to fetch
   */
  private async getSongsByMode(offset: number, limit: number) {
    // Apply startOffset for chunked processing (Matrix strategy)
    const actualOffset = this.options.startOffset + offset;

    switch (this.options.mode) {
      case 'new':
        // Songs added in the last 30 days or never updated
        return this.prisma.song.findMany({
          where: {
            OR: [
              { viewCountUpdatedAt: null },
              { viewCountUpdatedAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
            ],
          },
          orderBy: { crawledAt: 'desc' },
          skip: actualOffset,
          take: limit,
        });

      case 'old':
        // Songs not updated in the last 90 days
        return this.prisma.song.findMany({
          where: {
            OR: [
              { viewCountUpdatedAt: null },
              { viewCountUpdatedAt: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
            ],
          },
          orderBy: { viewCountUpdatedAt: 'asc' },
          skip: actualOffset,
          take: limit,
        });

      case 'top':
        // Top songs by view count or favorites
        return this.prisma.song.findMany({
          where: {
            OR: [
              { viewCount: { gt: 1000000 } },
              { favoritedTimes: { gt: 100 } },
            ],
          },
          orderBy: { viewCount: 'desc' },
          skip: actualOffset,
          take: limit,
        });

      case 'all':
        // All songs ordered by last update
        return this.prisma.song.findMany({
          orderBy: { viewCountUpdatedAt: 'asc' },
          skip: actualOffset,
          take: limit,
        });

      default:
        throw new Error(`Unknown mode: ${this.options.mode}`);
    }
  }

  /**
   * Process a batch of songs - fetch view counts AND Korean titles in single API call
   * Uses $transaction for batch DB updates (50곡 = 1 트랜잭션)
   */
  private async processBatch(songs: { vocadbId: number; youtubeId: string; titleKorean: string | null }[]): Promise<{
    processed: number;
    updated: number;
    titlesUpdated: number;
    failed: number;
  }> {
    let processed = 0;
    let updated = 0;
    let titlesUpdated = 0;
    let failed = 0;

    // Extract YouTube IDs (filter out null/undefined)
    const validSongs = songs.filter(s => s.youtubeId);
    const youtubeIds = validSongs.map(s => s.youtubeId);

    if (youtubeIds.length === 0) {
      return { processed: songs.length, updated: 0, titlesUpdated: 0, failed: songs.length };
    }

    try {
      // UNIFIED API CALL: statistics + snippet + localizations
      const parts = this.options.updateLocalizations
        ? 'statistics,snippet,localizations'
        : 'statistics';

      const url = `${YOUTUBE_API_BASE}/videos?part=${parts}&id=${youtubeIds.join(',')}&key=${YOUTUBE_API_KEY}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const items: YouTubeVideoItem[] = data.items || [];

      // Create maps for quick lookup
      const videoDataMap = new Map<string, {
        viewCount?: bigint;
        koreanTitle?: string;
      }>();

      for (const item of items) {
        const videoData: { viewCount?: bigint; koreanTitle?: string } = {};

        // Extract view count
        if (item.statistics?.viewCount) {
          videoData.viewCount = BigInt(item.statistics.viewCount);
        }

        // Extract Korean title (if enabled)
        if (this.options.updateLocalizations) {
          if (item.localizations?.ko?.title) {
            videoData.koreanTitle = item.localizations.ko.title;
          } else if (item.localizations?.kr?.title) {
            videoData.koreanTitle = item.localizations.kr.title;
          } else if (item.snippet?.defaultLanguage === 'ko' && item.snippet?.title) {
            videoData.koreanTitle = item.snippet.title;
          }
        }

        videoDataMap.set(item.id, videoData);
      }

      // Prepare batch updates
      const updateOperations: Array<{
        vocadbId: number;
        viewCount: bigint;
        titleKorean?: string;
      }> = [];

      for (const song of validSongs) {
        const videoData = videoDataMap.get(song.youtubeId);

        if (videoData?.viewCount !== undefined) {
          const updateItem: { vocadbId: number; viewCount: bigint; titleKorean?: string } = {
            vocadbId: song.vocadbId,
            viewCount: videoData.viewCount,
          };

          // Only update Korean title if song doesn't already have one
          if (videoData.koreanTitle && !song.titleKorean) {
            updateItem.titleKorean = videoData.koreanTitle;
            titlesUpdated++;
          }

          updateOperations.push(updateItem);
          updated++;
        } else {
          failed++;
        }
        processed++;
      }

      // Execute batch updates using Raw SQL (50곡 = 2 SQL 쿼리)
      if (updateOperations.length > 0) {
        const now = new Date();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const vocadbIds = updateOperations.map(op => op.vocadbId);

        // 1. Batch UPDATE songs using CASE WHEN (1 query for all songs)
        const viewCountCases = updateOperations
          .map(op => `WHEN ${op.vocadbId} THEN ${op.viewCount}`)
          .join(' ');

        await this.prisma.$executeRawUnsafe(`
          UPDATE songs SET
            view_count = CASE vocadb_id ${viewCountCases} END,
            view_count_updated_at = $1
          WHERE vocadb_id IN (${vocadbIds.join(',')})
        `, now);

        // 2. Update Korean titles separately (only for songs that need it)
        const titleUpdates = updateOperations.filter(op => op.titleKorean);
        if (titleUpdates.length > 0) {
          await Promise.all(
            titleUpdates.map(op =>
              this.prisma.song.update({
                where: { vocadbId: op.vocadbId },
                data: { titleKorean: op.titleKorean },
              })
            )
          );
        }

        // 3. Batch UPSERT daily view counts using INSERT ON CONFLICT
        const dailyValues = updateOperations
          .map(op => `(${op.vocadbId}, '${today.toISOString().split('T')[0]}', ${op.viewCount})`)
          .join(',');

        await this.prisma.$executeRawUnsafe(`
          INSERT INTO daily_view_counts (song_id, recorded_date, total_views)
          VALUES ${dailyValues}
          ON CONFLICT (song_id, recorded_date)
          DO UPDATE SET total_views = EXCLUDED.total_views
        `);
      }

    } catch (error) {
      console.error(`❌ Error processing batch:`, error);
      failed = songs.length;
      processed = songs.length;
      updated = 0;
      titlesUpdated = 0;
    }

    return { processed, updated, titlesUpdated, failed };
  }

  /**
   * Reset failed or stuck crawler progress
   */
  static async resetProgress(prisma: PrismaClient): Promise<void> {
    await prisma.crawlerProgress.updateMany({
      where: {
        crawlerType: 'youtube-unified',
        status: 'running',
      },
      data: {
        status: 'failed',
        completedAt: new Date(),
        errorMessage: 'Manually reset',
      },
    });
    console.log('✅ Unified YouTube crawler progress reset');
  }

  /**
   * Get current crawler status
   */
  static async getStatus(prisma: PrismaClient): Promise<{
    status: string;
    startedAt?: Date;
    completedAt?: Date | null;
    lastOffset?: number;
    totalProcessed?: number;
    errorMessage?: string | null;
    metadata?: unknown;
    message?: string;
  }> {
    const latestProgress = await prisma.crawlerProgress.findFirst({
      where: {
        crawlerType: 'youtube-unified',
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    if (!latestProgress) {
      return {
        status: 'never_run',
        message: 'No crawler progress found',
      };
    }

    return {
      status: latestProgress.status,
      startedAt: latestProgress.startedAt,
      completedAt: latestProgress.completedAt,
      lastOffset: latestProgress.lastOffset,
      totalProcessed: latestProgress.totalProcessed,
      errorMessage: latestProgress.errorMessage,
      metadata: latestProgress.metadata,
    };
  }
}

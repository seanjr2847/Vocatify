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

import { PrismaClient } from '../generated/prisma';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

export type UnifiedCrawlerMode = 'new' | 'old' | 'top' | 'all';

export interface UnifiedYouTubeCrawlerOptions {
  mode?: UnifiedCrawlerMode;       // Selection mode (default: 'new')
  batchSize?: number;               // Songs per batch (default: 50, max 50 for YouTube API)
  maxSongsPerRun?: number;          // Max songs to process (default: 500)
  enableResume?: boolean;           // Enable progress tracking (default: true)
  updateLocalizations?: boolean;    // Also update Korean titles (default: true)
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
      console.log(`   Total songs to process: ${totalSongsToProcess.toLocaleString()}`);

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

        // Small delay to avoid API rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
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
   */
  private async getSongsByMode(offset: number, limit: number) {
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
          skip: offset,
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
          skip: offset,
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
          skip: offset,
          take: limit,
        });

      case 'all':
        // All songs ordered by last update
        return this.prisma.song.findMany({
          orderBy: { viewCountUpdatedAt: 'asc' },
          skip: offset,
          take: limit,
        });

      default:
        throw new Error(`Unknown mode: ${this.options.mode}`);
    }
  }

  /**
   * Process a batch of songs - fetch view counts AND Korean titles in single API call
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

    // Extract YouTube IDs
    const youtubeIds = songs.map(s => s.youtubeId);

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

      // Update songs with unified data
      for (const song of songs) {
        try {
          const videoData = videoDataMap.get(song.youtubeId);

          if (videoData?.viewCount !== undefined) {
            // Build update data
            const updateData: {
              viewCount: bigint;
              viewCountUpdatedAt: Date;
              titleKorean?: string;
            } = {
              viewCount: videoData.viewCount,
              viewCountUpdatedAt: new Date(),
            };

            // Only update Korean title if:
            // 1. We have a Korean title from YouTube
            // 2. The song doesn't already have a Korean title
            if (videoData.koreanTitle && !song.titleKorean) {
              updateData.titleKorean = videoData.koreanTitle;
              titlesUpdated++;
            }

            await this.prisma.song.update({
              where: { vocadbId: song.vocadbId },
              data: updateData,
            });

            updated++;
          } else {
            // Video not found or private
            failed++;
          }

          processed++;

        } catch (error) {
          console.error(`⚠️  Error updating song ${song.vocadbId}:`, error);
          failed++;
          processed++;
        }
      }

    } catch (error) {
      console.error(`❌ Error fetching YouTube data:`, error);
      failed = songs.length;
      processed = songs.length;
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

/**
 * YouTube View Count Chunked Crawler
 *
 * Features:
 * - Updates YouTube view counts for existing songs
 * - Processes in batches to stay within API quota
 * - CrawlerProgress tracking for resumption
 * - Smart selection (new, old, top songs)
 * - Designed for daily Vercel Cron jobs
 */

import { PrismaClient } from '@/lib/generated/prisma';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

export type YouTubeCrawlerMode = 'new' | 'old' | 'top' | 'all';

export interface YouTubeCrawlerOptions {
  mode?: YouTubeCrawlerMode;    // Selection mode (default: 'new')
  batchSize?: number;            // Songs per batch (default: 50, max 50 for YouTube API)
  maxSongsPerRun?: number;       // Max songs to process (default: 500)
  enableResume?: boolean;        // Enable progress tracking (default: true)
}

export interface YouTubeCrawlerResult {
  success: boolean;
  songsProcessed: number;
  songsUpdated: number;
  songsFailed: number;
  lastOffset: number;
  completed: boolean;
  error?: string;
}

export class YouTubeCrawler {
  private prisma: PrismaClient;
  private options: Required<YouTubeCrawlerOptions>;
  private progressId?: string;

  constructor(prisma: PrismaClient, options: YouTubeCrawlerOptions = {}) {
    this.prisma = prisma;
    this.options = {
      mode: options.mode ?? 'new',
      batchSize: Math.min(options.batchSize ?? 50, 50), // YouTube API max 50
      maxSongsPerRun: options.maxSongsPerRun ?? 500,
      enableResume: options.enableResume ?? true,
    };

    if (!YOUTUBE_API_KEY) {
      throw new Error('YOUTUBE_API_KEY environment variable is required');
    }
  }

  /**
   * Execute YouTube view count update with progress tracking
   */
  async crawl(): Promise<YouTubeCrawlerResult> {
    const startTime = Date.now();
    let songsProcessed = 0;
    let songsUpdated = 0;
    let songsFailed = 0;
    let currentOffset = 0;
    let completed = false;

    try {
      console.log(`🎬 YouTube Crawler - Mode: ${this.options.mode}`);

      // Initialize or resume progress
      if (this.options.enableResume) {
        const existingProgress = await this.prisma.crawlerProgress.findFirst({
          where: {
            crawlerType: 'youtube',
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
              crawlerType: 'youtube',
              status: 'running',
              startedAt: new Date(),
              lastOffset: 0,
              totalProcessed: 0,
              metadata: {
                mode: this.options.mode,
                batchSize: this.options.batchSize,
                maxSongsPerRun: this.options.maxSongsPerRun,
              },
            },
          });
          this.progressId = progress.id;
          console.log(`🚀 Starting new YouTube crawler session`);
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

        // Process batch
        const batchResult = await this.processBatch(songs);
        songsProcessed += batchResult.processed;
        songsUpdated += batchResult.updated;
        songsFailed += batchResult.failed;

        console.log(`   Updated: ${batchResult.updated} songs`);
        console.log(`   Failed: ${batchResult.failed} songs`);
        console.log(`   Total progress: ${songsProcessed}/${this.options.maxSongsPerRun} songs\n`);

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
      console.log(`\n✅ YouTube crawler completed in ${duration}s`);
      console.log(`   Songs processed: ${songsProcessed}`);
      console.log(`   Songs updated: ${songsUpdated}`);
      console.log(`   Songs failed: ${songsFailed}`);
      console.log(`   Fully completed: ${completed ? 'Yes' : 'No'}\n`);

      return {
        success: true,
        songsProcessed,
        songsUpdated,
        songsFailed,
        lastOffset: currentOffset,
        completed,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`💥 YouTube crawler failed:`, errorMessage);

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
        songsFailed,
        lastOffset: currentOffset,
        completed: false,
        error: errorMessage,
      };
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
   * Process a batch of songs - fetch YouTube view counts
   */
  private async processBatch(songs: any[]): Promise<{ processed: number; updated: number; failed: number }> {
    let processed = 0;
    let updated = 0;
    let failed = 0;

    // Extract YouTube IDs
    const youtubeIds = songs.map(s => s.youtubeId);

    try {
      // Fetch view counts from YouTube API (max 50 IDs per request)
      const url = `${YOUTUBE_API_BASE}/videos?part=statistics&id=${youtubeIds.join(',')}&key=${YOUTUBE_API_KEY}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const items = data.items || [];

      // Create a map of videoId -> viewCount
      const viewCountMap = new Map<string, string>();
      for (const item of items) {
        if (item.statistics?.viewCount) {
          viewCountMap.set(item.id, item.statistics.viewCount);
        }
      }

      // Update songs with new view counts
      for (const song of songs) {
        try {
          const viewCountStr = viewCountMap.get(song.youtubeId);

          if (viewCountStr) {
            const viewCount = BigInt(viewCountStr);
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Normalize to start of day

            // Update song view count
            await this.prisma.song.update({
              where: { vocadbId: song.vocadbId },
              data: {
                viewCount,
                viewCountUpdatedAt: new Date(),
              },
            });

            // Upsert daily view count record
            await this.prisma.dailyViewCount.upsert({
              where: {
                songId_recordedDate: {
                  songId: song.vocadbId,
                  recordedDate: today,
                },
              },
              update: {
                totalViews: viewCount,
              },
              create: {
                songId: song.vocadbId,
                recordedDate: today,
                totalViews: viewCount,
              },
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

    return { processed, updated, failed };
  }

  /**
   * Reset failed or stuck crawler progress
   */
  static async resetProgress(prisma: PrismaClient): Promise<void> {
    await prisma.crawlerProgress.updateMany({
      where: {
        crawlerType: 'youtube',
        status: 'running',
      },
      data: {
        status: 'failed',
        completedAt: new Date(),
        errorMessage: 'Manually reset',
      },
    });
    console.log('✅ YouTube crawler progress reset');
  }

  /**
   * Get current crawler status
   */
  static async getStatus(prisma: PrismaClient): Promise<any> {
    const latestProgress = await prisma.crawlerProgress.findFirst({
      where: {
        crawlerType: 'youtube',
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

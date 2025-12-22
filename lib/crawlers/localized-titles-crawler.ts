/**
 * YouTube Localized Titles Chunked Crawler
 *
 * Features:
 * - Fetches Korean titles from YouTube API
 * - Processes songs missing Korean titles
 * - CrawlerProgress tracking for resumption
 * - Batch processing with API quota management
 * - Designed for weekly Vercel Cron jobs
 */

import { PrismaClient } from '@/lib/generated/prisma';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

export interface LocalizedTitlesCrawlerOptions {
  batchSize?: number;            // Songs per batch (default: 50, max 50 for YouTube API)
  maxSongsPerRun?: number;       // Max songs to process (default: 200)
  enableResume?: boolean;        // Enable progress tracking (default: true)
  prioritizePopular?: boolean;   // Prioritize popular songs (default: true)
}

export interface LocalizedTitlesCrawlerResult {
  success: boolean;
  songsProcessed: number;
  songsUpdated: number;
  songsFailed: number;
  lastOffset: number;
  completed: boolean;
  error?: string;
}

export class LocalizedTitlesCrawler {
  private prisma: PrismaClient;
  private options: Required<LocalizedTitlesCrawlerOptions>;
  private progressId?: string;

  constructor(prisma: PrismaClient, options: LocalizedTitlesCrawlerOptions = {}) {
    this.prisma = prisma;
    this.options = {
      batchSize: Math.min(options.batchSize ?? 50, 50), // YouTube API max 50
      maxSongsPerRun: options.maxSongsPerRun ?? 200,
      enableResume: options.enableResume ?? true,
      prioritizePopular: options.prioritizePopular ?? true,
    };

    if (!YOUTUBE_API_KEY) {
      throw new Error('YOUTUBE_API_KEY environment variable is required');
    }
  }

  /**
   * Execute localized titles fetching with progress tracking
   */
  async crawl(): Promise<LocalizedTitlesCrawlerResult> {
    const startTime = Date.now();
    let songsProcessed = 0;
    let songsUpdated = 0;
    let songsFailed = 0;
    let currentOffset = 0;
    let completed = false;

    try {
      console.log(`🌐 Localized Titles Crawler - Fetching Korean titles`);

      // Initialize or resume progress
      if (this.options.enableResume) {
        const existingProgress = await this.prisma.crawlerProgress.findFirst({
          where: {
            crawlerType: 'localized',
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
              crawlerType: 'localized',
              status: 'running',
              startedAt: new Date(),
              lastOffset: 0,
              totalProcessed: 0,
              metadata: {
                batchSize: this.options.batchSize,
                maxSongsPerRun: this.options.maxSongsPerRun,
                prioritizePopular: this.options.prioritizePopular,
              },
            },
          });
          this.progressId = progress.id;
          console.log(`🚀 Starting new localized titles crawler session`);
        }
      }

      // Crawl loop
      while (songsProcessed < this.options.maxSongsPerRun) {
        // Get songs missing Korean titles
        const songs = await this.getSongsNeedingKoreanTitles(currentOffset, this.options.batchSize);

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
      console.log(`\n✅ Localized titles crawler completed in ${duration}s`);
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
      console.error(`💥 Localized titles crawler failed:`, errorMessage);

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
   * Get songs that need Korean titles
   */
  private async getSongsNeedingKoreanTitles(offset: number, limit: number) {
    const whereClause = {
      titleKorean: null, // Only songs without Korean titles
    };

    if (this.options.prioritizePopular) {
      // Prioritize popular songs by view count
      return this.prisma.song.findMany({
        where: whereClause,
        orderBy: { viewCount: 'desc' },
        skip: offset,
        take: limit,
      });
    } else {
      // Order by most recently crawled
      return this.prisma.song.findMany({
        where: whereClause,
        orderBy: { crawledAt: 'desc' },
        skip: offset,
        take: limit,
      });
    }
  }

  /**
   * Process a batch of songs - fetch Korean titles from YouTube
   */
  private async processBatch(songs: any[]): Promise<{ processed: number; updated: number; failed: number }> {
    let processed = 0;
    let updated = 0;
    let failed = 0;

    // Extract YouTube IDs
    const youtubeIds = songs.map(s => s.youtubeId);

    try {
      // Fetch localized snippets from YouTube API
      const url = `${YOUTUBE_API_BASE}/videos?part=snippet,localizations&id=${youtubeIds.join(',')}&key=${YOUTUBE_API_KEY}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const items = data.items || [];

      // Create a map of videoId -> Korean title
      const koreanTitleMap = new Map<string, string>();
      for (const item of items) {
        // Try to get Korean title from localizations
        if (item.localizations?.ko?.title) {
          koreanTitleMap.set(item.id, item.localizations.ko.title);
        } else if (item.localizations?.kr?.title) {
          // Fallback to 'kr' key (some videos use this)
          koreanTitleMap.set(item.id, item.localizations.kr.title);
        } else if (item.snippet?.defaultLanguage === 'ko' && item.snippet?.title) {
          // If default language is Korean, use the main title
          koreanTitleMap.set(item.id, item.snippet.title);
        }
      }

      // Update songs with Korean titles
      for (const song of songs) {
        try {
          const koreanTitle = koreanTitleMap.get(song.youtubeId);

          if (koreanTitle) {
            await this.prisma.song.update({
              where: { vocadbId: song.vocadbId },
              data: {
                titleKorean: koreanTitle,
              },
            });

            updated++;
          } else {
            // No Korean title available
            // We don't mark this as failed - it just doesn't have a Korean title
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
        crawlerType: 'localized',
        status: 'running',
      },
      data: {
        status: 'failed',
        completedAt: new Date(),
        errorMessage: 'Manually reset',
      },
    });
    console.log('✅ Localized titles crawler progress reset');
  }

  /**
   * Get current crawler status
   */
  static async getStatus(prisma: PrismaClient): Promise<any> {
    const latestProgress = await prisma.crawlerProgress.findFirst({
      where: {
        crawlerType: 'localized',
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

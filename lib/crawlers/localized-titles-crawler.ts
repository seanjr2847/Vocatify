/**
 * YouTube Localized Titles Crawler v2 (New Schema)
 *
 * Updated for new relational schema:
 * - YouTube IDs stored in PV table
 * - Korean titles stored in SongName table
 *
 * Features:
 * - Fetches Korean titles from YouTube API
 * - Processes PVs whose songs are missing Korean titles
 * - CrawlerProgress tracking for resumption
 * - Batch processing with API quota management
 * - Designed for weekly Vercel Cron jobs
 */

import { PrismaClient } from '@/lib/generated/prisma';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

export interface LocalizedTitlesCrawlerOptions {
  batchSize?: number;
  maxSongsPerRun?: number;
  enableResume?: boolean;
  prioritizePopular?: boolean;
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

interface PVForLocalization {
  id: number;
  songId: number;
  pvId: string;
  viewCount: bigint | null;
}

export class LocalizedTitlesCrawler {
  private prisma: PrismaClient;
  private options: Required<LocalizedTitlesCrawlerOptions>;
  private progressId?: string;

  constructor(prisma: PrismaClient, options: LocalizedTitlesCrawlerOptions = {}) {
    this.prisma = prisma;
    this.options = {
      batchSize: Math.min(options.batchSize ?? 50, 50),
      maxSongsPerRun: options.maxSongsPerRun ?? 200,
      enableResume: options.enableResume ?? true,
      prioritizePopular: options.prioritizePopular ?? true,
    };

    if (!YOUTUBE_API_KEY) {
      throw new Error('YOUTUBE_API_KEY environment variable is required');
    }
  }

  async crawl(): Promise<LocalizedTitlesCrawlerResult> {
    const startTime = Date.now();
    let songsProcessed = 0;
    let songsUpdated = 0;
    let songsFailed = 0;
    let currentOffset = 0;
    let completed = false;

    try {
      console.log(`🌐 Localized Titles Crawler v2 - Fetching Korean titles`);

      // Initialize or resume progress
      if (this.options.enableResume) {
        const existingProgress = await this.prisma.crawlerProgress.findFirst({
          where: { crawlerType: 'localized', status: 'running' },
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
        const pvs = await this.getPVsNeedingKoreanTitles(currentOffset, this.options.batchSize);

        if (pvs.length === 0) {
          console.log(`✅ No more PVs to process`);
          completed = true;
          break;
        }

        console.log(`📥 Processing batch: ${pvs.length} PVs (offset ${currentOffset})...`);

        const batchResult = await this.processBatch(pvs);
        songsProcessed += batchResult.processed;
        songsUpdated += batchResult.updated;
        songsFailed += batchResult.failed;

        console.log(`   Updated: ${batchResult.updated} songs`);
        console.log(`   Failed: ${batchResult.failed} songs`);
        console.log(`   Total progress: ${songsProcessed}/${this.options.maxSongsPerRun} songs\n`);

        if (this.progressId) {
          await this.prisma.crawlerProgress.update({
            where: { id: this.progressId },
            data: { lastOffset: currentOffset, totalProcessed: songsProcessed },
          });
        }

        if (songsProcessed >= this.options.maxSongsPerRun) {
          console.log(`✅ Reached max songs limit (${this.options.maxSongsPerRun})`);
          break;
        }

        if (pvs.length < this.options.batchSize) {
          console.log(`✅ Processed all available PVs`);
          completed = true;
          break;
        }

        currentOffset += this.options.batchSize;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

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
          data: { status: 'failed', completedAt: new Date(), errorMessage },
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
   * Get YouTube PVs for songs that don't have Korean titles
   */
  private async getPVsNeedingKoreanTitles(offset: number, limit: number): Promise<PVForLocalization[]> {
    // Find YouTube PVs where the associated song doesn't have a Korean SongName
    const pvs = await this.prisma.$queryRaw<PVForLocalization[]>`
      SELECT p.id, p.song_id as "songId", p.pv_id as "pvId", p.view_count as "viewCount"
      FROM pvs p
      WHERE p.service = 'Youtube'
        AND NOT EXISTS (
          SELECT 1 FROM song_names sn
          WHERE sn.song_id = p.song_id AND sn.language = 'Korean'
        )
      ORDER BY ${this.options.prioritizePopular ? 'p.view_count DESC NULLS LAST' : 'p.id ASC'}
      LIMIT ${limit} OFFSET ${offset}
    `;

    return pvs;
  }

  /**
   * Process a batch of PVs - fetch Korean titles from YouTube
   */
  private async processBatch(pvs: PVForLocalization[]): Promise<{
    processed: number;
    updated: number;
    failed: number;
  }> {
    let processed = 0;
    let updated = 0;
    let failed = 0;

    const youtubeIds = pvs.map(pv => pv.pvId);

    try {
      const url = `${YOUTUBE_API_BASE}/videos?part=snippet,localizations&id=${youtubeIds.join(',')}&key=${YOUTUBE_API_KEY}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const items = data.items || [];

      // Create map of videoId -> Korean title
      const koreanTitleMap = new Map<string, string>();
      for (const item of items) {
        if (item.localizations?.ko?.title) {
          koreanTitleMap.set(item.id, item.localizations.ko.title);
        } else if (item.localizations?.kr?.title) {
          koreanTitleMap.set(item.id, item.localizations.kr.title);
        } else if (item.snippet?.defaultLanguage === 'ko' && item.snippet?.title) {
          koreanTitleMap.set(item.id, item.snippet.title);
        }
      }

      // Update songs with Korean titles in SongName table
      for (const pv of pvs) {
        try {
          const koreanTitle = koreanTitleMap.get(pv.pvId);

          if (koreanTitle) {
            // Check if Korean name already exists (safety check)
            const existing = await this.prisma.songName.findFirst({
              where: { songId: pv.songId, language: 'Korean' },
            });

            if (!existing) {
              await this.prisma.songName.create({
                data: {
                  songId: pv.songId,
                  language: 'Korean',
                  value: koreanTitle,
                },
              });
              updated++;
            }
          }
          processed++;

        } catch (error) {
          console.error(`⚠️  Error updating song ${pv.songId}:`, error);
          failed++;
          processed++;
        }
      }

    } catch (error) {
      console.error(`❌ Error fetching YouTube data:`, error);
      failed = pvs.length;
      processed = pvs.length;
    }

    return { processed, updated, failed };
  }

  static async resetProgress(prisma: PrismaClient): Promise<void> {
    await prisma.crawlerProgress.updateMany({
      where: { crawlerType: 'localized', status: 'running' },
      data: { status: 'failed', completedAt: new Date(), errorMessage: 'Manually reset' },
    });
    console.log('✅ Localized titles crawler progress reset');
  }

  static async getStatus(prisma: PrismaClient): Promise<any> {
    const latestProgress = await prisma.crawlerProgress.findFirst({
      where: { crawlerType: 'localized' },
      orderBy: { startedAt: 'desc' },
    });

    if (!latestProgress) {
      return { status: 'never_run', message: 'No crawler progress found' };
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

/**
 * VocaDB PostgreSQL Chunked Crawler
 *
 * Features:
 * - PostgreSQL with Prisma ORM
 * - CrawlerProgress tracking for resumption
 * - Configurable chunk sizes for serverless execution
 * - Error recovery and retry logic
 * - Designed for Vercel Cron jobs
 */

import { PrismaClient } from '@/lib/generated/prisma';

const VOCADB_API_BASE = 'https://vocadb.net/api';

export interface VocaDBCrawlerOptions {
  batchSize?: number;           // Number of songs per API request (default: 100)
  maxSongsPerRun?: number;      // Max songs to process in one execution (default: 1000)
  startOffset?: number;         // Starting offset (default: 0 or resume from last)
  songTypes?: string;           // Song types to crawl (default: 'Original')
  enableResume?: boolean;       // Enable progress tracking for resume (default: true)
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

  /**
   * Execute VocaDB crawling with progress tracking
   */
  async crawl(): Promise<VocaDBCrawlerResult> {
    const startTime = Date.now();
    let songsProcessed = 0;
    let songsInserted = 0;
    let songsSkipped = 0;
    let currentOffset = this.options.startOffset;
    let consecutiveEmpty = 0;
    let completed = false;

    try {
      // Initialize or resume progress
      if (this.options.enableResume) {
        const existingProgress = await this.prisma.crawlerProgress.findFirst({
          where: {
            crawlerType: 'vocadb',
            status: 'running',
          },
        });

        if (existingProgress) {
          // Resume from last offset
          this.progressId = existingProgress.id;
          currentOffset = existingProgress.lastOffset;
          console.log(`🔄 Resuming VocaDB crawler from offset ${currentOffset}`);
        } else {
          // Create new progress entry
          const progress = await this.prisma.crawlerProgress.create({
            data: {
              crawlerType: 'vocadb',
              status: 'running',
              startedAt: new Date(),
              lastOffset: currentOffset,
              totalProcessed: 0,
              metadata: {
                batchSize: this.options.batchSize,
                maxSongsPerRun: this.options.maxSongsPerRun,
                songTypes: this.options.songTypes,
              },
            },
          });
          this.progressId = progress.id;
          console.log(`🚀 Starting new VocaDB crawler session`);
        }
      }

      // Crawl loop
      while (songsProcessed < this.options.maxSongsPerRun) {
        const fields = 'Names,Artists,PVs,Tags,ThumbUrl,MainPicture';
        const url = `${VOCADB_API_BASE}/songs?start=${currentOffset}&maxResults=${this.options.batchSize}&fields=${fields}&songTypes=${this.options.songTypes}&sort=AdditionDate`;

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

          // Process batch
          const batchResult = await this.processBatch(items);
          songsProcessed += batchResult.processed;
          songsInserted += batchResult.inserted;
          songsSkipped += batchResult.skipped;

          console.log(`   Processed: ${batchResult.processed} songs (${batchResult.inserted} inserted, ${batchResult.skipped} skipped)`);
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

          // Check if API returned fewer results than requested
          if (items.length < this.options.batchSize) {
            console.log(`✅ Received fewer results than requested - end of data`);
            completed = true;
            break;
          }

          currentOffset += this.options.batchSize;

          // Small delay to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
          console.error(`❌ Error fetching batch at offset ${currentOffset}:`, error);
          throw error;
        }
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
      console.log(`\n✅ Crawler execution completed in ${duration}s`);
      console.log(`   Songs processed: ${songsProcessed}`);
      console.log(`   Songs inserted: ${songsInserted}`);
      console.log(`   Songs skipped: ${songsSkipped}`);
      console.log(`   Last offset: ${currentOffset}`);
      console.log(`   Fully completed: ${completed ? 'Yes' : 'No'}\n`);

      return {
        success: true,
        songsProcessed,
        songsInserted,
        songsSkipped,
        lastOffset: currentOffset,
        completed,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`💥 Crawler failed:`, errorMessage);

      // Mark as failed
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
        songsInserted,
        songsSkipped,
        lastOffset: currentOffset,
        completed: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Process a batch of songs from VocaDB API
   */
  private async processBatch(items: any[]): Promise<{ processed: number; inserted: number; skipped: number }> {
    let processed = 0;
    let inserted = 0;
    let skipped = 0;

    for (const item of items) {
      try {
        // Filter: Must have YouTube PV
        if (!item.pvs || item.pvs.length === 0) {
          skipped++;
          continue;
        }

        const youtube = item.pvs.find((pv: any) => pv.service === 'Youtube');
        if (!youtube || !youtube.pvId) {
          skipped++;
          continue;
        }

        // Extract multilingual titles
        const names = item.names || [];
        const titleEnglish = names.find((n: any) => n.language === 'English')?.value || null;
        const titleJapanese = names.find((n: any) => n.language === 'Japanese')?.value || null;
        const titleRomaji = names.find((n: any) => n.language === 'Romaji')?.value || null;
        const preferredTitle = titleEnglish || titleRomaji || titleJapanese || item.name;

        // Extract artist type
        let artistType = null;
        if (item.artists && item.artists.length > 0) {
          const vocaloid = item.artists.find((a: any) => a.artist?.artistType === 'Vocaloid');
          const producer = item.artists.find((a: any) => a.artist?.artistType === 'Producer');
          artistType = vocaloid?.artist?.artistType || producer?.artist?.artistType || null;
        }

        // Extract tags
        const tags = (item.tags || [])
          .slice(0, 10)
          .map((t: any) => t.tag?.name || t.name)
          .filter((t: string) => t);

        // Thumbnail
        const thumbUrl = item.mainPicture?.urlThumb || item.thumbUrl || null;

        // Parse publish date
        let publishDate = null;
        if (item.publishDate) {
          try {
            publishDate = new Date(item.publishDate);
            if (isNaN(publishDate.getTime())) {
              publishDate = null;
            }
          } catch {
            publishDate = null;
          }
        }

        // Insert or update song
        await this.prisma.song.upsert({
          where: { vocadbId: item.id },
          update: {
            title: preferredTitle,
            titleEnglish,
            titleJapanese,
            titleRomaji,
            artist: item.artistString,
            artistType,
            youtubeId: youtube.pvId,
            youtubeUrl: `https://www.youtube.com/watch?v=${youtube.pvId}`,
            thumbUrl,
            favoritedTimes: item.favoritedTimes || 0,
            ratingScore: item.ratingScore || 0,
            tags: JSON.stringify(tags),
            publishDate,
            songType: item.songType || null,
            crawledAt: new Date(),
          },
          create: {
            vocadbId: item.id,
            title: preferredTitle,
            titleEnglish,
            titleJapanese,
            titleRomaji,
            artist: item.artistString,
            artistType,
            youtubeId: youtube.pvId,
            youtubeUrl: `https://www.youtube.com/watch?v=${youtube.pvId}`,
            thumbUrl,
            favoritedTimes: item.favoritedTimes || 0,
            ratingScore: item.ratingScore || 0,
            tags: JSON.stringify(tags),
            publishDate,
            songType: item.songType || null,
            crawledAt: new Date(),
          },
        });

        inserted++;
        processed++;

      } catch (error) {
        console.error(`⚠️  Error processing song ${item.id}:`, error);
        skipped++;
      }
    }

    return { processed, inserted, skipped };
  }

  /**
   * Reset failed or stuck crawler progress
   */
  static async resetProgress(prisma: PrismaClient): Promise<void> {
    await prisma.crawlerProgress.updateMany({
      where: {
        crawlerType: 'vocadb',
        status: 'running',
      },
      data: {
        status: 'failed',
        completedAt: new Date(),
        errorMessage: 'Manually reset',
      },
    });
    console.log('✅ VocaDB crawler progress reset');
  }

  /**
   * Get current crawler status
   */
  static async getStatus(prisma: PrismaClient): Promise<any> {
    const latestProgress = await prisma.crawlerProgress.findFirst({
      where: {
        crawlerType: 'vocadb',
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
      totalTarget: latestProgress.totalTarget,
      errorMessage: latestProgress.errorMessage,
      metadata: latestProgress.metadata,
    };
  }
}

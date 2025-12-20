-- CreateTable
CREATE TABLE "songs" (
    "vocadb_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "title_english" TEXT,
    "title_japanese" TEXT,
    "title_romaji" TEXT,
    "title_korean" TEXT,
    "title_original" TEXT,
    "artist" TEXT NOT NULL,
    "artist_type" TEXT,
    "youtube_id" TEXT NOT NULL,
    "youtube_url" TEXT NOT NULL,
    "thumb_url" TEXT,
    "favorited_times" INTEGER NOT NULL DEFAULT 0,
    "rating_score" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT,
    "publish_date" DATE,
    "song_type" TEXT,
    "view_count" INTEGER,
    "view_count_updated_at" TIMESTAMP(3),
    "crawled_at" TIMESTAMP(3) NOT NULL,
    "default_language" TEXT,

    CONSTRAINT "songs_pkey" PRIMARY KEY ("vocadb_id")
);

-- CreateTable
CREATE TABLE "daily_view_counts" (
    "song_id" INTEGER NOT NULL,
    "recorded_date" DATE NOT NULL,
    "total_views" INTEGER NOT NULL,

    CONSTRAINT "daily_view_counts_pkey" PRIMARY KEY ("song_id","recorded_date")
);

-- CreateTable
CREATE TABLE "crawler_progress" (
    "id" TEXT NOT NULL,
    "crawler_type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "last_offset" INTEGER NOT NULL DEFAULT 0,
    "total_processed" INTEGER NOT NULL DEFAULT 0,
    "total_target" INTEGER,
    "error_message" TEXT,
    "metadata" JSONB,

    CONSTRAINT "crawler_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "songs_youtube_id_key" ON "songs"("youtube_id");

-- CreateIndex
CREATE INDEX "idx_songs_viewcount" ON "songs"("view_count" DESC);

-- CreateIndex
CREATE INDEX "idx_songs_favorited" ON "songs"("favorited_times" DESC);

-- CreateIndex
CREATE INDEX "idx_songs_rating" ON "songs"("rating_score" DESC);

-- CreateIndex
CREATE INDEX "idx_songs_publish" ON "songs"("publish_date" DESC);

-- CreateIndex
CREATE INDEX "idx_songs_artist" ON "songs"("artist", "view_count" DESC);

-- CreateIndex
CREATE INDEX "idx_songs_title_korean" ON "songs"("title_korean");

-- CreateIndex
CREATE INDEX "idx_daily_date" ON "daily_view_counts"("recorded_date" DESC);

-- CreateIndex
CREATE INDEX "crawler_progress_crawler_type_status_idx" ON "crawler_progress"("crawler_type", "status");

-- AddForeignKey
ALTER TABLE "daily_view_counts" ADD CONSTRAINT "daily_view_counts_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "songs"("vocadb_id") ON DELETE CASCADE ON UPDATE CASCADE;

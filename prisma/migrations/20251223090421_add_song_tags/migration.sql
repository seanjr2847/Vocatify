-- CreateTable
CREATE TABLE "song_tags" (
    "id" SERIAL NOT NULL,
    "song_id" INTEGER NOT NULL,
    "tag_name" TEXT NOT NULL,
    "tag_category" TEXT,
    "tag_count" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "song_tags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_song_tags_name" ON "song_tags"("tag_name");

-- CreateIndex
CREATE INDEX "idx_song_tags_category" ON "song_tags"("tag_category");

-- CreateIndex
CREATE UNIQUE INDEX "song_tags_song_id_tag_name_key" ON "song_tags"("song_id", "tag_name");

-- CreateIndex
CREATE INDEX "idx_songs_title_search" ON "songs"("title");

-- CreateIndex
CREATE INDEX "idx_songs_title_english_search" ON "songs"("title_english");

-- CreateIndex
CREATE INDEX "idx_songs_title_japanese_search" ON "songs"("title_japanese");

-- CreateIndex
CREATE INDEX "idx_songs_title_romaji_search" ON "songs"("title_romaji");

-- AddForeignKey
ALTER TABLE "song_tags" ADD CONSTRAINT "song_tags_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "songs"("vocadb_id") ON DELETE CASCADE ON UPDATE CASCADE;

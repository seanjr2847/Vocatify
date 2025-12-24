/*
  Warnings:

  - You are about to drop the `song_tags` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "song_tags" DROP CONSTRAINT "song_tags_song_id_fkey";

-- DropTable
DROP TABLE "song_tags";

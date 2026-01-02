import { PrismaClient } from './lib/generated/prisma';
const prisma = new PrismaClient();

const EXCLUDED_TAGS = ['human singers', 'out of scope (cover unifier)'];

async function main() {
  // Get all songs with artistType = Producer or null and high view counts
  const suspects = await prisma.song.findMany({
    where: {
      OR: [
        { artistType: 'Producer' },
        { artistType: null },
      ],
      viewCount: { gt: 10000000 } // 10M+ views
    },
    select: {
      vocadbId: true,
      title: true,
      artist: true,
      viewCount: true,
    }
  });

  console.log(`Checking ${suspects.length} songs with 10M+ views...`);

  const toDelete: number[] = [];

  for (const song of suspects) {
    try {
      const res = await fetch(`https://vocadb.net/api/songs/${song.vocadbId}?fields=Tags`, {
        headers: { "User-Agent": "Vocatify/1.0" }
      });
      const data = await res.json();
      const tags = (data.tags || []).map((t: any) => t.tag?.name || '');

      const hasExcluded = tags.some((tag: string) =>
        EXCLUDED_TAGS.some(excluded => tag.toLowerCase() === excluded.toLowerCase())
      );

      if (hasExcluded) {
        console.log(`❌ ${song.title} - ${song.artist} (${(Number(song.viewCount) / 1000000).toFixed(1)}M)`);
        toDelete.push(song.vocadbId);
      }

      // Rate limit
      await new Promise(r => setTimeout(r, 200));
    } catch (e) {
      console.log(`Error checking ${song.vocadbId}`);
    }
  }

  if (toDelete.length > 0) {
    const deleted = await prisma.song.deleteMany({
      where: { vocadbId: { in: toDelete } }
    });
    console.log(`\nDeleted: ${deleted.count}`);
  } else {
    console.log('\nNo songs to delete');
  }

  await prisma.$disconnect();
}
main();

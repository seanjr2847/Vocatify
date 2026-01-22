/**
 * Test script to verify artist display improvements
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testArtistDisplay() {
  console.log('🧪 Testing Artist Display Improvements\n');

  const testSongIds = [
    610187, // メズマライザー - Multiple roles with SynthesizerV
    42111,  // 少女A - Simple case with Producer + Vocaloid
    278267, // グッバイ宣言 - Multiple artists
  ];

  for (const songId of testSongIds) {
    console.log('─'.repeat(70));

    const song = await prisma.songs.findUnique({
      where: { vocadb_id: songId },
      include: {
        song_artists: {
          include: { artists: true },
          where: { is_support: false },
          orderBy: { id: 'asc' }
        }
      }
    });

    if (!song) {
      console.log(`❌ Song ${songId} not found\n`);
      continue;
    }

    console.log(`\n🎵 Song: ${song.default_name}`);
    console.log(`🆔 VocaDB ID: ${songId}`);
    console.log(`\n👥 Artists by Category:\n`);

    // Group by categories
    const grouped = new Map<string, Array<{ name: string; artistType: string }>>();

    song.song_artists.forEach(sa => {
      const categories = sa.categories.split(',').map(c => c.trim());

      categories.forEach(category => {
        if (!grouped.has(category)) {
          grouped.set(category, []);
        }

        const artist = sa.artists;
        grouped.get(category)!.push({
          name: artist.name,
          artistType: artist.artist_type
        });
      });
    });

    // Sort by common role order
    const roleOrder = ['Producer', 'Vocalist', 'Arranger', 'Instrumentalist', 'Illustrator', 'Animator'];
    const sortedEntries = Array.from(grouped.entries()).sort((a, b) => {
      const indexA = roleOrder.indexOf(a[0]);
      const indexB = roleOrder.indexOf(b[0]);
      const priorityA = indexA === -1 ? roleOrder.length : indexA;
      const priorityB = indexB === -1 ? roleOrder.length : indexB;
      return priorityA - priorityB;
    });

    sortedEntries.forEach(([category, artists]) => {
      console.log(`  ${category}:`);
      artists.forEach(artist => {
        console.log(`    - ${artist.name} (${artist.artistType})`);
      });
    });

    console.log('\n');
  }

  console.log('─'.repeat(70));
  console.log('\n✅ Test completed! Check http://localhost:3004/songs/[songId] to see the UI\n');

  await prisma.$disconnect();
}

testArtistDisplay().catch(console.error);

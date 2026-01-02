import { PrismaClient } from '../lib/generated/prisma';
import { VocaDBCrawler } from '../lib/crawlers/vocadb-crawler';

const prisma = new PrismaClient();

async function test() {
  console.log('🧪 Testing new VocaDB crawler...\n');

  const crawler = new VocaDBCrawler(prisma, {
    batchSize: 10,
    maxSongsPerRun: 10,
    enableResume: false,
  });

  const result = await crawler.crawl();
  console.log('Result:', JSON.stringify(result, null, 2));

  // Check data
  const songs = await prisma.song.count();
  const names = await prisma.songName.count();
  const artists = await prisma.artist.count();
  const songArtists = await prisma.songArtist.count();
  const pvs = await prisma.pV.count();
  const tags = await prisma.tag.count();
  const songTags = await prisma.songTag.count();

  console.log('\n📊 Data counts:');
  console.log('  Songs:', songs);
  console.log('  SongNames:', names);
  console.log('  Artists:', artists);
  console.log('  SongArtists:', songArtists);
  console.log('  PVs:', pvs);
  console.log('  Tags:', tags);
  console.log('  SongTags:', songTags);

  // Sample data
  const sampleSong = await prisma.song.findFirst({
    include: {
      names: true,
      artists: { include: { artist: true } },
      pvs: true,
      tags: { include: { tag: true } },
    },
  });

  if (sampleSong) {
    console.log('\n📝 Sample song:');
    console.log('  ID:', sampleSong.vocadbId);
    console.log('  Name:', sampleSong.defaultName);
    console.log('  Names:', sampleSong.names.map(n => `${n.language}: ${n.value}`).join(', '));
    console.log('  Artists:', sampleSong.artists.map(a => `${a.artist.name} (${a.artist.artistType})`).join(', '));
    console.log('  PVs:', sampleSong.pvs.map(p => `${p.service}: ${p.pvId}`).join(', '));
    console.log('  Tags:', sampleSong.tags.map(t => t.tag.name).join(', '));
  }

  await prisma.$disconnect();
}

test().catch(console.error);

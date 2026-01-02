import { PrismaClient } from '../lib/generated/prisma';
const prisma = new PrismaClient();

async function main() {
  // Check all tables
  const tables = await prisma.$queryRawUnsafe(`
    SELECT tablename, pg_size_pretty(pg_total_relation_size(quote_ident(tablename)::text)) as size
    FROM pg_tables WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(quote_ident(tablename)::text) DESC
  `);
  console.log('📊 Table sizes:');
  console.table(tables);

  // Check for backup tables
  const backupTables = await prisma.$queryRawUnsafe(`
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' AND tablename LIKE '%backup%'
  `);
  console.log('\n🗄️ Backup tables:', backupTables);

  // Row counts
  const counts = await Promise.all([
    prisma.song.count().then(c => ({ table: 'songs', count: c })),
    prisma.songName.count().then(c => ({ table: 'song_names', count: c })),
    prisma.artist.count().then(c => ({ table: 'artists', count: c })),
    prisma.pV.count().then(c => ({ table: 'pvs', count: c })),
    prisma.tag.count().then(c => ({ table: 'tags', count: c })),
    prisma.songTag.count().then(c => ({ table: 'song_tags', count: c })),
    prisma.lyrics.count().then(c => ({ table: 'lyrics', count: c })),
  ]);
  console.log('\n📈 Row counts:');
  console.table(counts);

  await prisma.$disconnect();
}
main();

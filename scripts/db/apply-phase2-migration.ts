import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

async function applyPhase2Migration() {
  console.log('🚀 Phase 2: Creating songs_enhanced Table\n');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Read migration SQL
    const migrationPath = path.join(
      __dirname,
      '../../prisma/migrations/20260122161325_add_songs_enhanced_table/migration.sql'
    );

    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration file loaded successfully\n');
    console.log('📊 Creating songs_enhanced table with:');
    console.log('  - Denormalized song data (titles, artists, YouTube info)');
    console.log('  - Pre-computed statistics (daily/weekly increases)');
    console.log('  - 9 optimized indexes (3 partial indexes)\n');

    console.log('⏱️  This may take 30-60 seconds...\n');

    const startTime = Date.now();
    await client.query(sql);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`✅ Table created in ${duration}s\n`);

    // Verify table creation
    console.log('🔍 Verifying table structure...\n');

    const tableInfo = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'songs_enhanced'
      ORDER BY ordinal_position;
    `);

    console.log('Created columns:');
    tableInfo.rows.slice(0, 10).forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`  ✓ ${col.column_name.padEnd(25)} ${col.data_type.padEnd(20)} ${nullable}`);
    });

    if (tableInfo.rows.length > 10) {
      console.log(`  ... and ${tableInfo.rows.length - 10} more columns`);
    }

    // Verify indexes
    const indexInfo = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'songs_enhanced'
      ORDER BY indexname;
    `);

    console.log(`\nCreated indexes (${indexInfo.rows.length} total):`);
    indexInfo.rows.forEach(idx => {
      console.log(`  ✓ ${idx.indexname}`);
    });

    console.log('\n📈 Next Steps:');
    console.log('  1. Run initial data sync: npm run sync:songs-enhanced');
    console.log('  2. Set up triggers for automatic sync');
    console.log('  3. Create new optimized query functions');
    console.log('  4. A/B test old vs new queries\n');

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

applyPhase2Migration()
  .then(() => {
    console.log('\n🎉 Phase 2 migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });

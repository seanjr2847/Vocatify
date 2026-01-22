import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function applyPhase1Indexes() {
  console.log('🚀 Phase 1: Applying Composite Indexes\n');

  // Create direct PostgreSQL connection (no transaction)
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Read migration SQL
    const migrationPath = path.join(
      __dirname,
      '../../prisma/migrations/20260122155912_add_composite_indexes_phase1/migration.sql'
    );

    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration file loaded successfully\n');
    console.log('📊 Indexes to be created:');
    console.log('  1. idx_daily_pv_date_views (daily_view_counts)');
    console.log('  2. idx_pvs_youtube_song_views (pvs)');
    console.log('  3. idx_song_artists_included (song_artists)');
    console.log('  4. idx_artists_type_filter (artists)');
    console.log('  5. idx_song_names_multilang (song_names)\n');

    console.log('⚠️  Note: Using CONCURRENTLY to prevent table locks');
    console.log('⏱️  This may take 1-3 minutes depending on data size\n');

    // Split SQL into individual statements
    // Remove comments and extract CREATE INDEX statements
    const cleanedSql = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');

    const statements = cleanedSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && s.toUpperCase().includes('CREATE INDEX'));

    console.log(`Found ${statements.length} index creation statements\n`);

    // Execute each statement (without transaction)
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      const indexName = statement.match(/"idx_[^"]+"/)?.[0] || `Index ${i + 1}`;

      console.log(`[${i + 1}/${statements.length}] Creating ${indexName}...`);

      const startTime = Date.now();

      try {
        await client.query(statement);
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`    ✅ Created in ${duration}s`);
      } catch (error: any) {
        if (error.message?.includes('already exists')) {
          console.log(`    ⚠️  Already exists, skipping`);
        } else {
          console.error(`    ❌ Failed: ${error.message}`);
          throw error;
        }
      }
    }

    console.log('\n✅ Phase 1 indexes applied successfully!\n');

    // Verify index creation
    console.log('🔍 Verifying index creation...\n');

    const result = await client.query(`
      SELECT
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE indexname LIKE 'idx_%'
        AND (
          indexname LIKE '%daily_pv_date_views%' OR
          indexname LIKE '%pvs_youtube_song_views%' OR
          indexname LIKE '%song_artists_included%' OR
          indexname LIKE '%artists_type_filter%' OR
          indexname LIKE '%song_names_multilang%'
        )
      ORDER BY tablename, indexname;
    `);

    console.log('Created indexes:');
    result.rows.forEach(idx => {
      console.log(`  ✓ ${idx.tablename}.${idx.indexname}`);
    });

    console.log('\n📈 Next Steps:');
    console.log('  1. Run performance benchmarks: npm run bench:phase1');
    console.log('  2. Monitor index usage in production');
    console.log('  3. Proceed to Phase 2 after validation\n');

  } catch (error) {
    console.error('❌ Error applying indexes:', error);
    throw error;
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

applyPhase1Indexes()
  .then(() => {
    console.log('\n🎉 Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });

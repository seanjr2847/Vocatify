import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function computeIncreases() {
  console.log('📊 Computing daily and weekly increases for songs_enhanced\n');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Step 1: Compute daily increases
    console.log('⏱️  Step 1/2: Computing daily increases...');
    const dailyStart = Date.now();

    const dailyQuery = `
      UPDATE songs_enhanced se
      SET
        daily_increase = dc.daily_increase,
        daily_increase_date = dc.recorded_date,
        last_synced_at = NOW()
      FROM (
        SELECT
          pv.song_id,
          dvc.recorded_date,
          dvc.total_views - LAG(dvc.total_views) OVER (
            PARTITION BY dvc.pv_id
            ORDER BY dvc.recorded_date
          ) as daily_increase
        FROM daily_view_counts dvc
        JOIN pvs pv ON dvc.pv_id = pv.id
        WHERE dvc.recorded_date = (
          SELECT MAX(recorded_date)
          FROM daily_view_counts
        )
        AND pv.service = 'Youtube'
      ) dc
      WHERE se.song_id = dc.song_id
        AND dc.daily_increase IS NOT NULL
        AND dc.daily_increase > 0;
    `;

    const dailyResult = await client.query(dailyQuery);
    const dailyDuration = ((Date.now() - dailyStart) / 1000).toFixed(2);

    console.log(`   ✅ Updated ${dailyResult.rowCount?.toLocaleString()} songs in ${dailyDuration}s\n`);

    // Step 2: Compute weekly increases
    console.log('⏱️  Step 2/2: Computing weekly increases...');
    const weeklyStart = Date.now();

    const weeklyQuery = `
      UPDATE songs_enhanced se
      SET
        weekly_increase = wc.weekly_increase,
        weekly_increase_date = wc.current_date,
        last_synced_at = NOW()
      FROM (
        SELECT
          pv.song_id,
          current_date,
          current_views - previous_views as weekly_increase
        FROM (
          SELECT
            pv_id,
            MAX(CASE WHEN recorded_date = (SELECT MAX(recorded_date) FROM daily_view_counts) THEN total_views END) as current_views,
            MAX(CASE WHEN recorded_date = (SELECT MAX(recorded_date) FROM daily_view_counts) - INTERVAL '7 days' THEN total_views END) as previous_views,
            MAX(recorded_date) as current_date
          FROM daily_view_counts
          WHERE recorded_date >= (SELECT MAX(recorded_date) FROM daily_view_counts) - INTERVAL '8 days'
          GROUP BY pv_id
        ) stats
        JOIN pvs pv ON stats.pv_id = pv.id
        WHERE current_views IS NOT NULL
          AND previous_views IS NOT NULL
          AND pv.service = 'Youtube'
      ) wc
      WHERE se.song_id = wc.song_id
        AND wc.weekly_increase IS NOT NULL
        AND wc.weekly_increase > 0;
    `;

    const weeklyResult = await client.query(weeklyQuery);
    const weeklyDuration = ((Date.now() - weeklyStart) / 1000).toFixed(2);

    console.log(`   ✅ Updated ${weeklyResult.rowCount?.toLocaleString()} songs in ${weeklyDuration}s\n`);

    // Verification
    console.log('🔍 Verification:\n');

    const stats = await client.query(`
      SELECT
        COUNT(*) as total_songs,
        COUNT(*) FILTER (WHERE daily_increase IS NOT NULL) as with_daily,
        COUNT(*) FILTER (WHERE weekly_increase IS NOT NULL) as with_weekly,
        COUNT(*) FILTER (WHERE daily_increase > 0) as positive_daily,
        COUNT(*) FILTER (WHERE weekly_increase > 0) as positive_weekly
      FROM songs_enhanced
      WHERE is_vocaloid_song = true;
    `);

    const s = stats.rows[0];
    console.log('📈 Statistics (Vocaloid songs):');
    console.log(`  Total songs: ${parseInt(s.total_songs).toLocaleString()}`);
    console.log(`  With daily increase: ${parseInt(s.with_daily).toLocaleString()} (${((s.with_daily/s.total_songs)*100).toFixed(1)}%)`);
    console.log(`  With weekly increase: ${parseInt(s.with_weekly).toLocaleString()} (${((s.with_weekly/s.total_songs)*100).toFixed(1)}%)`);
    console.log(`  Positive daily: ${parseInt(s.positive_daily).toLocaleString()}`);
    console.log(`  Positive weekly: ${parseInt(s.positive_weekly).toLocaleString()}\n`);

    // Sample top daily increases
    const topDaily = await client.query(`
      SELECT
        song_id,
        default_name,
        title_korean,
        daily_increase,
        view_count
      FROM songs_enhanced
      WHERE is_vocaloid_song = true
        AND daily_increase > 0
      ORDER BY daily_increase DESC
      LIMIT 5;
    `);

    console.log('🔥 Top 5 Daily Increases:');
    topDaily.rows.forEach((row, idx) => {
      const title = row.title_korean || row.default_name;
      const increase = parseInt(row.daily_increase).toLocaleString();
      const total = parseInt(row.view_count).toLocaleString();
      console.log(`  ${idx + 1}. ${title.substring(0, 40)} - +${increase} (${total} total)`);
    });

    // Sample top weekly increases
    const topWeekly = await client.query(`
      SELECT
        song_id,
        default_name,
        title_korean,
        weekly_increase,
        view_count
      FROM songs_enhanced
      WHERE is_vocaloid_song = true
        AND weekly_increase > 0
      ORDER BY weekly_increase DESC
      LIMIT 5;
    `);

    console.log('\n📅 Top 5 Weekly Increases:');
    topWeekly.rows.forEach((row, idx) => {
      const title = row.title_korean || row.default_name;
      const increase = parseInt(row.weekly_increase).toLocaleString();
      const total = parseInt(row.view_count).toLocaleString();
      console.log(`  ${idx + 1}. ${title.substring(0, 40)} - +${increase} (${total} total)`);
    });

    console.log('\n📝 Next Steps:');
    console.log('  1. Create optimized query functions (lib/db-v2.ts)');
    console.log('  2. Run A/B tests to compare performance');
    console.log('  3. Set up daily cron job for this script\n');

  } catch (error: any) {
    console.error('❌ Computation failed:', error.message);
    console.error(error);
    throw error;
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

computeIncreases()
  .then(() => {
    console.log('\n🎉 Increases computed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Computation failed:', error);
    process.exit(1);
  });

/**
 * VocaDB API Response Test
 * Check if all data is properly retrieved (especially tags)
 */

const VOCADB_API_BASE = 'https://vocadb.net/api';

async function testVocaDBAPI() {
  console.log('🧪 Testing VocaDB API Response\n');

  // Test with a popular song that likely has many tags
  const fields = 'Names,Artists,PVs,Tags,Lyrics,ThumbUrl,MainPicture';
  const url = `${VOCADB_API_BASE}/songs?start=0&maxResults=3&fields=${fields}&songTypes=Original&sort=FavoritedTimes`;

  console.log('📡 Fetching top 3 most favorited songs...\n');

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Vocatify/1.0',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const items = data.items || [];

    console.log(`✅ Received ${items.length} songs\n`);

    // Analyze first song in detail
    for (const [idx, item] of items.entries()) {
      console.log(`${'='.repeat(60)}`);
      console.log(`Song ${idx + 1}: ${item.name} (ID: ${item.id})`);
      console.log(`${'='.repeat(60)}`);
      console.log(`\n📝 Names: ${item.names?.length || 0}`);
      console.log(`🎤 Artists: ${item.artists?.length || 0}`);
      console.log(`🎬 PVs: ${item.pvs?.length || 0}`);
      console.log(`🏷️  Tags: ${item.tags?.length || 0}`);
      console.log(`📄 Lyrics: ${item.lyrics?.length || 0}`);

      if (item.tags && item.tags.length > 0) {
        console.log(`\n🏷️  Tag Details:`);
        item.tags.forEach((t: any, i: number) => {
          const tag = t.tag || t;
          console.log(`   ${i + 1}. ${tag.name} (count: ${t.count || 0}, category: ${tag.categoryName || 'none'})`);
        });
      }

      // Check if response includes totalCount for tags
      console.log(`\n📊 Response structure check:`);
      console.log(`   - tags is array: ${Array.isArray(item.tags)}`);
      console.log(`   - Response has 'totalCount': ${'totalCount' in data}`);
      if ('totalCount' in data) {
        console.log(`   - Total available songs: ${data.totalCount}`);
      }

      console.log('\n');
    }

    // Check API limits
    console.log(`\n⚠️  Potential Issues:`);
    console.log(`   - VocaDB API may limit tags per song`);
    console.log(`   - Check VocaDB API docs: https://vocadb.net/api`);
    console.log(`   - Consider using tagTarget parameter if available\n`);

    // Save sample response for inspection
    console.log(`💾 Full response saved to: vocadb-api-sample.json`);
    const fs = await import('fs/promises');
    await fs.writeFile('vocadb-api-sample.json', JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('❌ API test failed:', error);
  }
}

testVocaDBAPI();

/**
 * Debug YouTube API Response
 *
 * Tests if YouTube API is working correctly
 */

import { PrismaClient } from '../../lib/generated/prisma';

const prisma = new PrismaClient();
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

async function main() {
  console.log('🔍 Testing YouTube API...\n');

  // Get a few sample PVs
  const samplePVs = await prisma.pV.findMany({
    where: {
      service: 'Youtube',
      disabled: false,
    },
    take: 5,
    orderBy: { id: 'asc' },
  });

  if (samplePVs.length === 0) {
    console.log('❌ No YouTube PVs found in database');
    return;
  }

  console.log(`📺 Sample PVs (${samplePVs.length}):`);
  samplePVs.forEach((pv, idx) => {
    console.log(`   ${idx + 1}. ${pv.pvId} (songId: ${pv.songId})`);
  });

  const youtubeIds = samplePVs.map(pv => pv.pvId);
  const url = `${YOUTUBE_API_BASE}/videos?part=statistics,snippet,localizations&id=${youtubeIds.join(',')}&key=${YOUTUBE_API_KEY}`;

  console.log(`\n🌐 API URL (masked key):`);
  console.log(`   ${url.replace(YOUTUBE_API_KEY!, '***')}\n`);

  console.log('📡 Calling YouTube API...\n');

  const response = await fetch(url);

  console.log(`📊 Response Status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.log(`❌ API Error Response:`);
    console.log(errorText);
    return;
  }

  const data = await response.json();

  console.log(`\n📦 API Response:`);
  console.log(`   Items returned: ${data.items?.length || 0}`);

  if (data.error) {
    console.log(`\n❌ API Error:`);
    console.log(JSON.stringify(data.error, null, 2));
    return;
  }

  if (data.items && data.items.length > 0) {
    console.log(`\n✅ Sample Item 1:`);
    const item = data.items[0];
    console.log(`   Video ID: ${item.id}`);
    console.log(`   Title: ${item.snippet?.title || 'N/A'}`);
    console.log(`   View Count: ${item.statistics?.viewCount || 'N/A'}`);
    console.log(`   Korean Title: ${item.localizations?.ko?.title || item.localizations?.kr?.title || 'N/A'}`);
  } else {
    console.log(`\n⚠️  No items returned for these video IDs`);
    console.log(`   This could mean:`);
    console.log(`   - Videos are deleted or private`);
    console.log(`   - Video IDs are incorrect`);
    console.log(`   - API quota exceeded`);
  }

  console.log(`\n💡 API Key Status:`);
  console.log(`   ${YOUTUBE_API_KEY ? `Set (length: ${YOUTUBE_API_KEY.length})` : '❌ NOT SET'}`);
}

main()
  .catch(error => {
    console.error('💥 Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

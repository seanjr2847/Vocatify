import { prisma } from '@/lib/prisma';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

async function test() {
  console.log('🔍 Testing YouTube API...\n');

  if (!YOUTUBE_API_KEY) {
    console.error('❌ YOUTUBE_API_KEY not set!');
    return;
  }

  console.log(`✅ API Key exists: ${YOUTUBE_API_KEY.slice(0, 10)}...`);

  // Get first 5 PV IDs
  const pvs = await prisma.pvs.findMany({
    where: { service: 'Youtube' },
    select: { pv_id: true },
    orderBy: { id: 'asc' },
    take: 5,
  });

  const pvIds = pvs.map(p => p.pv_id);
  console.log(`\nTesting with ${pvIds.length} video IDs: ${pvIds.join(', ')}`);

  // Call YouTube API
  const url = `${YOUTUBE_API_BASE}/videos?part=statistics&id=${pvIds.join(',')}&key=${YOUTUBE_API_KEY}`;
  console.log(`\nAPI URL: ${url.replace(YOUTUBE_API_KEY, 'API_KEY_HIDDEN')}`);

  try {
    const response = await fetch(url);
    console.log(`\nHTTP Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('❌ API Error Response:', errorBody);
      return;
    }

    const data = await response.json();
    console.log(`\n✅ Success! Received ${data.items?.length || 0} videos`);

    if (data.items && data.items.length > 0) {
      console.log('\nSample responses:');
      data.items.forEach((item: any, i: number) => {
        console.log(`  ${i+1}. ID: ${item.id}, Views: ${item.statistics?.viewCount || 'N/A'}`);
      });
    } else {
      console.log('\n⚠️  No items returned from API');
    }

    if (data.error) {
      console.error('\n❌ API returned error:', JSON.stringify(data.error, null, 2));
    }

  } catch (error) {
    console.error('❌ Fetch error:', error);
  }

  await prisma.$disconnect();
}

test().catch(console.error);

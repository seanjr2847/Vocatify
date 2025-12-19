/**
 * VocaDB API 간단 테스트
 */

console.log('🧪 VocaDB API 테스트 시작\n');

const VOCADB_API_BASE = 'https://vocadb.net/api';

async function testAPI() {
  try {
    const url = `${VOCADB_API_BASE}/songs?start=0&maxResults=5&fields=PVs&getTotalCount=true`;

    console.log(`📡 요청 URL: ${url}\n`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Vocatify-Test/1.0',
        'Accept': 'application/json',
      },
    });

    console.log(`✅ 응답 상태: ${response.status} ${response.statusText}\n`);

    if (!response.ok) {
      throw new Error(`API 요청 실패: ${response.status}`);
    }

    const data = await response.json();

    console.log(`📊 결과:`);
    console.log(`   - 총 곡 수: ${data.totalCount || 0}`);
    console.log(`   - 받은 곡 수: ${data.items?.length || 0}`);

    if (data.items && data.items.length > 0) {
      console.log(`\n🎵 첫 번째 곡:`);
      const song = data.items[0];
      console.log(`   - ID: ${song.id}`);
      console.log(`   - 제목: ${song.name}`);
      console.log(`   - 아티스트: ${song.artistString}`);
      console.log(`   - 타입: ${song.songType}`);

      if (song.pvs && song.pvs.length > 0) {
        const youtube = song.pvs.find((pv: any) => pv.service === 'Youtube');
        if (youtube) {
          console.log(`   - YouTube ID: ${youtube.pvId}`);
          console.log(`   - YouTube URL: https://www.youtube.com/watch?v=${youtube.pvId}`);
        }
      }
    }

    console.log('\n✅ API 테스트 성공!');

  } catch (error) {
    console.error('\n❌ API 테스트 실패:', error);
    process.exit(1);
  }
}

testAPI();

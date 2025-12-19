/**
 * VocaDB 이름 필드 테스트
 * 다국어 이름을 제대로 가져오는지 확인
 */

console.log('🧪 VocaDB 다국어 이름 테스트\n');

const VOCADB_API_BASE = 'https://vocadb.net/api';

async function testNames() {
  try {
    // Names 필드 포함해서 요청
    const url = `${VOCADB_API_BASE}/songs?start=0&maxResults=5&fields=PVs,Names,MainPicture&lang=English`;

    console.log(`📡 요청: ${url}\n`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Vocatify-Test/1.0',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API 에러: ${response.status}`);
    }

    const data = await response.json();

    console.log(`📊 결과: ${data.items?.length}곡\n`);

    // 첫 3곡 자세히 분석
    for (let i = 0; i < Math.min(3, data.items.length); i++) {
      const song = data.items[i];

      console.log(`\n🎵 곡 ${i + 1}:`);
      console.log(`   VocaDB ID: ${song.id}`);
      console.log(`   기본 name: "${song.name}"`);
      console.log(`   artistString: "${song.artistString}"`);
      console.log(`   defaultName: "${song.defaultName}"`);
      console.log(`   songType: ${song.songType}`);

      // 다국어 이름들 확인
      if (song.names && song.names.length > 0) {
        console.log(`\n   📝 사용 가능한 이름들:`);
        song.names.forEach((nameObj: any) => {
          console.log(`      [${nameObj.language}] "${nameObj.value}"`);
        });

        // 선호 순서: English > Romaji > Japanese > Original
        const preferredName =
          song.names.find((n: any) => n.language === 'English')?.value ||
          song.names.find((n: any) => n.language === 'Romaji')?.value ||
          song.names.find((n: any) => n.language === 'Japanese')?.value ||
          song.names[0]?.value ||
          song.name;

        console.log(`\n   ✅ 추천 제목: "${preferredName}"`);
      }

      // YouTube 정보
      if (song.pvs && song.pvs.length > 0) {
        const youtube = song.pvs.find((pv: any) => pv.service === 'Youtube');
        if (youtube) {
          console.log(`   🎥 YouTube: ${youtube.pvId}`);
        }
      }
    }

    console.log('\n\n💡 권장사항:');
    console.log('   1. fields=Names 추가');
    console.log('   2. 선호 언어 순서로 이름 선택');
    console.log('   3. English > Romaji > Japanese > Original');

  } catch (error) {
    console.error('❌ 에러:', error);
  }
}

testNames();

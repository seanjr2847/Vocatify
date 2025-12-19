/**
 * VocaDB API 사용 가능한 필드 확인
 */

console.log('🔍 VocaDB API 필드 확인\n');

const VOCADB_API_BASE = 'https://vocadb.net/api';

async function testAllFields() {
  try {
    // 모든 필드 포함
    const url = `${VOCADB_API_BASE}/songs?start=0&maxResults=1&fields=AdditionalNames,Albums,Artists,Names,PVs,Tags,ThumbUrl,WebLinks,MainPicture&lang=Default`;

    console.log('📡 API 요청 (모든 필드 포함)...\n');

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Vocatify-Test/1.0',
        'Accept': 'application/json',
      },
    });

    const data = await response.json();
    const song = data.items[0];

    console.log('📊 사용 가능한 데이터:\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📌 기본 정보:');
    console.log(`   id: ${song.id}`);
    console.log(`   name: "${song.name}"`);
    console.log(`   defaultName: "${song.defaultName}"`);
    console.log(`   songType: ${song.songType}`);
    console.log(`   artistString: "${song.artistString}"`);
    console.log(`   favoritedTimes: ${song.favoritedTimes}`);
    console.log(`   ratingScore: ${song.ratingScore}`);

    console.log('\n🎤 아티스트 (Artists):');
    if (song.artists && song.artists.length > 0) {
      song.artists.slice(0, 3).forEach((artist: any) => {
        console.log(`   - ${artist.name} (${artist.artist?.artistType})`);
      });
    }

    console.log('\n📝 다국어 이름 (Names):');
    if (song.names && song.names.length > 0) {
      song.names.forEach((name: any) => {
        console.log(`   [${name.language}] "${name.value}"`);
      });
    }

    console.log('\n💿 앨범 (Albums):');
    if (song.albums && song.albums.length > 0) {
      song.albums.slice(0, 3).forEach((album: any) => {
        console.log(`   - ${album.name}`);
      });
    }

    console.log('\n🎥 비디오/PV (PVs):');
    if (song.pvs && song.pvs.length > 0) {
      song.pvs.forEach((pv: any) => {
        console.log(`   - ${pv.service}: ${pv.pvId} (${pv.pvType})`);
        console.log(`     URL: ${pv.url || 'N/A'}`);
      });
    }

    console.log('\n🏷️  태그 (Tags):');
    if (song.tags && song.tags.length > 0) {
      const tagNames = song.tags.slice(0, 10).map((t: any) => t.tag?.name || t.name).join(', ');
      console.log(`   ${tagNames}`);
    }

    console.log('\n🖼️  이미지:');
    console.log(`   thumbUrl: ${song.thumbUrl || 'N/A'}`);
    if (song.mainPicture) {
      console.log(`   mainPicture: ${song.mainPicture.urlOriginal || song.mainPicture.urlThumb}`);
    }

    console.log('\n🔗 웹 링크 (WebLinks):');
    if (song.webLinks && song.webLinks.length > 0) {
      song.webLinks.slice(0, 5).forEach((link: any) => {
        console.log(`   - ${link.category}: ${link.url}`);
      });
    }

    console.log('\n📅 날짜:');
    console.log(`   createDate: ${song.createDate}`);
    console.log(`   publishDate: ${song.publishDate || 'N/A'}`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📋 전체 JSON 구조:\n');
    console.log(JSON.stringify(song, null, 2));

    console.log('\n\n✅ 사용 가능한 fields 파라미터:');
    console.log('   - AdditionalNames: 추가 이름');
    console.log('   - Albums: 앨범 정보');
    console.log('   - Artists: 아티스트 상세 정보');
    console.log('   - Names: 다국어 이름');
    console.log('   - PVs: YouTube 등 비디오');
    console.log('   - Tags: 태그/장르');
    console.log('   - ThumbUrl: 썸네일 이미지');
    console.log('   - WebLinks: 외부 링크');
    console.log('   - MainPicture: 메인 이미지');

  } catch (error) {
    console.error('❌ 에러:', error);
  }
}

testAllFields();

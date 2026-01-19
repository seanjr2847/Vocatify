import { prisma } from '../lib/prisma';

async function checkUpdateCounts() {
  // 어제와 오늘 업데이트된 PV 개수 확인
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterdayUpdates = await prisma.pvs.count({
    where: {
      view_count_updated_at: {
        gte: yesterday,
        lt: today,
      },
    },
  });

  const todayUpdates = await prisma.pvs.count({
    where: {
      view_count_updated_at: {
        gte: today,
      },
    },
  });

  const totalPvs = await prisma.pvs.count();

  console.log('📊 PV 업데이트 현황:');
  console.log(`  전체 PV: ${totalPvs.toLocaleString()}개`);
  console.log(`  어제 업데이트: ${yesterdayUpdates.toLocaleString()}개`);
  console.log(`  오늘 업데이트: ${todayUpdates.toLocaleString()}개`);
  console.log('');
  console.log('💡 분석:');

  if (todayUpdates >= totalPvs * 0.9) {
    console.log('  ✅ 거의 모든 PV가 업데이트됨 (정상 완료)');
  } else if (todayUpdates >= 15000) {
    console.log('  ⚠️ 일부만 업데이트됨 (부분 완료)');
    console.log(`     - 10청크 × 1라운드 = 약 20,000개 예상`);
    console.log(`     - 실제: ${todayUpdates.toLocaleString()}개`);
  } else {
    console.log('  ❌ 매우 적은 PV만 업데이트됨 (실패)');
  }

  await prisma.$disconnect();
}

checkUpdateCounts().catch(console.error);

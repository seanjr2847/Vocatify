/**
 * Prisma Client 설정
 * PostgreSQL 데이터베이스 연결 관리
 */

import { PrismaClient } from '@/lib/generated/prisma';

// PrismaClient 싱글톤 인스턴스
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error'], // 성능 최적화: 로깅 최소화
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;

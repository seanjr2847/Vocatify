/**
 * Prisma Client 설정
 * PostgreSQL 데이터베이스 연결 관리
 */

import { PrismaClient } from '@prisma/client';

// PrismaClient 싱글톤 인스턴스
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;

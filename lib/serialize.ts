/**
 * JSON 직렬화 유틸리티
 * BigInt와 Prisma Decimal을 string으로 변환하여 JSON 직렬화 오류 방지
 */

import { Decimal } from '@prisma/client/runtime/library';

/**
 * 객체 내의 모든 BigInt와 Decimal 값을 string으로 변환
 * @param obj 변환할 객체
 * @returns BigInt/Decimal이 string으로 변환된 객체
 */
export function serializeBigInt<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_, value) => {
      if (typeof value === 'bigint') {
        return value.toString();
      }
      if (value instanceof Decimal) {
        return value.toString();
      }
      return value;
    })
  );
}

/**
 * 단일 BigInt 또는 null 값을 string으로 변환
 * @param value BigInt 또는 null 값
 * @returns string 또는 null
 */
export function bigIntToString(value: bigint | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return value.toString();
}

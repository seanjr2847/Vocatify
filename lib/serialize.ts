/**
 * JSON 직렬화 유틸리티
 * BigInt를 string으로 변환하여 JSON 직렬화 오류 방지
 */

/**
 * 객체 내의 모든 BigInt 값을 string으로 변환
 * @param obj 변환할 객체
 * @returns BigInt가 string으로 변환된 객체
 */
export function serializeBigInt<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
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

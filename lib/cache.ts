/**
 * Simple in-memory cache for ranking results
 * - 5분 TTL로 랭킹 결과 캐싱
 * - 메모리 사용량 최소화
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5분

  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // TTL 체크
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // 주기적으로 만료된 항목 제거 (메모리 관리)
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // 캐시 크기
  get size(): number {
    return this.cache.size;
  }
}

// 싱글톤 인스턴스
export const cache = new SimpleCache();

// 10분마다 만료된 항목 정리
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    cache.cleanup();
  }, 10 * 60 * 1000);
}

/**
 * 랭킹 캐시 헬퍼 함수
 */
export interface UnifiedRankings {
  totalRanking: any[];
  weeklyRanking: any[];
  newRanking: any[];
}

export function getCachedRankings(limit: number): UnifiedRankings | null {
  return cache.get<UnifiedRankings>(`rankings:${limit}`);
}

export function setCachedRankings(limit: number, data: UnifiedRankings) {
  cache.set(`rankings:${limit}`, data);
}

export function invalidateRankingsCache() {
  // 모든 랭킹 캐시 무효화
  cache.clear();
}

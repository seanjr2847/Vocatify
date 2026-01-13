/**
 * Database Error Handler
 * Handles connection pool timeouts and retries
 */

import { PrismaClientKnownRequestError } from '@/lib/generated/prisma/runtime/library';

export interface RetryConfig {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

const defaultRetryConfig: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelay: 100,
  maxDelay: 2000,
  backoffMultiplier: 2,
};

/**
 * Execute a database query with retry logic for connection pool timeouts
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const { maxRetries, initialDelay, maxDelay, backoffMultiplier } = {
    ...defaultRetryConfig,
    ...config,
  };

  let lastError: Error | undefined;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Check if it's a connection pool timeout error
      const isPoolTimeout =
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2024';

      // If it's not a pool timeout or we've exhausted retries, throw immediately
      if (!isPoolTimeout || attempt === maxRetries) {
        throw error;
      }

      // Log retry attempt
      console.warn(
        `[DB] Connection pool timeout, retrying (${attempt + 1}/${maxRetries}) after ${delay}ms...`
      );

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Exponential backoff with max delay cap
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError;
}

/**
 * Check if error is a connection pool timeout
 */
export function isConnectionPoolTimeout(error: unknown): boolean {
  return (
    error instanceof PrismaClientKnownRequestError && error.code === 'P2024'
  );
}

import { auth } from "./auth";

/**
 * Server-side function to get the current session
 * Use this in Server Components and Server Actions
 */
export async function getSession() {
  return await auth();
}

/**
 * Server-side function to get the current user
 * Returns null if not authenticated
 */
export async function getCurrentUser() {
  const session = await getSession();
  return session?.user ?? null;
}

/**
 * Server-side function to require authentication
 * Throws an error if not authenticated
 */
export async function requireAuth() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  pages: {
    signIn: "/signin",
  },
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnProtectedRoute =
        nextUrl.pathname.startsWith("/profile") ||
        nextUrl.pathname.startsWith("/playlists") ||
        nextUrl.pathname.startsWith("/settings");

      if (isOnProtectedRoute) {
        if (isLoggedIn) return true;

        // Redirect to sign-in with callback URL
        const signInUrl = new URL("/signin", nextUrl.origin);
        signInUrl.searchParams.set("callbackUrl", nextUrl.href);
        return Response.redirect(signInUrl);
      }

      return true;
    },
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
};

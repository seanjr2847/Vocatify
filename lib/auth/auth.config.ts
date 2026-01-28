import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  pages: {
    signIn: "/signin",
  },
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in - add user id to token
      if (user) {
        token.id = user.id;
      }
      // Add OAuth tokens on sign in
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
      }
      return token;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnProtectedRoute =
        nextUrl.pathname.startsWith("/profile") ||
        (nextUrl.pathname.startsWith("/playlists") && !nextUrl.pathname.startsWith("/playlists/public")) ||
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
    async session({ session, token }) {
      // Add user id from token to session
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};

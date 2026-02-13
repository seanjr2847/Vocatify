import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/auth.config";

// PrismaAdapter를 포함하지 않는 authConfig만 사용
// → Edge Runtime에서 Prisma의 setImmediate 경고 방지
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: [
    "/profile/:path*",
    "/playlists/:path((?!public).*)*",
    "/settings/:path*",
  ],
};

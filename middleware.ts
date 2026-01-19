export { auth as middleware } from "@/lib/auth/auth";

export const config = {
  matcher: ["/profile/:path*", "/playlists/:path*", "/settings/:path*"],
};

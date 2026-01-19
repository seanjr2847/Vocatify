import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { authConfig } from "./auth.config";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  // @ts-expect-error - Prisma adapter type compatibility issue
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  ...authConfig,
});

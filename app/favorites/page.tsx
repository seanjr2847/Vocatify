import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getUserFavorites } from "@/lib/db/user";
import FavoritesClientPage from "@/components/pages/FavoritesClientPage";

export const metadata: Metadata = {
  title: "즐겨찾기 | Vocatify",
  description: "내가 좋아하는 곡 모음",
};

export default async function FavoritesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin?callbackUrl=/favorites");
  }

  // Fetch favorites directly from database (server-side)
  const { favorites } = await getUserFavorites(session.user.id!, 500, 0);

  // Serialize BigInt for client
  const serializedFavorites = favorites.map((fav) => ({
    ...fav,
    song: {
      ...fav.song,
      viewCount: fav.song.viewCount?.toString() ?? null,
    },
  }));

  return <FavoritesClientPage favorites={serializedFavorites} />;
}

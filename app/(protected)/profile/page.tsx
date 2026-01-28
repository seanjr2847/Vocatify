import { Metadata } from "next";
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { getUserFavorites } from "@/lib/db/user";
import ProfileClientPage from "@/components/pages/ProfileClientPage";

export const metadata: Metadata = {
  title: "프로필 | Vocatify",
  description: "사용자 프로필 및 즐겨찾기",
};

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/signin?callbackUrl=/profile");
  }

  // Fetch user favorites directly from database (server-side)
  const { favorites, total: totalFavorites } = await getUserFavorites(
    session.user.id,
    20,
    0
  );

  // Serialize BigInt for client
  const serializedFavorites = favorites.map((fav) => ({
    ...fav,
    song: {
      ...fav.song,
      viewCount: fav.song.viewCount?.toString() ?? null,
    },
  }));

  return (
    <ProfileClientPage
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }}
      favorites={serializedFavorites}
      totalFavorites={totalFavorites}
    />
  );
}

import { Metadata } from "next";
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { getUserPlaylists } from "@/lib/db/user";
import PlaylistsClientPage from "@/components/pages/PlaylistsClientPage";

export const metadata: Metadata = {
  title: "플레이리스트 | Vocatify",
  description: "나의 플레이리스트",
};

export default async function PlaylistsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/signin?callbackUrl=/playlists");
  }

  // Fetch user playlists directly from database (server-side)
  const playlists = await getUserPlaylists(session.user.id);

  return (
    <PlaylistsClientPage
      initialPlaylists={playlists}
      initialTotal={playlists.length}
    />
  );
}

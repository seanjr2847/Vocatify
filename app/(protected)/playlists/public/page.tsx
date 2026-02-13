import { Metadata } from "next";
import { Globe } from "lucide-react";
import { PublicPlaylistGrid } from "@/components/playlists/PublicPlaylistGrid";
import { getPublicPlaylists as fetchPublicPlaylists } from "@/lib/db/user";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "공개 플레이리스트 | Vocatify",
  description: "다른 사용자들이 공유한 공개 플레이리스트를 탐색하세요",
};

async function getPublicPlaylists() {
  try {
    return await fetchPublicPlaylists({ sortBy: "recent", limit: 100, offset: 0 });
  } catch (error) {
    console.error("Error fetching public playlists:", error);
    return [];
  }
}

export default async function PublicPlaylistsPage() {
  const playlists = await getPublicPlaylists();

  return (
    <div className="min-h-screen bg-black">
      {/* Page Header */}
      <div className="border-b border-white/10 bg-black">
        <div className="container mx-auto px-4 py-8">
          {/* Icon + Title */}
          <div className="flex items-center gap-4 mb-4">
            <div
              className={`
                p-4 rounded-[20px]
                bg-gradient-to-br from-green-500/20 to-green-500/5
                border-2 border-green-500/30
                shadow-xl shadow-green-500/10
              `}
            >
              <Globe className="h-8 w-8 text-green-400" />
            </div>
            <div>
              <h1
                className="text-4xl font-bold text-white mb-2"
                style={{ fontFamily: "Quicksand, sans-serif" }}
              >
                공개 플레이리스트
              </h1>
              <p className="text-white/60 text-lg">
                다른 사용자들이 공유한 플레이리스트를 탐색하세요
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <PublicPlaylistGrid initialPlaylists={playlists} />
      </div>
    </div>
  );
}

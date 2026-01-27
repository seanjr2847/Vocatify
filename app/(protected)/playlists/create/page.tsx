import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { CreatePlaylistForm } from "@/components/playlists/CreatePlaylistForm";

/**
 * Playlist Creation Page
 *
 * Vercel React Best Practices Applied:
 * - server-parallel-fetching: Auth check on server
 * - rendering-hoist-jsx: Static elements defined once
 * - async-defer-await: Auth check before rendering
 */

export const metadata = {
  title: "새 플레이리스트 만들기 | Vocatify",
  description: "나만의 보컬로이드 플레이리스트를 만들어보세요",
};

export default async function CreatePlaylistPage() {
  // Server-side auth check
  // async-defer-await: Early exit pattern for unauthorized users
  const session = await auth();

  if (!session?.user) {
    redirect("/signin");
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header with back button */}
      <div className="border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/playlists"
            className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors group"
          >
            <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
            <span>플레이리스트로 돌아가기</span>
          </Link>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: "Quicksand, sans-serif" }}>
            새 플레이리스트 만들기
          </h1>
          <p className="text-white/60 text-lg">
            나만의 보컬로이드 음악 플레이리스트를 만들어보세요
          </p>
        </div>

        {/* Form Card */}
        <div
          className={`
            bg-white/5 backdrop-blur-sm
            rounded-[20px] p-8
            border border-white/10
            shadow-xl
            transition-all duration-300
          `}
        >
          <CreatePlaylistForm />
        </div>

        {/* Help Text */}
        <div className="mt-6 p-4 bg-white/5 rounded-[12px] border border-white/10">
          <h3 className="text-white font-semibold mb-2">💡 팁</h3>
          <ul className="text-white/60 text-sm space-y-1">
            <li>• 플레이리스트 이름은 나중에 언제든 변경할 수 있습니다</li>
            <li>• 공개 플레이리스트는 다른 사용자들과 공유됩니다</li>
            <li>• 플레이리스트를 만든 후 곡을 추가해보세요</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

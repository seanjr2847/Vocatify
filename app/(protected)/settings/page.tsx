import { Metadata } from "next";
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { UserAvatar } from "@/components/auth/UserAvatar";
import { SignOutButton } from "@/components/auth/SignOutButton";

export const metadata: Metadata = {
  title: "설정 | Vocatify",
  description: "계정 설정",
};

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin");
  }

  return (
    <div className="min-h-screen bg-[#1d2123]">
      {/* Header */}
      <div className="border-b border-neutral-800 bg-[#1a1a1a]">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-white">설정</h1>
          <p className="mt-2 text-neutral-400">계정 및 프로필 관리</p>
        </div>
      </div>

      {/* Settings Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Account Information */}
          <div className="rounded-lg border border-neutral-800 bg-[#1a1a1a] p-6">
            <h2 className="mb-4 text-xl font-semibold text-white">
              계정 정보
            </h2>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <UserAvatar
                  name={session.user.name}
                  image={session.user.image}
                  className="h-16 w-16"
                />
                <div>
                  <p className="font-semibold text-white">{session.user.name}</p>
                  <p className="text-sm text-neutral-400">{session.user.email}</p>
                </div>
              </div>
              <div className="border-t border-neutral-800 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">인증 방법</p>
                    <p className="text-sm text-neutral-400">Google 계정으로 로그인</p>
                  </div>
                  <div className="rounded bg-[#39c5bb]/10 px-3 py-1 text-sm text-[#39c5bb]">
                    Google
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="rounded-lg border border-neutral-800 bg-[#1a1a1a] p-6">
            <h2 className="mb-4 text-xl font-semibold text-white">
              개인정보 보호
            </h2>
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-white">플레이리스트 공개 설정</p>
                  <p className="text-sm text-neutral-400">
                    플레이리스트별로 공개/비공개를 설정할 수 있습니다
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Account Actions */}
          <div className="rounded-lg border border-neutral-800 bg-[#1a1a1a] p-6">
            <h2 className="mb-4 text-xl font-semibold text-white">
              계정 관리
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                <div>
                  <p className="font-medium text-white">로그아웃</p>
                  <p className="text-sm text-neutral-400">
                    현재 세션에서 로그아웃합니다
                  </p>
                </div>
                <SignOutButton />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-red-400">계정 삭제</p>
                  <p className="text-sm text-neutral-400">
                    계정과 모든 데이터가 영구적으로 삭제됩니다
                  </p>
                </div>
                <button
                  disabled
                  className="rounded-lg border border-red-900/50 bg-red-900/20 px-4 py-2 text-sm text-red-400 opacity-50 cursor-not-allowed"
                  title="준비 중"
                >
                  계정 삭제
                </button>
              </div>
            </div>
          </div>

          {/* About */}
          <div className="rounded-lg border border-neutral-800 bg-[#1a1a1a] p-6">
            <h2 className="mb-4 text-xl font-semibold text-white">정보</h2>
            <div className="space-y-2 text-sm text-neutral-400">
              <p>Vocatify - 보컬로이드 음악 차트</p>
              <p>
                이 서비스는 VocaDB 데이터베이스와 YouTube Data API를 사용하여
                보컬로이드 음악의 트렌드를 제공합니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

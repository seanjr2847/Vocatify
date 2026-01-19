import { Metadata } from "next";
import Link from "next/link";
import { SignInButton } from "@/components/auth/SignInButton";
import { Music } from "lucide-react";

export const metadata: Metadata = {
  title: "로그인 | Vocatify",
  description: "보컬로이드 음악 차트 - Google 계정으로 로그인",
};

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a]">
      <div className="w-full max-w-md space-y-8 px-4">
        {/* Logo */}
        <div className="flex flex-col items-center space-y-2">
          <Link
            href="/"
            className="flex items-center space-x-2 text-[#39c5bb]"
          >
            <Music className="h-12 w-12" />
            <span className="text-3xl font-bold">Vocatify</span>
          </Link>
          <p className="text-center text-sm text-neutral-400">
            보컬로이드 음악 차트에 오신 것을 환영합니다
          </p>
        </div>

        {/* Sign In Card */}
        <div className="rounded-lg border border-neutral-800 bg-[#1a1a1a] p-8 shadow-xl">
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-white">로그인</h2>
              <p className="mt-2 text-sm text-neutral-400">
                Google 계정으로 간편하게 시작하세요
              </p>
            </div>

            <SignInButton />

            <p className="text-center text-xs text-neutral-500">
              로그인하면{" "}
              <Link href="/terms" className="underline hover:text-neutral-400">
                서비스 약관
              </Link>
              과{" "}
              <Link
                href="/privacy"
                className="underline hover:text-neutral-400"
              >
                개인정보 처리방침
              </Link>
              에 동의하게 됩니다.
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center">
          <Link
            href="/"
            className="text-sm text-neutral-400 hover:text-[#39c5bb] transition"
          >
            ← 홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}

"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { FcGoogle } from "react-icons/fc";
import { Sparkles } from "lucide-react";

export function SignInButton() {
  return (
    <Button
      onClick={() => signIn("google", { callbackUrl: "/" })}
      className="relative w-full h-12 overflow-hidden group bg-gradient-to-r from-[#39c5bb] to-[#2da89e] hover:from-[#2da89e] hover:to-[#39c5bb] text-white font-semibold text-base shadow-2xl shadow-[#39c5bb]/30 transition-all duration-500 hover:shadow-[#39c5bb]/50 hover:scale-[1.02]"
    >
      {/* Animated background effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />

      {/* Button content */}
      <div className="relative flex items-center justify-center gap-3">
        <div className="relative">
          <div className="absolute -inset-1 bg-white/20 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
          <FcGoogle className="relative h-6 w-6 bg-white rounded-full p-0.5" />
        </div>
        <span className="font-semibold tracking-wide">Google로 로그인</span>
        <Sparkles className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
      </div>
    </Button>
  );
}

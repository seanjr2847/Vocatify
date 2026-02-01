"use client";

import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface SignOutButtonProps {
  className?: string;
}

export function SignOutButton({ className }: SignOutButtonProps) {
  return (
    <Button
      onClick={() => {
        toast.success("로그아웃되었습니다");
        signOut({ callbackUrl: "/" });
      }}
      variant="ghost"
      className={`group relative overflow-hidden hover:bg-red-500/10 text-white/70 hover:text-red-400 transition-all duration-300 ${className}`}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/5 to-red-500/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
      <LogOut className="relative mr-2 h-4 w-4 group-hover:rotate-12 transition-transform duration-300" />
      <span className="relative font-medium">로그아웃</span>
    </Button>
  );
}

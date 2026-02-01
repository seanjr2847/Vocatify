"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { User, Settings, Music, LogIn, Sparkles, Info } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "./UserAvatar";
import { SignOutButton } from "./SignOutButton";
import { Button } from "@/components/ui/button";

export function UserMenu() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="relative h-9 w-9">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#39c5bb]/20 to-[#39c5bb]/5 animate-pulse" />
        <div className="absolute inset-1 rounded-full bg-[#1d2123]" />
      </div>
    );
  }

  if (!session) {
    return (
      <Button
        asChild
        size="sm"
        className="relative overflow-hidden group bg-gradient-to-r from-[#39c5bb] to-[#2da89e] hover:from-[#2da89e] hover:to-[#39c5bb] text-white font-semibold px-4 h-9 rounded-full shadow-lg shadow-[#39c5bb]/20 transition-all duration-300 hover:shadow-xl hover:shadow-[#39c5bb]/30 hover:scale-105"
      >
        <Link href="/signin" className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 animate-pulse" />
          <span className="hidden sm:inline">로그인</span>
          <LogIn className="h-4 w-4 sm:hidden" />
        </Link>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative focus:outline-none group">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#39c5bb] to-[#2da89e] rounded-full opacity-0 group-hover:opacity-100 blur transition-opacity duration-300" />
          <div className="relative ring-2 ring-transparent group-hover:ring-[#39c5bb]/50 rounded-full transition-all duration-300">
            <UserAvatar
              name={session.user?.name}
              image={session.user?.image}
              className="h-9 w-9 cursor-pointer"
            />
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64 bg-[#1a1a1a]/95 backdrop-blur-xl border-white/10 shadow-2xl shadow-black/50"
        sideOffset={8}
      >
        <DropdownMenuLabel className="pb-3">
          <div className="flex items-start gap-3">
            <UserAvatar
              name={session.user?.name}
              image={session.user?.image}
              className="h-12 w-12 ring-2 ring-[#39c5bb]/30"
            />
            <div className="flex flex-col space-y-1 flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {session.user?.name}
              </p>
              <p className="text-xs text-white/50 truncate">
                {session.user?.email}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-white/10" />

        <DropdownMenuItem asChild>
          <Link
            href="/profile"
            className="cursor-pointer flex items-center gap-3 px-3 py-2.5 text-white/80 hover:text-white hover:bg-[#39c5bb]/10 transition-colors group"
          >
            <div className="h-8 w-8 rounded-lg bg-[#39c5bb]/10 flex items-center justify-center group-hover:bg-[#39c5bb]/20 transition-colors">
              <User className="h-4 w-4 text-[#39c5bb]" />
            </div>
            <span className="font-medium">프로필</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link
            href="/playlists"
            className="cursor-pointer flex items-center gap-3 px-3 py-2.5 text-white/80 hover:text-white hover:bg-[#39c5bb]/10 transition-colors group"
          >
            <div className="h-8 w-8 rounded-lg bg-[#39c5bb]/10 flex items-center justify-center group-hover:bg-[#39c5bb]/20 transition-colors">
              <Music className="h-4 w-4 text-[#39c5bb]" />
            </div>
            <span className="font-medium">플레이리스트</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link
            href="/settings"
            className="cursor-pointer flex items-center gap-3 px-3 py-2.5 text-white/80 hover:text-white hover:bg-[#39c5bb]/10 transition-colors group"
          >
            <div className="h-8 w-8 rounded-lg bg-[#39c5bb]/10 flex items-center justify-center group-hover:bg-[#39c5bb]/20 transition-colors">
              <Settings className="h-4 w-4 text-[#39c5bb]" />
            </div>
            <span className="font-medium">설정</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link
            href="/about"
            className="cursor-pointer flex items-center gap-3 px-3 py-2.5 text-white/80 hover:text-white hover:bg-[#39c5bb]/10 transition-colors group"
          >
            <div className="h-8 w-8 rounded-lg bg-[#39c5bb]/10 flex items-center justify-center group-hover:bg-[#39c5bb]/20 transition-colors">
              <Info className="h-4 w-4 text-[#39c5bb]" />
            </div>
            <span className="font-medium">About</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-white/10" />

        <div className="px-2 py-2">
          <SignOutButton className="w-full" />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

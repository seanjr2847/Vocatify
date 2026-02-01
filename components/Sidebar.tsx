"use client";

import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { Home, Music, Radio, ListMusic, Heart } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { UserMenu } from "@/components/auth/UserMenu";

const navigationItems = [
  { icon: Home, label: "홈", href: "/" },
  { icon: Music, label: "차트", href: "/charts" },
  { icon: ListMusic, label: "플레이리스트", href: "/playlists" },
  { icon: Heart, label: "즐겨찾기", href: "/favorites" },
  { icon: Radio, label: "라디오", href: "/radio" },
];

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const handleNavClick = (href: string) => {
    router.push(href);
  };

  const isActive = (href: string) => {
    if (href === "/" ) return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside className="hidden lg:flex w-[92px] flex-shrink-0 flex-col items-center py-6 gap-6 bg-black">
      <div className="w-[34px] h-[34px] flex items-center justify-center">
        {/* 로고 플레이스홀더 - 로고 이미지를 추가하세요 */}
      </div>

      <nav className="flex flex-col items-center bg-white/5 rounded-[32px] p-4 gap-[30px] mt-10">
        {navigationItems.map((item, index) => {
          const active = isActive(item.href);
          return (
            <Tooltip key={index} content={item.label} side="right">
              <Button
                variant="ghost"
                size="icon"
                className="w-[22px] h-[22px] p-0 hover:bg-transparent"
                onClick={() => handleNavClick(item.href)}
                aria-label={item.label}
              >
                <item.icon
                  className={`w-[22px] h-[22px] transition-colors ${
                    active
                      ? 'text-[#39c5bb]'
                      : 'text-white/60 hover:text-white'
                  }`}
                />
              </Button>
            </Tooltip>
          );
        })}
      </nav>

      <div className="flex flex-col items-center gap-4 mt-auto">
        <UserMenu />
      </div>
    </aside>
  );
}

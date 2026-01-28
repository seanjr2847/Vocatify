"use client";

import { Button } from "@/components/ui/button";
import { Home, Music, Radio, ListMusic, Heart, Video } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { UserMenu } from "@/components/auth/UserMenu";
import { toast } from "sonner";

const navigationItems = [
  { icon: Home, alt: "홈", href: "/" },
  { icon: Music, alt: "차트", href: "/charts" },
  { icon: ListMusic, alt: "플레이리스트", href: "/playlists" },
  { icon: Heart, alt: "즐겨찾기", href: "/favorites" },
  { icon: Radio, alt: "라디오", href: "/radio" },
  { icon: Video, alt: "비디오", href: null },
];

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const handleNavClick = (href: string | null, alt: string) => {
    if (href) {
      router.push(href);
    } else {
      toast.info(`${alt} 기능은 준비 중입니다`);
    }
  };

  const isActive = (href: string | null) => {
    if (!href) return false;
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
            <Button
              key={index}
              variant="ghost"
              size="icon"
              className="w-[22px] h-[22px] p-0 hover:bg-transparent"
              onClick={() => handleNavClick(item.href, item.alt)}
              title={item.alt}
            >
              <item.icon
                className={`w-[22px] h-[22px] ${
                  active
                    ? 'text-[#CDFF00]'
                    : item.href
                      ? 'text-white/60 hover:text-white'
                      : 'text-white/40'
                }`}
              />
            </Button>
          );
        })}
      </nav>

      <div className="flex flex-col items-center gap-4 mt-auto">
        <UserMenu />
      </div>
    </aside>
  );
}

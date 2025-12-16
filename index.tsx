import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Home, Music, Radio, Search, User, Video } from "lucide-react";
import React from "react";
import { MusicPlayerSection } from "./MusicPlayerSection";
import { NavigationSection } from "./NavigationSection";

const navigationItems = [
  { icon: Home, alt: "Home", active: false },
  { icon: Music, alt: "Music Library", active: false },
  { icon: Radio, alt: "Radio", active: false },
  { icon: Video, alt: "Videos", active: false },
];

const personalItems = [
  { icon: User, alt: "Profile" },
  { icon: User, alt: "Settings" },
];

export default function HomeScreen(): JSX.Element {
  return (
    <div className="bg-[#1d2123] overflow-hidden w-full min-w-[1280px] flex flex-col">
      <div className="flex flex-1">
        <aside className="w-[92px] flex-shrink-0 flex flex-col items-center py-6 gap-6">
          <div className="w-[34px] h-[34px] flex items-center justify-center">
            <img src="" alt="Logo" className="w-full h-full" />
          </div>

          <nav className="flex flex-col items-center bg-dark-alt rounded-[32px] p-4 gap-[30px] mt-10">
            {navigationItems.map((item, index) => (
              <Button
                key={index}
                variant="ghost"
                size="icon"
                className="w-[22px] h-[22px] p-0 hover:bg-transparent"
              >
                <item.icon className="w-[22px] h-[22px] text-white/40" />
              </Button>
            ))}
          </nav>

          <div className="flex flex-col items-center gap-4 mt-auto">
            {personalItems.map((item, index) => (
              <Button
                key={index}
                variant="ghost"
                size="icon"
                className="w-[22px] h-[22px] p-0 hover:bg-transparent"
              >
                <item.icon className="w-[22px] h-[22px] text-white/40" />
              </Button>
            ))}
          </div>
        </aside>

        <main className="flex-1 flex flex-col">
          <header className="h-[73px] bg-[#1d2123] flex items-center px-[27px]">
            <div className="flex items-center gap-[22px]">
              <Search className="w-4 h-4 text-white/25" />
              <Input
                type="text"
                placeholder="Search artists"
                className="border-0 bg-transparent text-sm font-semibold text-white/25 placeholder:text-white/25 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto [font-family:'Quicksand-SemiBold',Helvetica]"
              />
            </div>
          </header>

          <section className="flex-1 relative w-full">
            <NavigationSection />
          </section>
        </main>
      </div>

      <section className="relative w-full">
        <MusicPlayerSection />
      </section>
    </div>
  );
}

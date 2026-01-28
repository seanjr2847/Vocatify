"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { TopNavigation } from "@/components/TopNavigation";
import { MusicPlayerSection } from "@/components/MusicPlayerSection";
import { ReactNode } from "react";

export function RootLayoutClient({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Hide sidebar and top navigation on auth pages
  const isAuthPage = pathname === "/signin";

  return (
    <>
      <div className="flex min-h-screen bg-black">
        {!isAuthPage && <Sidebar />}
        <div className="flex-1 flex flex-col">
          {!isAuthPage && <TopNavigation />}
          <div className="flex-1">
            {children}
          </div>
        </div>
      </div>

      {/* Music Player - Always visible on all pages */}
      <MusicPlayerSection />
    </>
  );
}

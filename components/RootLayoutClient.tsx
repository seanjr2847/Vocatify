"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { MusicPlayerSection } from "@/components/MusicPlayerSection";
import { ReactNode } from "react";

export function RootLayoutClient({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Hide sidebar on auth pages
  const hidesSidebar = pathname === "/signin";

  return (
    <>
      <div className="flex min-h-screen bg-black">
        {!hidesSidebar && <Sidebar />}
        <div className="flex-1">
          {children}
        </div>
      </div>

      {/* Music Player - Always visible on all pages */}
      <MusicPlayerSection />
    </>
  );
}

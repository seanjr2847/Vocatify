"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { ReactNode } from "react";

export function RootLayoutClient({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Hide sidebar on auth pages
  const hidesSidebar = pathname === "/signin";

  return (
    <div className="flex min-h-screen bg-black">
      {!hidesSidebar && <Sidebar />}
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}

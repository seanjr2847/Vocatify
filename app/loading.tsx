import { NavigationSectionSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomeLoading() {
  return (
    <div className="bg-[#1d2123] min-h-screen flex">
      {/* Left Sidebar Skeleton */}
      <aside className="hidden lg:flex w-[92px] flex-shrink-0 flex-col items-center py-6 gap-6 border-r border-white/5">
        <Skeleton className="w-[34px] h-[34px] rounded-lg" />
        <div className="flex flex-col items-center gap-[30px] mt-10">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="w-[22px] h-[22px] rounded" />
          ))}
        </div>
        {/* User menu skeleton at bottom */}
        <div className="mt-auto">
          <Skeleton className="w-10 h-10 rounded-full" />
        </div>
      </aside>

      {/* Main Content Skeleton */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation */}
        <header className="h-[73px] flex items-center justify-between px-6 border-b border-white/5">
          <Skeleton className="h-10 w-full max-w-md rounded-full bg-white/5" />
          <div className="flex items-center gap-4">
            <Skeleton className="w-9 h-9 rounded-full" />
          </div>
        </header>

        {/* Navigation Section */}
        <div className="flex-1 overflow-y-auto">
          <NavigationSectionSkeleton />
        </div>
      </main>
    </div>
  );
}

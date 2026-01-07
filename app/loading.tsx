import { NavigationSectionSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomeLoading() {
  return (
    <div className="bg-[#1d2123] min-h-screen flex">
      {/* Left Sidebar Skeleton */}
      <aside className="hidden lg:flex w-[92px] flex-shrink-0 flex-col items-center py-6 gap-6">
        <Skeleton className="w-[34px] h-[34px] rounded" />
        <div className="flex flex-col items-center gap-[30px] mt-10">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="w-[22px] h-[22px] rounded" />
          ))}
        </div>
      </aside>

      {/* Main Content Skeleton */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-[73px] flex items-center px-[27px]">
          <Skeleton className="h-10 w-full max-w-md rounded-lg" />
        </header>

        {/* Navigation Section */}
        <NavigationSectionSkeleton />
      </main>
    </div>
  );
}

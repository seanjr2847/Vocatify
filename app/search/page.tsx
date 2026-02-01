import { searchSongs, SortBy } from "@/lib/db";
import { SearchResults } from "@/components/SearchResults";
import { redirect } from "next/navigation";

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
    sortBy?: string;
    artistType?: string;
    tagId?: string;
    tagName?: string;
  }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.q || "";
  const page = parseInt(params.page || "1");
  const sortBy = (params.sortBy || "viewCount") as SortBy;
  const artistType = params.artistType === "all" ? null : "Vocaloid";
  const tagId = params.tagId ? parseInt(params.tagId) : null;
  const tagName = params.tagName || null;

  // Redirect to home if no query
  if (!query || query.length < 2) {
    redirect("/");
  }

  const limit = 20;
  const offset = (page - 1) * limit;

  // Fetch search results server-side
  const result = await searchSongs(query, limit, offset, sortBy, artistType, tagId);

  return (
    <div className="min-h-screen bg-black">
      <SearchResults
        initialResults={result.songs}
        total={result.total}
        query={query}
        currentPage={page}
        sortBy={sortBy}
        artistType={artistType || "Vocaloid"}
        tagId={tagId}
        tagName={tagName}
      />
    </div>
  );
}

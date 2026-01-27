import { NextRequest, NextResponse } from "next/server";
import { getPublicPlaylists } from "@/lib/db/user";

/**
 * GET /api/playlists/public
 *
 * Fetch public playlists with filtering and sorting
 * Query params:
 * - search: string (filter by playlist name)
 * - sortBy: "recent" | "songs" | "name" (default: "recent")
 * - limit: number (default: 50)
 * - offset: number (default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || undefined;
    const sortBy = (searchParams.get("sortBy") as "recent" | "songs" | "name") || "recent";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const playlists = await getPublicPlaylists({
      search,
      sortBy,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      data: playlists,
      count: playlists.length,
    });
  } catch (error) {
    console.error("Failed to fetch public playlists:", error);
    return NextResponse.json(
      {
        success: false,
        error: "공개 플레이리스트를 불러오는데 실패했습니다",
      },
      { status: 500 }
    );
  }
}

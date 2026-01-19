import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import {
  getUserFavorites,
  addUserFavorite,
  removeUserFavorite,
} from '@/lib/db/user';

/**
 * GET /api/user/favorites
 * Get all favorites for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const { favorites, total } = await getUserFavorites(session.user.id, limit, offset);

    // Convert BigInt to string for JSON serialization
    const serializedFavorites = favorites.map((fav) => ({
      ...fav,
      song: {
        ...fav.song,
        viewCount: fav.song.viewCount?.toString() ?? null,
      },
    }));

    return NextResponse.json({
      success: true,
      data: serializedFavorites,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch favorites' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/favorites
 * Add a song to favorites
 * Body: { songId: number }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { songId } = body;

    if (!songId || typeof songId !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Invalid songId' },
        { status: 400 }
      );
    }

    const favorite = await addUserFavorite(session.user.id, songId);

    return NextResponse.json({
      success: true,
      data: favorite,
      message: 'Song added to favorites',
    });
  } catch (error: unknown) {
    console.error('Error adding favorite:', error);

    // Handle unique constraint violation (song already favorited)
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Song already in favorites' },
        { status: 409 }
      );
    }

    // Handle foreign key constraint (song doesn't exist)
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2003') {
      return NextResponse.json(
        { success: false, error: 'Song not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to add favorite' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user/favorites
 * Remove a song from favorites
 * Body: { songId: number }
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { songId } = body;

    if (!songId || typeof songId !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Invalid songId' },
        { status: 400 }
      );
    }

    const success = await removeUserFavorite(session.user.id, songId);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Favorite not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Song removed from favorites',
    });
  } catch (error) {
    console.error('Error removing favorite:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove favorite' },
      { status: 500 }
    );
  }
}

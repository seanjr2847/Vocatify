import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import {
  addSongToPlaylist,
  removeSongFromPlaylist,
  reorderPlaylistSongs,
} from '@/lib/db/user';

/**
 * POST /api/user/playlists/[playlistId]/songs
 * Add a song to playlist
 * Body: { songId: number }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ playlistId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { playlistId } = await params;
    const body = await request.json();
    const { songId } = body;

    if (!songId || typeof songId !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Invalid songId' },
        { status: 400 }
      );
    }

    try {
      const playlistSong = await addSongToPlaylist(playlistId, session.user.id, songId);

      return NextResponse.json({
        success: true,
        data: playlistSong,
        message: 'Song added to playlist',
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'Unauthorized') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 403 }
        );
      }

      // Handle unique constraint violation (song already in playlist)
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
        return NextResponse.json(
          { success: false, error: 'Song already in playlist' },
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

      throw error;
    }
  } catch (error) {
    console.error('Error adding song to playlist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add song to playlist' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user/playlists/[playlistId]/songs
 * Remove a song from playlist
 * Body: { songId: number }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ playlistId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { playlistId } = await params;
    const body = await request.json();
    const { songId } = body;

    if (!songId || typeof songId !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Invalid songId' },
        { status: 400 }
      );
    }

    const success = await removeSongFromPlaylist(playlistId, session.user.id, songId);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Song not found in playlist or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Song removed from playlist',
    });
  } catch (error) {
    console.error('Error removing song from playlist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove song from playlist' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user/playlists/[playlistId]/songs
 * Reorder songs in playlist
 * Body: { songOrders: Array<{ songId: number, order: number }> }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ playlistId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { playlistId } = await params;
    const body = await request.json();
    const { songOrders } = body;

    if (!Array.isArray(songOrders)) {
      return NextResponse.json(
        { success: false, error: 'songOrders must be an array' },
        { status: 400 }
      );
    }

    // Validate each item
    for (const item of songOrders) {
      if (
        typeof item.songId !== 'number' ||
        typeof item.order !== 'number' ||
        item.order < 1
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'Each item must have songId (number) and order (positive number)',
          },
          { status: 400 }
        );
      }
    }

    const success = await reorderPlaylistSongs(playlistId, session.user.id, songOrders);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Playlist not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Playlist songs reordered successfully',
    });
  } catch (error) {
    console.error('Error reordering playlist songs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reorder playlist songs' },
      { status: 500 }
    );
  }
}

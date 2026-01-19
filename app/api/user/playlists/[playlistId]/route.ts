import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import {
  getPlaylistById,
  updatePlaylist,
  deletePlaylist,
} from '@/lib/db/user';

/**
 * GET /api/user/playlists/[playlistId]
 * Get playlist details with songs
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ playlistId: string }> }
) {
  try {
    const session = await auth();
    const { playlistId } = await params;

    const playlist = await getPlaylistById(playlistId, session?.user?.id);

    if (!playlist) {
      return NextResponse.json(
        { success: false, error: 'Playlist not found or access denied' },
        { status: 404 }
      );
    }

    // Convert BigInt to string for JSON serialization
    const serializedPlaylist = {
      ...playlist,
      songs: playlist.songs.map((ps) => ({
        ...ps,
        song: {
          ...ps.song,
          viewCount: ps.song.viewCount?.toString() ?? null,
        },
      })),
    };

    return NextResponse.json({
      success: true,
      data: serializedPlaylist,
    });
  } catch (error) {
    console.error('Error fetching playlist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch playlist' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user/playlists/[playlistId]
 * Update playlist metadata (name, description, visibility)
 * Body: { name?: string, description?: string, isPublic?: boolean }
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
    const { name, description, isPublic } = body;

    // Validate fields if provided
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Invalid playlist name' },
          { status: 400 }
        );
      }
      if (name.length > 100) {
        return NextResponse.json(
          { success: false, error: 'Playlist name must be 100 characters or less' },
          { status: 400 }
        );
      }
    }

    if (description !== undefined && description !== null && description.length > 500) {
      return NextResponse.json(
        { success: false, error: 'Description must be 500 characters or less' },
        { status: 400 }
      );
    }

    const updateData: {
      name?: string;
      description?: string | null;
      isPublic?: boolean;
    } = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (isPublic !== undefined) updateData.isPublic = isPublic;

    try {
      const playlist = await updatePlaylist(playlistId, session.user.id, updateData);

      return NextResponse.json({
        success: true,
        data: playlist,
        message: 'Playlist updated successfully',
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'Unauthorized') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 403 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Error updating playlist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update playlist' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user/playlists/[playlistId]
 * Delete a playlist
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
    const success = await deletePlaylist(playlistId, session.user.id);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Playlist not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Playlist deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting playlist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete playlist' },
      { status: 500 }
    );
  }
}

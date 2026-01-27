/**
 * User-related database queries
 * Handles favorites and playlists functionality
 */

import { prisma } from '../prisma';

// ============================================================
// Interfaces
// ============================================================

export interface UserFavorite {
  id: string;
  userId: string;
  songId: number;
  createdAt: Date;
  song: {
    vocadbId: number;
    defaultName: string;
    titleKorean: string | null;
    titleEnglish: string | null;
    titleJapanese: string | null;
    titleRomaji: string | null;
    artistString: string | null;
    youtubeId: string | null;
    youtubeUrl: string | null;
    thumbUrl: string | null;
    viewCount: bigint | null;
    publishDate: Date | null;
    songType: string | null;
    lengthSeconds: number | null;
  };
}

export interface UserPlaylistSummary {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  songCount: number;
  userId: string;
}

export interface UserPlaylistDetail extends UserPlaylistSummary {
  songs: {
    id: string;
    songId: number;
    order: number;
    addedAt: Date;
    song: {
      vocadbId: number;
      defaultName: string;
      titleKorean: string | null;
      titleEnglish: string | null;
      titleJapanese: string | null;
      titleRomaji: string | null;
      artistString: string | null;
      youtubeId: string | null;
      youtubeUrl: string | null;
      thumbUrl: string | null;
      viewCount: bigint | null;
      publishDate: Date | null;
      songType: string | null;
      lengthSeconds: number | null;
    };
  }[];
}

/**
 * Raw query result type for user favorites
 */
interface RawUserFavoriteRow {
  id: string;
  userId: string;
  songId: number;
  createdAt: Date;
  song_vocadbId: number;
  song_defaultName: string;
  song_titleKorean: string | null;
  song_titleEnglish: string | null;
  song_titleJapanese: string | null;
  song_titleRomaji: string | null;
  song_artistString: string | null;
  song_youtubeId: string | null;
  song_youtubeUrl: string | null;
  song_thumbUrl: string | null;
  song_viewCount: bigint | null;
  song_publishDate: Date | null;
  song_songType: string | null;
  song_lengthSeconds: number | null;
}

/**
 * Raw query result type for enriched song data
 */
interface RawEnrichedSongRow {
  vocadb_id: number;
  default_name: string;
  title_korean: string | null;
  title_english: string | null;
  title_japanese: string | null;
  title_romaji: string | null;
  artist_string: string | null;
  youtube_id: string | null;
  youtube_url: string | null;
  thumb_url: string | null;
  view_count: bigint | null;
  publish_date: Date | null;
  song_type: string | null;
  length_seconds: number | null;
}

// ============================================================
// Favorites Functions
// ============================================================

/**
 * Get all favorites for a user with song details
 */
export async function getUserFavorites(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ favorites: UserFavorite[]; total: number }> {
  const [favorites, total] = await Promise.all([
    prisma.$queryRaw<RawUserFavoriteRow[]>`
      WITH song_views AS (
        SELECT song_id, MAX(view_count) as total_view_count
        FROM pvs WHERE service = 'Youtube' AND view_count IS NOT NULL
        GROUP BY song_id
      ),
      song_titles AS (
        SELECT
          song_id,
          MAX(CASE WHEN language = 'Korean' THEN value END) as title_korean,
          MAX(CASE WHEN language = 'English' THEN value END) as title_english,
          MAX(CASE WHEN language = 'Japanese' THEN value END) as title_japanese,
          MAX(CASE WHEN language = 'Romaji' THEN value END) as title_romaji
        FROM song_names
        GROUP BY song_id
      ),
      song_artists AS (
        SELECT
          sa.song_id,
          STRING_AGG(a.name, ', ' ORDER BY sa.id) as artist_string
        FROM song_artists sa
        JOIN artists a ON sa.artist_id = a.vocadb_id
        WHERE sa.is_support = false
        GROUP BY sa.song_id
      ),
      song_youtube AS (
        SELECT DISTINCT ON (song_id)
          song_id,
          pv_id as youtube_id,
          url as youtube_url
        FROM pvs
        WHERE service = 'Youtube' AND view_count IS NOT NULL
        ORDER BY song_id, view_count DESC NULLS LAST
      )
      SELECT
        ufs.id,
        ufs.user_id as "userId",
        ufs.song_id as "songId",
        ufs.created_at as "createdAt",
        s.vocadb_id as "song_vocadbId",
        s.default_name as "song_defaultName",
        st.title_korean as "song_titleKorean",
        st.title_english as "song_titleEnglish",
        st.title_japanese as "song_titleJapanese",
        st.title_romaji as "song_titleRomaji",
        sa.artist_string as "song_artistString",
        sy.youtube_id as "song_youtubeId",
        sy.youtube_url as "song_youtubeUrl",
        s.thumb_url as "song_thumbUrl",
        sv.total_view_count as "song_viewCount",
        s.publish_date as "song_publishDate",
        s.song_type as "song_songType",
        s.length_seconds as "song_lengthSeconds"
      FROM user_favorite_songs ufs
      JOIN songs s ON ufs.song_id = s.vocadb_id
      LEFT JOIN song_views sv ON s.vocadb_id = sv.song_id
      LEFT JOIN song_titles st ON s.vocadb_id = st.song_id
      LEFT JOIN song_artists sa ON s.vocadb_id = sa.song_id
      LEFT JOIN song_youtube sy ON s.vocadb_id = sy.song_id
      WHERE ufs.user_id = ${userId}
      ORDER BY ufs.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `,
    prisma.userFavoriteSong.count({ where: { userId } }),
  ]);

  return {
    favorites: favorites.map((row) => ({
      id: row.id,
      userId: row.userId,
      songId: row.songId,
      createdAt: row.createdAt,
      song: {
        vocadbId: row.song_vocadbId,
        defaultName: row.song_defaultName,
        titleKorean: row.song_titleKorean,
        titleEnglish: row.song_titleEnglish,
        titleJapanese: row.song_titleJapanese,
        titleRomaji: row.song_titleRomaji,
        artistString: row.song_artistString,
        youtubeId: row.song_youtubeId,
        youtubeUrl: row.song_youtubeUrl,
        thumbUrl: row.song_thumbUrl,
        viewCount: row.song_viewCount,
        publishDate: row.song_publishDate,
        songType: row.song_songType,
        lengthSeconds: row.song_lengthSeconds,
      },
    })),
    total,
  };
}

/**
 * Add a song to user favorites
 * Returns the created favorite record
 */
export async function addUserFavorite(userId: string, songId: number) {
  return await prisma.userFavoriteSong.create({
    data: {
      userId,
      songId,
    },
  });
}

/**
 * Remove a song from user favorites
 * Returns true if deleted, false if not found
 */
export async function removeUserFavorite(userId: string, songId: number): Promise<boolean> {
  try {
    await prisma.userFavoriteSong.delete({
      where: {
        userId_songId: {
          userId,
          songId,
        },
      },
    });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if a song is favorited by user
 */
export async function isSongFavorited(userId: string, songId: number): Promise<boolean> {
  const favorite = await prisma.userFavoriteSong.findUnique({
    where: {
      userId_songId: {
        userId,
        songId,
      },
    },
  });
  return favorite !== null;
}

/**
 * Get multiple favorite statuses at once (for batch checking)
 */
export async function getSongsFavoriteStatus(
  userId: string,
  songIds: number[]
): Promise<Record<number, boolean>> {
  const favorites = await prisma.userFavoriteSong.findMany({
    where: {
      userId,
      songId: { in: songIds },
    },
    select: { songId: true },
  });

  const favoritedSet = new Set(favorites.map((f) => f.songId));
  return Object.fromEntries(songIds.map((id) => [id, favoritedSet.has(id)]));
}

// ============================================================
// Playlist Functions
// ============================================================

/**
 * Get all playlists for a user (summary view)
 */
export async function getUserPlaylists(
  userId: string
): Promise<UserPlaylistSummary[]> {
  const playlists = await prisma.userPlaylist.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: {
        select: { songs: true },
      },
    },
  });

  return playlists.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    isPublic: p.isPublic,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    songCount: p._count.songs,
    userId: p.userId,
  }));
}

/**
 * Get single playlist with full song details
 */
export async function getPlaylistById(
  playlistId: string,
  userId?: string
): Promise<UserPlaylistDetail | null> {
  const playlist = await prisma.userPlaylist.findUnique({
    where: { id: playlistId },
    include: {
      songs: {
        orderBy: { order: 'asc' },
        include: {
          song: true,
        },
      },
    },
  });

  if (!playlist) return null;

  // Check access: must be owner or playlist must be public
  if (userId !== playlist.userId && !playlist.isPublic) {
    return null;
  }

  // Fetch enriched song data
  const songIds = playlist.songs.map((s) => s.songId);
  const enrichedSongs = await prisma.$queryRaw<RawEnrichedSongRow[]>`
    WITH song_views AS (
      SELECT song_id, MAX(view_count) as total_view_count
      FROM pvs WHERE service = 'Youtube' AND view_count IS NOT NULL
      GROUP BY song_id
    ),
    song_titles AS (
      SELECT
        song_id,
        MAX(CASE WHEN language = 'Korean' THEN value END) as title_korean,
        MAX(CASE WHEN language = 'English' THEN value END) as title_english,
        MAX(CASE WHEN language = 'Japanese' THEN value END) as title_japanese,
        MAX(CASE WHEN language = 'Romaji' THEN value END) as title_romaji
      FROM song_names
      GROUP BY song_id
    ),
    song_artists AS (
      SELECT
        sa.song_id,
        STRING_AGG(a.name, ', ' ORDER BY sa.id) as artist_string
      FROM song_artists sa
      JOIN artists a ON sa.artist_id = a.vocadb_id
      WHERE sa.is_support = false
      GROUP BY sa.song_id
    ),
    song_youtube AS (
      SELECT DISTINCT ON (song_id)
        song_id,
        pv_id as youtube_id,
        url as youtube_url
      FROM pvs
      WHERE service = 'Youtube' AND view_count IS NOT NULL
      ORDER BY song_id, view_count DESC NULLS LAST
    )
    SELECT
      s.vocadb_id,
      s.default_name,
      st.title_korean,
      st.title_english,
      st.title_japanese,
      st.title_romaji,
      sa.artist_string,
      sy.youtube_id,
      sy.youtube_url,
      s.thumb_url,
      sv.total_view_count as view_count,
      s.publish_date,
      s.song_type,
      s.length_seconds
    FROM songs s
    LEFT JOIN song_views sv ON s.vocadb_id = sv.song_id
    LEFT JOIN song_titles st ON s.vocadb_id = st.song_id
    LEFT JOIN song_artists sa ON s.vocadb_id = sa.song_id
    LEFT JOIN song_youtube sy ON s.vocadb_id = sy.song_id
    WHERE s.vocadb_id = ANY(${songIds}::int[])
  `;

  const songDataMap = new Map(enrichedSongs.map((s) => [s.vocadb_id, s]));

  return {
    id: playlist.id,
    name: playlist.name,
    description: playlist.description,
    isPublic: playlist.isPublic,
    createdAt: playlist.createdAt,
    updatedAt: playlist.updatedAt,
    songCount: playlist.songs.length,
    userId: playlist.userId,
    songs: playlist.songs.map((ps) => {
      const enrichedData = songDataMap.get(ps.songId);
      return {
        id: ps.id,
        songId: ps.songId,
        order: ps.order,
        addedAt: ps.addedAt,
        song: {
          vocadbId: ps.songId,
          defaultName: enrichedData?.default_name ?? ps.song.default_name,
          titleKorean: enrichedData?.title_korean ?? null,
          titleEnglish: enrichedData?.title_english ?? null,
          titleJapanese: enrichedData?.title_japanese ?? null,
          titleRomaji: enrichedData?.title_romaji ?? null,
          artistString: enrichedData?.artist_string ?? null,
          youtubeId: enrichedData?.youtube_id ?? null,
          youtubeUrl: enrichedData?.youtube_url ?? null,
          thumbUrl: enrichedData?.thumb_url ?? ps.song.thumb_url,
          viewCount: enrichedData?.view_count ?? null,
          publishDate: enrichedData?.publish_date ?? ps.song.publish_date,
          songType: enrichedData?.song_type ?? ps.song.song_type,
          lengthSeconds: enrichedData?.length_seconds ?? ps.song.length_seconds,
        },
      };
    }),
  };
}

/**
 * Create a new playlist
 */
export async function createPlaylist(
  userId: string,
  name: string,
  description: string | null = null,
  isPublic: boolean = false
) {
  return await prisma.userPlaylist.create({
    data: {
      userId,
      name,
      description,
      isPublic,
    },
  });
}

/**
 * Update playlist metadata (name, description, visibility)
 */
export async function updatePlaylist(
  playlistId: string,
  userId: string,
  data: {
    name?: string;
    description?: string | null;
    isPublic?: boolean;
  }
) {
  // Verify ownership
  const playlist = await prisma.userPlaylist.findUnique({
    where: { id: playlistId },
    select: { userId: true },
  });

  if (!playlist || playlist.userId !== userId) {
    throw new Error('Unauthorized');
  }

  return await prisma.userPlaylist.update({
    where: { id: playlistId },
    data,
  });
}

/**
 * Delete a playlist (cascades to playlist songs)
 */
export async function deletePlaylist(playlistId: string, userId: string): Promise<boolean> {
  // Verify ownership
  const playlist = await prisma.userPlaylist.findUnique({
    where: { id: playlistId },
    select: { userId: true },
  });

  if (!playlist || playlist.userId !== userId) {
    return false;
  }

  await prisma.userPlaylist.delete({
    where: { id: playlistId },
  });

  return true;
}

/**
 * Add a song to playlist
 * Automatically assigns order based on existing songs
 */
export async function addSongToPlaylist(
  playlistId: string,
  userId: string,
  songId: number
) {
  // Verify ownership
  const playlist = await prisma.userPlaylist.findUnique({
    where: { id: playlistId },
    select: { userId: true },
  });

  if (!playlist || playlist.userId !== userId) {
    throw new Error('Unauthorized');
  }

  // Get current max order
  const maxOrder = await prisma.userPlaylistSong.findFirst({
    where: { playlistId },
    orderBy: { order: 'desc' },
    select: { order: true },
  });

  const newOrder = (maxOrder?.order ?? 0) + 1;

  return await prisma.userPlaylistSong.create({
    data: {
      playlistId,
      songId,
      order: newOrder,
    },
  });
}

/**
 * Remove a song from playlist
 */
export async function removeSongFromPlaylist(
  playlistId: string,
  userId: string,
  songId: number
): Promise<boolean> {
  // Verify ownership
  const playlist = await prisma.userPlaylist.findUnique({
    where: { id: playlistId },
    select: { userId: true },
  });

  if (!playlist || playlist.userId !== userId) {
    return false;
  }

  try {
    await prisma.userPlaylistSong.delete({
      where: {
        playlistId_songId: {
          playlistId,
          songId,
        },
      },
    });

    // Reorder remaining songs to fill the gap
    const remainingSongs = await prisma.userPlaylistSong.findMany({
      where: { playlistId },
      orderBy: { order: 'asc' },
    });

    await Promise.all(
      remainingSongs.map((song, index) =>
        prisma.userPlaylistSong.update({
          where: { id: song.id },
          data: { order: index + 1 },
        })
      )
    );

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Reorder songs in a playlist
 * @param songOrders Array of {songId, order} to update
 */
export async function reorderPlaylistSongs(
  playlistId: string,
  userId: string,
  songOrders: { songId: number; order: number }[]
): Promise<boolean> {
  // Verify ownership
  const playlist = await prisma.userPlaylist.findUnique({
    where: { id: playlistId },
    select: { userId: true },
  });

  if (!playlist || playlist.userId !== userId) {
    return false;
  }

  // Update orders in transaction
  await prisma.$transaction(
    songOrders.map(({ songId, order }) =>
      prisma.userPlaylistSong.update({
        where: {
          playlistId_songId: {
            playlistId,
            songId,
          },
        },
        data: { order },
      })
    )
  );

  return true;
}

/**
 * Check if a song is in a specific playlist
 */
export async function isSongInPlaylist(
  playlistId: string,
  songId: number
): Promise<boolean> {
  const playlistSong = await prisma.userPlaylistSong.findUnique({
    where: {
      playlistId_songId: {
        playlistId,
        songId,
      },
    },
  });
  return playlistSong !== null;
}

/**
 * Get public playlists with filtering and sorting
 */
export async function getPublicPlaylists(options: {
  search?: string;
  sortBy?: "recent" | "songs" | "name";
  limit?: number;
  offset?: number;
}): Promise<UserPlaylistSummary[]> {
  const { search, sortBy = "recent", limit = 50, offset = 0 } = options;

  // Build where clause
  const where: any = {
    isPublic: true,
  };

  if (search) {
    where.name = {
      contains: search,
      mode: 'insensitive',
    };
  }

  // Build orderBy clause
  let orderBy: any;
  switch (sortBy) {
    case "songs":
      // Order by song count (we'll handle this after query)
      orderBy = { updatedAt: 'desc' };
      break;
    case "name":
      orderBy = { name: 'asc' };
      break;
    case "recent":
    default:
      orderBy = { updatedAt: 'desc' };
      break;
  }

  const playlists = await prisma.userPlaylist.findMany({
    where,
    orderBy,
    take: limit,
    skip: offset,
    include: {
      _count: {
        select: { songs: true },
      },
    },
  });

  let results = playlists.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    isPublic: p.isPublic,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    songCount: p._count.songs,
    userId: p.userId,
  }));

  // Sort by song count if requested (client-side sorting after fetch)
  if (sortBy === "songs") {
    results = results.sort((a, b) => b.songCount - a.songCount);
  }

  return results;
}

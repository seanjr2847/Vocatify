import { NextRequest, NextResponse } from 'next/server';
import { getTagBasedPlaylist } from '@/lib/radio/algorithms';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tagsParam = params.get('tags');
  const excludeIdsParam = params.get('excludeIds');
  const limit = parseInt(params.get('limit') || '10');

  const tags = tagsParam ? tagsParam.split(',') : [];
  const excludeIds = excludeIdsParam
    ? excludeIdsParam.split(',').map(Number)
    : [];

  try {
    const playlist = await getTagBasedPlaylist(tags, excludeIds, limit);

    return NextResponse.json({
      success: true,
      playlist,
      meta: { hasMore: true }
    });
  } catch (error) {
    console.error('Radio next error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch songs' },
      { status: 500 }
    );
  }
}

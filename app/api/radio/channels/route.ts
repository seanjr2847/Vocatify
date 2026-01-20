import { NextResponse } from 'next/server';
import { RADIO_CHANNELS } from '@/lib/radio/channels';

export async function GET() {
  return NextResponse.json({
    success: true,
    channels: RADIO_CHANNELS.map(ch => ({
      slug: ch.slug,
      name: ch.nameKo,
      description: ch.description,
      icon: ch.icon,
      color: ch.color,
    }))
  });
}

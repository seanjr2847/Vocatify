import { ExternalLink, Music, Video, PlayCircle } from 'lucide-react';

interface ExternalLinksProps {
  vocadbId: number;
  youtubeUrl: string | null;
  niconicoUrl?: string | null;
}

export function ExternalLinks({ vocadbId, youtubeUrl, niconicoUrl }: ExternalLinksProps) {
  const links = [
    {
      label: 'VocaDB',
      icon: Music,
      url: `https://vocadb.net/S/${vocadbId}`,
      available: true,
    },
    ...(youtubeUrl
      ? [
          {
            label: 'YouTube',
            icon: Video,
            url: youtubeUrl,
            available: true,
          },
        ]
      : []),
    ...(niconicoUrl
      ? [
          {
            label: 'NicoNico',
            icon: PlayCircle,
            url: niconicoUrl,
            available: true,
          },
        ]
      : []),
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {links.map((link) => (
          <a
            key={link.label}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 bg-gradient-to-r from-[#2a2a2a] to-[#1a1a1a] rounded-lg border border-gray-800 hover:border-[#39c5bb] transition-all group"
          >
            <span className="font-medium">{link.label}</span>
            <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-[#39c5bb] transition-colors" />
          </a>
        ))}
    </div>
  );
}

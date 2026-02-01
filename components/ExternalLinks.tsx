import { ExternalLink, Database } from 'lucide-react';
import { FaYoutube } from 'react-icons/fa';
import { SiNiconico } from 'react-icons/si';

interface ExternalLinksProps {
  vocadbId: number;
  youtubeUrl: string | null;
  niconicoUrl?: string | null;
}

export function ExternalLinks({ vocadbId, youtubeUrl, niconicoUrl }: ExternalLinksProps) {
  const links = [
    {
      label: 'VocaDB',
      icon: Database,
      url: `https://vocadb.net/S/${vocadbId}`,
    },
    ...(youtubeUrl
      ? [
          {
            label: 'YouTube',
            icon: FaYoutube,
            url: youtubeUrl,
          },
        ]
      : []),
    ...(niconicoUrl
      ? [
          {
            label: 'NicoNico',
            icon: SiNiconico,
            url: niconicoUrl,
          },
        ]
      : []),
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <a
            key={link.label}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 bg-gradient-to-r from-[#2a2a2a] to-[#1a1a1a] rounded-lg border border-gray-800 hover:border-[#39c5bb] transition-all group"
          >
            <div className="flex items-center gap-3">
              <Icon className="w-5 h-5 text-gray-400 group-hover:text-[#39c5bb] transition-colors" />
              <span className="font-medium">{link.label}</span>
            </div>
            <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-[#39c5bb] transition-colors" />
          </a>
        );
      })}
    </div>
  );
}

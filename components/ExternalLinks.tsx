import { ExternalLink, Music, Video } from 'lucide-react';

interface ExternalLinksProps {
  vocadbId: number;
  youtubeUrl: string;
}

export function ExternalLinks({ vocadbId, youtubeUrl }: ExternalLinksProps) {
  const links = [
    {
      label: 'VocaDB',
      icon: Music,
      url: `https://vocadb.net/S/${vocadbId}`,
      available: true,
    },
    {
      label: 'YouTube',
      icon: Video,
      url: youtubeUrl,
      available: true,
    },
    {
      label: 'NicoNico',
      icon: Video,
      url: '#',
      available: false,
    },
  ];

  return (
    <div className="flex flex-wrap gap-3">
      {links.map((link) => {
        const Icon = link.icon;

        if (!link.available) {
          return (
            <div
              key={link.label}
              className="bg-[#2a2a2a] border border-gray-600 rounded-lg px-4 py-3 flex items-center gap-3 min-w-[140px] opacity-50 cursor-not-allowed"
            >
              <Icon className="w-5 h-5 text-gray-500" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-500">
                  {link.label}
                </div>
                <div className="text-xs text-gray-600">Not Available</div>
              </div>
            </div>
          );
        }

        return (
          <a
            key={link.label}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#1a1a1a] border border-gray-700 hover:border-[#39c5bb] rounded-lg px-4 py-3 flex items-center gap-3 min-w-[140px] transition-all hover:bg-[#2a2a2a] group"
          >
            <Icon className="w-5 h-5 text-gray-400 group-hover:text-[#39c5bb] transition-colors" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-white group-hover:text-[#39c5bb] transition-colors">
                {link.label}
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <span>Visit</span>
                <ExternalLink className="w-3 h-3" />
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}

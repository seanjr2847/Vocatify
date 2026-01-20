export interface RadioChannel {
  slug: string;
  nameKo: string;
  description: string;
  icon: string;
  color: string;
  algorithm: 'tag-based' | 'ranking';
  config: {
    tags?: string[];           // 태그 기반
    rankingType?: string;      // 랭킹 기반
    minViews?: number;
  };
}

export const RADIO_CHANNELS: RadioChannel[] = [
  {
    slug: 'emotional-ballad',
    nameKo: '라디오: 감성 발라드',
    description: '마음을 울리는 서정적인 발라드',
    icon: '💙',
    color: '#4A90E2',
    algorithm: 'tag-based',
    config: {
      tags: ['ballad', 'emotional', 'melancholic', 'gentle', 'piano', 'acoustic'],
      minViews: 10000,
    }
  },
  {
    slug: 'energetic',
    nameKo: '라디오: 에너제틱',
    description: '에너지 넘치는 업비트 음악',
    icon: '🎉',
    color: '#F5A623',
    algorithm: 'tag-based',
    config: {
      tags: ['energetic', 'upbeat', 'dance', 'electronic', 'fast'],
      minViews: 10000,
    }
  },
  {
    slug: 'trending-hits',
    nameKo: '라디오: 지금 핫한 곡',
    description: '실시간 트렌딩 히트곡',
    icon: '🔥',
    color: '#E74C3C',
    algorithm: 'ranking',
    config: {
      rankingType: 'weekly',
      minViews: 50000,
    }
  },
];

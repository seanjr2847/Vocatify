export interface RadioChannel {
  slug: string;
  nameKo: string;
  description: string;
  icon: string;
  color: string;
  algorithm: 'popular' | 'random';
  config: {
    minViews: number;
    maxViews?: number;  // 조회수 상한 (다양성 위해)
    limit?: number;     // 초기 로드 곡 수
  };
}

export const RADIO_CHANNELS: RadioChannel[] = [
  {
    slug: 'chill',
    nameKo: '잔잔한 노동요',
    description: '집중하며 작업할 때 듣기 좋은 곡들',
    icon: '🌙',
    color: '#6B7FD7',
    algorithm: 'random',
    config: {
      minViews: 100000,
      maxViews: 5000000,  // 너무 유명하지 않은 곡들
      limit: 15,
    }
  },
  {
    slug: 'upbeat',
    nameKo: '신나는 노동요',
    description: '에너지 충전이 필요할 때',
    icon: '⚡',
    color: '#F5A623',
    algorithm: 'random',
    config: {
      minViews: 500000,
      limit: 15,
    }
  },
  {
    slug: 'popular',
    nameKo: '인기 노동요',
    description: '조회수 높은 인기곡 위주',
    icon: '🔥',
    color: '#E74C3C',
    algorithm: 'popular',
    config: {
      minViews: 1000000,
      limit: 15,
    }
  },
];

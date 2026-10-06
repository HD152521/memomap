// 지도 위에서 서로 구분되고 흰 캡션과 대비가 나는 8색. DB CHECK는 #RRGGBB 형식만 확인한다.
export const GROUP_COLORS = ['#E8553E', '#F2A33A', '#2E9E5B', '#2F7DE1', '#7B5CD6', '#D6457A', '#1E9AA8', '#6B7280'] as const;

export type GroupColor = (typeof GROUP_COLORS)[number];

export const UNGROUPED_COLOR = '#9AA1A9';

export const GROUP_SUGGESTIONS: readonly { name: string; emoji: string; color: GroupColor }[] = [
  { name: '맛집', emoji: '🍜', color: '#E8553E' },
  { name: '꿀팁', emoji: '💡', color: '#F2A33A' },
  { name: '계곡', emoji: '🏞️', color: '#2E9E5B' },
  { name: '카페', emoji: '☕', color: '#7B5CD6' },
  { name: '화장실', emoji: '🚻', color: '#2F7DE1' },
];

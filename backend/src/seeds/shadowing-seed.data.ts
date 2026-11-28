export interface ShadowingSeedItem {
  id: string;
  videoId: string;
  title: string;
  channel: string;
  level: string;
  duration: string;
  description: string;
  sortOrder: number;
}

export const INITIAL_SHADOWING_VIDEOS: readonly ShadowingSeedItem[] = [
  {
    id: 'shv_seed_1',
    videoId: 'SmxSCZzV7j0',
    title: 'Bite size Japanese #157 - 自然な日本語って何？',
    channel: 'Bite size Japanese (Layla)',
    level: 'N3 - N2',
    duration: '14:20',
    description:
      'Luyện nghe tiếng Nhật tự nhiên hàng ngày qua giọng nói chuẩn và ngữ điệu nhẹ nhàng của cô Layla.',
    sortOrder: 0,
  },
  {
    id: 'shv_seed_2',
    videoId: 'SbfEPD4BuLs',
    title: 'Bite size Japanese #156 - 日本の食べ物とコンビニ',
    channel: 'Bite size Japanese',
    level: 'N4 - N3',
    duration: '12:45',
    description:
      'Chủ đề đồ ăn Nhật Bản và các tiện ích tại konbini, từ vựng dễ hiểu và phát âm chậm rãi.',
    sortOrder: 1,
  },
  {
    id: 'shv_seed_3',
    videoId: 'kWl7muWnuM0',
    title: 'Hội thoại tiếng Nhật đời sống hằng ngày (Shadowing chậm)',
    channel: 'Nihongo Daily',
    level: 'N5 - N4',
    duration: '09:30',
    description:
      'Luyện ngữ điệu và phát âm chuẩn từ những câu giao tiếp ngắn, phù hợp cho người mới bắt đầu.',
    sortOrder: 2,
  },
];

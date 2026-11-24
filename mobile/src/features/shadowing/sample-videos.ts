import type { SampleVideoItem } from './types';

/**
 * Danh sách các video mẫu đề xuất để luyện nghe & Shadowing.
 * Chỉ lưu thông tin metadata (videoId, title, channel, level...), KHÔNG lưu cứng subtitle lines.
 * Khi người dùng bấm vào video nào, app mới gọi backend để trích xuất phụ đề của video đó on-demand.
 */
export const SAMPLE_VIDEOS: SampleVideoItem[] = [
  {
    videoId: 'SmxSCZzV7j0',
    title: 'Bite size Japanese #157 - 自然な日本語って何？',
    channel: 'Bite size Japanese (Layla)',
    level: 'N3 - N2',
    duration: '14:20',
    description: 'Luyện nghe tiếng Nhật tự nhiên hàng ngày qua giọng nói chuẩn và ngữ điệu nhẹ nhàng của cô Layla.',
  },
  {
    videoId: 'SbfEPD4BuLs',
    title: 'Bite size Japanese #156 - 日本の食べ物とコンビニ',
    channel: 'Bite size Japanese',
    level: 'N4 - N3',
    duration: '12:45',
    description: 'Chủ đề đồ ăn Nhật Bản và các tiện ích tại konbini, từ vựng dễ hiểu và phát âm chậm rãi.',
  },
  {
    videoId: 'kWl7muWnuM0',
    title: 'Hội thoại tiếng Nhật đời sống hằng ngày (Shadowing chậm)',
    channel: 'Nihongo Daily',
    level: 'N5 - N4',
    duration: '09:30',
    description: 'Luyện ngữ điệu và phát âm chuẩn từ những câu giao tiếp ngắn, phù hợp cho người mới bắt đầu.',
  },
];

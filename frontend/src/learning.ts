export type LearningView = 'library' | 'practice' | 'review' | 'progress';
export type DemoState = 'ready' | 'loading' | 'empty' | 'partial' | 'error' | 'offline';

export const learningViews: ReadonlyArray<{ id: LearningView; label: string; eyebrow: string }> = [
  { id: 'library', label: 'Thư viện', eyebrow: 'Bộ sưu tập mẫu trên thiết bị' },
  { id: 'practice', label: 'Luyện tập', eyebrow: 'Thiết lập buổi học mẫu' },
  { id: 'review', label: 'Ôn tập', eyebrow: 'Hàng đợi ôn tập mẫu' },
  { id: 'progress', label: 'Tiến độ', eyebrow: 'Tóm tắt hoạt động mẫu' }
];

export const stateLabels: Record<DemoState, string> = {
  ready: 'Sẵn sàng',
  loading: 'Đang tải',
  empty: 'Trống',
  partial: 'Dữ liệu chưa đầy đủ',
  error: 'Lỗi',
  offline: 'Ngoại tuyến'
};

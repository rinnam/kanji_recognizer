import type { DemoState, LearningView } from '../learning';
import { stateLabels } from '../learning';

const viewCopy: Record<LearningView, { title: string; description: string }> = {
  library: { title: 'Thư viện nhỏ trên bàn học', description: 'Ba thẻ minh họa trong hai bộ thẻ mẫu trên thiết bị. Không có dữ liệu nào được lưu hoặc đồng bộ.' },
  practice: { title: 'Nhớ lại trước khi xem đáp án', description: 'Bản mẫu giao diện để chọn bộ thẻ mẫu và chế độ luyện tập tập trung.' },
  review: { title: 'Chưa có hàng đợi ôn tập lâu dài', description: 'Đánh giá theo bốn mức là tính năng dự kiến. Giao diện này chưa lên lịch hoặc thay đổi lượt ôn tập.' },
  progress: { title: 'Chỉ minh họa tiến độ', description: 'Hoạt động mẫu giải thích cấu trúc dự kiến; đây không phải dữ liệu phân tích hay lịch sử học tập.' }
};

interface StatePanelProps {
  view: LearningView;
  state: DemoState;
}

export function StatePanel({ view, state }: StatePanelProps) {
  const copy = viewCopy[view];

  if (state === 'loading') return <section className="state-panel" aria-live="polite"><p className="kicker">Đang tải màn hình trên thiết bị</p><div className="skeleton" /><div className="skeleton skeleton--short" /></section>;
  if (state === 'empty') return <section className="state-panel"><p className="kicker">Trạng thái trống</p><h2>Chưa có mục mẫu ở đây</h2><p>Hãy chọn màn hình khác hoặc đưa bản xem trước về trạng thái Sẵn sàng. Không có nội dung nào được tạo.</p></section>;
  if (state === 'error') return <section className="state-panel state-panel--alert" role="alert"><p className="kicker">Lỗi bản xem trước trên thiết bị</p><h2>Không thể chuẩn bị màn hình</h2><p>Lựa chọn của bạn vẫn được giữ nguyên. Thử lại chỉ đặt lại trạng thái giao diện trên thiết bị.</p></section>;
  if (state === 'offline') return <section className="state-panel"><p className="kicker">Ngoại tuyến</p><h2>Giao diện trên thiết bị vẫn hiển thị</h2><p>Không giả định hành vi từ xa. Thư viện phía máy chủ và dữ liệu học tập lâu dài không khả dụng trong bản xem trước này.</p></section>;

  return (
    <section className="state-panel">
      <p className="kicker">{stateLabels[state]} · mẫu trên thiết bị</p>
      <h2>{copy.title}</h2>
      <p>{copy.description}</p>
      {state === 'partial' && <div className="notice">Một số siêu dữ liệu minh họa được chủ ý để trống. Các bản ghi chưa đầy đủ vẫn đọc được.</div>}
      <MockContent view={view} partial={state === 'partial'} />
    </section>
  );
}

function MockContent({ view, partial }: { view: LearningView; partial: boolean }) {
  if (view === 'library') return <div className="card-grid"><article><b>森</b><span>rừng · もり</span></article><article><b>学</b><span>{partial ? 'Chưa có cách đọc' : 'học · がく'}</span></article><article><b>時</b><span>thời gian · とき</span></article></div>;
  if (view === 'practice') return <div className="practice-card"><span>Xem trước câu hỏi</span><b>森</b><button disabled>Xem đáp án — chỉ là bản mẫu</button></div>;
  if (view === 'review') return <div className="metric-row"><div><b>0</b><span>mục thực sự đến hạn</span></div><div><b>4</b><span>mức đánh giá mẫu dự kiến</span></div></div>;
  return <div className="metric-row"><div><b>—</b><span>chuỗi ngày đã xác minh</span></div><div><b>12</b><span>lượt ôn tập minh họa</span></div><div><b>3</b><span>ngày hoạt động mẫu</span></div></div>;
}

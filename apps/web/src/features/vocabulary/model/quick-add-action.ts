import type { ClassifyResult } from './branch-dedupe';

/**
 * Hành động Quick Add nên làm, suy ra từ kết quả {@link ClassifyResult} (Phần 7E):
 *  - 'add'     : tạo từ mới như cũ.
 *  - 'link'    : từ đã có ở nhánh khác → mời GẮN từ có sẵn vào thư mục đang chọn.
 *  - 'blocked' : đã có trong phạm vi/chưa chọn thư mục → chặn, báo lỗi.
 */
export type QuickAddAction =
  | { kind: 'add' }
  | { kind: 'link'; existingId: string; existingPath: string }
  | { kind: 'blocked'; message: string };

/**
 * Hàm THUẦN: ánh xạ kết quả phân loại sang hành động của form Quick Add.
 * Quick Add KHÔNG truyền `seenKeys` nên 'in-file' không xảy ra; vẫn xử lý để đủ nhánh kiểu.
 */
export function decideQuickAddAction(result: ClassifyResult): QuickAddAction {
  if (result.kind === 'new') return { kind: 'add' };
  if (result.kind === 'link') {
    return { kind: 'link', existingId: result.existingId, existingPath: result.existingPath };
  }
  // result.kind === 'skip'
  return {
    kind: 'blocked',
    message: result.reason === 'in-file' ? 'Đã có từ này.' : `Đã có trong «${result.existingPath}»`,
  };
}

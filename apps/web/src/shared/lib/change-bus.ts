/**
 * Bus thay đổi dữ liệu local (thuần kỹ thuật, KHÔNG phụ thuộc React) — nền cho sync client.
 *
 * Lý do đặt ở `shared/lib`: để `features/sync` biết khi dữ liệu local đổi mà KHÔNG
 * phải import feature khác (FSD: một feature chỉ phụ thuộc `shared`/`entities`, không
 * import feature khác). Các feature ghi dữ liệu (folder-tree, vocabulary, sau này
 * flashcard/quiz) gọi `emitDataChanged()`; `features/sync` `subscribeDataChanged()`
 * để lên lịch đồng bộ (debounce 3.5s).
 */
type ChangeListener = () => void;

const listeners = new Set<ChangeListener>();

/** Phát tín hiệu "dữ liệu local vừa thay đổi" tới mọi listener đang đăng ký. */
export function emitDataChanged(): void {
  for (const listener of listeners) listener();
}

/** Đăng ký lắng nghe thay đổi; trả về hàm hủy đăng ký (dùng trong cleanup effect). */
export function subscribeDataChanged(listener: ChangeListener): () => void {
  listeners.add(listener);
  return (): void => {
    listeners.delete(listener);
  };
}

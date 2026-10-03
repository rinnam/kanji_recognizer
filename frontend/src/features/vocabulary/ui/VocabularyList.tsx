import { Fragment, useState, type PointerEvent as ReactPointerEvent, type ReactElement } from 'react';
import type { LocalVocabulary } from '../../../entities/vocabulary';
import { EmptyState, IconChevron, IconTrash } from '../../../shared/ui';

interface VocabularyListProps {
  items: LocalVocabulary[];
  onDelete: (item: LocalVocabulary) => void;
  /** Tập id đang chọn (theo id, giữ qua các trang). */
  selectedIds: ReadonlySet<string>;
  /** Trạng thái chọn của riêng TRANG hiện tại — lái checkbox tiêu đề (indeterminate). */
  pageSelectState: 'none' | 'some' | 'all';
  /** Đang kéo chuột để chọn dải → khóa bôi đen văn bản ở cột checkbox. */
  dragging: boolean;
  /** Bật/tắt chọn cả trang (checkbox tiêu đề). */
  onTogglePage: () => void;
  /** pointerdown ở ô checkbox một dòng (quyết định chế độ kéo + shift-range). */
  onRowPointerDown: (id: string, event: ReactPointerEvent) => void;
  /** pointerenter ô checkbox dòng khác khi đang kéo. */
  onRowPointerEnter: (id: string) => void;
  /** Bật/tắt một dòng bằng bàn phím (Space). */
  onRowKeyToggle: (id: string) => void;
}

interface DetailRow {
  label: string;
  value: string;
}

/** Gom các trường chi tiết (ví dụ, dịch ví dụ, ghi chú) còn giá trị để hiện khi mở dòng. */
function detailRows(item: LocalVocabulary): DetailRow[] {
  const rows: DetailRow[] = [];
  if (item.example !== null) rows.push({ label: 'Ví dụ', value: item.example });
  if (item.exampleMeaning !== null) rows.push({ label: 'Dịch ví dụ', value: item.exampleMeaning });
  if (item.note !== null) rows.push({ label: 'Ghi chú', value: item.note });
  return rows;
}

/**
 * Bảng từ vựng (một lát cắt trang). Mỗi dòng GỌN — một dòng, ô dài cắt ellipsis; ví dụ/
 * dịch ví dụ/ghi chú nằm trong dòng chi tiết mở bằng mũi tên ▾ ở cuối dòng. Nút xóa là icon
 * thùng rác nhỏ (hiện khi hover/focus, luôn hiện trên cảm ứng) — hộp xác nhận ở cấp trên.
 */
export function VocabularyList({
  items,
  onDelete,
  selectedIds,
  pageSelectState,
  dragging,
  onTogglePage,
  onRowPointerDown,
  onRowPointerEnter,
  onRowKeyToggle,
}: VocabularyListProps): ReactElement {
  const [openId, setOpenId] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <EmptyState title="Không có từ nào" description="Thêm từ mới bằng Quick Add ở trên." />
    );
  }

  const toggle = (id: string): void => setOpenId((current) => (current === id ? null : id));

  return (
    <div className={dragging ? 'kn-vlist is-dragging' : 'kn-vlist'}>
      <table className="kn-vtable">
        <colgroup>
          <col className="kn-vtable__c-check" />
          <col className="kn-vtable__c-word" />
          <col className="kn-vtable__c-reading" />
          <col className="kn-vtable__c-sino" />
          <col className="kn-vtable__c-meaning" />
          <col className="kn-vtable__c-jlpt" />
          <col className="kn-vtable__c-act" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className="kn-vtable__check">
              <input
                type="checkbox"
                aria-label="Chọn cả trang"
                ref={(el) => {
                  if (el !== null) el.indeterminate = pageSelectState === 'some';
                }}
                checked={pageSelectState === 'all'}
                onChange={onTogglePage}
              />
            </th>
            <th scope="col">Từ</th>
            <th scope="col">Cách đọc</th>
            <th scope="col">Âm Hán Việt</th>
            <th scope="col">Nghĩa</th>
            <th scope="col">JLPT</th>
            <th scope="col">
              <span className="kn-sr-only">Hành động</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const details = detailRows(item);
            const hasDetail = details.length > 0;
            const open = hasDetail && openId === item.id;
            return (
              <Fragment key={item.id}>
                <tr className="kn-vtable__row">
                  <td
                    className="kn-vtable__check"
                    onPointerDown={(event) => onRowPointerDown(item.id, event)}
                    onPointerEnter={() => onRowPointerEnter(item.id)}
                  >
                    <input
                      type="checkbox"
                      aria-label={`Chọn ${item.word}`}
                      checked={selectedIds.has(item.id)}
                      onChange={() => undefined}
                      onClick={(event) => event.preventDefault()}
                      onKeyDown={(event) => {
                        if (event.key === ' ' || event.key === 'Enter') {
                          event.preventDefault();
                          onRowKeyToggle(item.id);
                        }
                      }}
                    />
                  </td>
                  <td className="kn-vtable__word" title={item.word}>
                    {item.word}
                  </td>
                  <td title={item.reading ?? undefined}>{item.reading ?? '—'}</td>
                  <td className="kn-vtable__sino" title={item.sinoVietnamese ?? undefined}>
                    {item.sinoVietnamese ?? '—'}
                  </td>
                  <td title={item.meaning}>{item.meaning}</td>
                  <td className="kn-vtable__jlpt">{item.jlptLevel ?? '—'}</td>
                  <td className="kn-vtable__actions">
                    <button
                      type="button"
                      className="kn-vtable__trash"
                      aria-label={`Xóa ${item.word}`}
                      title="Xóa"
                      onClick={() => onDelete(item)}
                    >
                      <IconTrash />
                    </button>
                    {hasDetail ? (
                      <button
                        type="button"
                        className={open ? 'kn-vtable__expand is-open' : 'kn-vtable__expand'}
                        aria-expanded={open}
                        aria-label={open ? 'Thu gọn chi tiết' : 'Mở chi tiết'}
                        onClick={() => toggle(item.id)}
                      >
                        <IconChevron />
                      </button>
                    ) : null}
                  </td>
                </tr>
                {open ? (
                  <tr className="kn-vtable__detail-row">
                    <td colSpan={7}>
                      <dl className="kn-vtable__detail">
                        {details.map((row) => (
                          <Fragment key={row.label}>
                            <dt>{row.label}</dt>
                            <dd>{row.value}</dd>
                          </Fragment>
                        ))}
                      </dl>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

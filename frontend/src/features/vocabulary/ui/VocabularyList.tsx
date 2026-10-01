import { type ReactElement } from 'react';
import type { LocalVocabulary } from '../../../entities/vocabulary';
import { Button, EmptyState } from '../../../shared/ui';

interface VocabularyListProps {
  items: LocalVocabulary[];
  onDelete: (item: LocalVocabulary) => void;
}

/** Bảng từ vựng đã lọc (có nút xóa). Hiện trạng thái rỗng khi không có từ. */
export function VocabularyList({ items, onDelete }: VocabularyListProps): ReactElement {
  if (items.length === 0) {
    return (
      <EmptyState title="Không có từ nào" description="Thêm từ mới bằng Quick Add ở trên." />
    );
  }

  return (
    <div className="kn-vlist">
      <table className="kn-vtable">
        <thead>
          <tr>
            <th scope="col">Từ</th>
            <th scope="col">Cách đọc</th>
            <th scope="col">Nghĩa</th>
            <th scope="col">JLPT</th>
            <th scope="col">
              <span className="kn-sr-only">Hành động</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td className="kn-vtable__word">{item.word}</td>
              <td>{item.reading ?? '—'}</td>
              <td>{item.meaning}</td>
              <td>{item.jlptLevel ?? '—'}</td>
              <td className="kn-vtable__actions">
                <Button aria-label={`Xóa ${item.word}`} onClick={() => onDelete(item)}>
                  Xóa
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import { useMemo, useState, type ReactElement } from 'react';
import type { LocalVocabulary } from '../../../entities/vocabulary';
import type { JlptLevel } from '../../../shared/api';
import { Button, ErrorState, LoadingState, Modal } from '../../../shared/ui';
import { filterVocabularies } from '../model/filter';
import { useDebouncedValue } from '../model/useDebouncedValue';
import { useVocabulary } from '../model/useVocabulary';
import { QuickAddForm } from './QuickAddForm';
import { VocabularyFilters } from './VocabularyFilters';
import { VocabularyList } from './VocabularyList';
import './vocabulary.css';

interface VocabularyOverviewProps {
  folderId: string | null;
}

/** Overview từ vựng: Quick Add + lọc (tìm kiếm debounce, JLPT) + bảng danh sách. */
export function VocabularyOverview({ folderId }: VocabularyOverviewProps): ReactElement {
  const api = useVocabulary();
  const [search, setSearch] = useState('');
  const [jlpt, setJlpt] = useState<JlptLevel | null>(null);
  const [pendingDelete, setPendingDelete] = useState<LocalVocabulary | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);

  const filtered = useMemo(
    () => filterVocabularies(api.all, { folderId, search: debouncedSearch, jlpt }),
    [api.all, folderId, debouncedSearch, jlpt],
  );

  return (
    <div className="kn-overview">
      <QuickAddForm folderId={folderId} onAdd={api.quickAdd} />
      <VocabularyFilters
        search={search}
        onSearchChange={setSearch}
        jlpt={jlpt}
        onJlptChange={setJlpt}
      />

      <p className="kn-overview__count">
        {folderId === null ? 'Tất cả từ' : 'Thư mục đã chọn'} · {filtered.length} từ
      </p>

      {api.status === 'loading' ? <LoadingState label="Đang tải từ vựng…" /> : null}
      {api.status === 'error' ? (
        <ErrorState message={api.error ?? undefined} onRetry={() => void api.reload()} />
      ) : null}
      {api.status === 'ready' ? (
        <VocabularyList items={filtered} onDelete={setPendingDelete} />
      ) : null}

      <Modal
        open={pendingDelete !== null}
        title={pendingDelete !== null ? `Xóa từ "${pendingDelete.word}"?` : 'Xóa từ'}
        onClose={() => setPendingDelete(null)}
        footer={
          <>
            <Button onClick={() => setPendingDelete(null)}>Hủy</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (pendingDelete !== null) void api.remove(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              Xóa
            </Button>
          </>
        }
      >
        <p>Thao tác đánh dấu xóa (tombstone) và sẽ đồng bộ lên server.</p>
      </Modal>
    </div>
  );
}

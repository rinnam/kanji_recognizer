import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { getAllFoldersLocal, type LocalFolder } from '../../../entities/folder';
import { selectWordsInScope, type LocalVocabulary } from '../../../entities/vocabulary';
import type { JlptLevel } from '../../../shared/api';
import { useDb } from '../../../shared/db';
import { subscribeDataChanged } from '../../../shared/lib';
import { Button, ErrorState, LoadingState, Modal } from '../../../shared/ui';
import { filterVocabularies } from '../model/filter';
import { useDebouncedValue } from '../model/useDebouncedValue';
import { useVocabulary } from '../model/useVocabulary';
import { dedupeKey } from '../model/dedupe';
import { ImportModal } from './ImportModal';
import { QuickAddForm } from './QuickAddForm';
import { VocabularyFilters } from './VocabularyFilters';
import { VocabularyList } from './VocabularyList';
import './vocabulary.css';

interface VocabularyOverviewProps {
  folderId: string | null;
  query: string;
}

/** Overview từ vựng: Quick Add + lọc (tìm kiếm debounce, JLPT) + bảng danh sách. */
export function VocabularyOverview({ folderId, query }: VocabularyOverviewProps): ReactElement {
  const api = useVocabulary();
  const db = useDb();
  const [jlpt, setJlpt] = useState<JlptLevel | null>(null);
  const [pendingDelete, setPendingDelete] = useState<LocalVocabulary | null>(null);
  const [folders, setFolders] = useState<LocalFolder[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  // Từ khóa đến từ URL `q` (ô tìm kiếm trên header) — giữ nguyên debounce 300ms và hàm lọc cũ.
  const debouncedSearch = useDebouncedValue(query, 300);

  // Nạp thư mục còn sống để tính phạm vi (gồm thư mục con) — khớp badge sidebar.
  useEffect(() => {
    let active = true;
    const load = async (): Promise<void> => {
      const rows = await getAllFoldersLocal(db);
      if (active) setFolders(rows.filter((item) => item.deletedAt === null));
    };
    void load();
    const unsubscribe = subscribeDataChanged(() => void load());
    return () => {
      active = false;
      unsubscribe();
    };
  }, [db]);

  // Phạm vi theo thư mục (gồm con cháu) dùng chung hàm thuần với badge sidebar,
  // rồi mới áp lọc JLPT + tìm kiếm (filterVocabularies với folderId = null).
  const filtered = useMemo(() => {
    const scoped = selectWordsInScope(api.all, folders, folderId);
    return filterVocabularies(scoped, { folderId: null, search: debouncedSearch, jlpt });
  }, [api.all, folders, folderId, debouncedSearch, jlpt]);

  // Khóa chống trùng từ KHO HIỆN TẠI (từ còn sống) để bảng xem trước đánh dấu "Trùng".
  const existingKeys = useMemo(
    () => new Set(api.all.map((item) => dedupeKey(item.word, item.reading))),
    [api.all],
  );

  return (
    <div className="kn-overview">
      <QuickAddForm folderId={folderId} onAdd={api.quickAdd} />
      <div className="kn-overview__toolbar">
        <Button onClick={() => setImportOpen(true)}>Nhập từ file / dán</Button>
      </div>
      <VocabularyFilters jlpt={jlpt} onJlptChange={setJlpt} />

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

      {importOpen ? (
        <ImportModal
          open
          onClose={() => setImportOpen(false)}
          folders={folders}
          defaultFolderId={folderId}
          existingKeys={existingKeys}
          onImport={api.importNew}
        />
      ) : null}
    </div>
  );
}

import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { getAllFoldersLocal, type LocalFolder } from '../../../entities/folder';
import { selectWordsInScope, type LocalVocabulary } from '../../../entities/vocabulary';
import type { JlptLevel } from '../../../shared/api';
import { useDb } from '../../../shared/db';
import { subscribeDataChanged } from '../../../shared/lib';
import { Button, ErrorState, LoadingState, Modal } from '../../../shared/ui';
import { filterVocabularies } from '../model/filter';
import { paginate, sortVocabs, type VocabSort } from '../model/list-utils';
import {
  loadPageSize,
  PAGE_SIZES,
  savePageSize,
  toPageSize,
  type PageSize,
} from '../model/page-size';
import { useDebouncedValue } from '../model/useDebouncedValue';
import { useVocabulary } from '../model/useVocabulary';
import { dedupeKey } from '../model/dedupe';
import { ImportModal } from './ImportModal';
import { QuickAddForm } from './QuickAddForm';
import { VocabularyList } from './VocabularyList';
import './vocabulary.css';

interface VocabularyOverviewProps {
  folderId: string | null;
  query: string;
  jlpt: JlptLevel | null;
}

/** Overview từ vựng: Quick Add + lọc (tìm kiếm debounce, JLPT) + bảng danh sách. */
export function VocabularyOverview({
  folderId,
  query,
  jlpt,
}: VocabularyOverviewProps): ReactElement {
  const api = useVocabulary();
  const db = useDb();
  const [pendingDelete, setPendingDelete] = useState<LocalVocabulary | null>(null);
  const [folders, setFolders] = useState<LocalFolder[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<VocabSort>('newest');
  const [pageSize, setPageSize] = useState<PageSize>(() => loadPageSize());
  const [page, setPage] = useState(1);
  // Từ khóa đến từ URL `q` (ô tìm kiếm trên header) — giữ nguyên debounce 300ms và hàm lọc cũ.
  const debouncedSearch = useDebouncedValue(query, 300);

  // Về trang 1 khi đổi thư mục / tìm kiếm / JLPT / cách sắp xếp / cỡ trang.
  // Điều chỉnh state NGAY trong render (không setState trong effect) để tránh render thừa.
  const resetKey = `${folderId ?? ''}|${debouncedSearch}|${jlpt ?? ''}|${sortOrder}|${String(pageSize)}`;
  const [lastResetKey, setLastResetKey] = useState(resetKey);
  if (resetKey !== lastResetKey) {
    setLastResetKey(resetKey);
    setPage(1);
  }

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

  // Sắp xếp danh sách đã lọc theo lựa chọn (ổn định nhờ tie-break id trong sortVocabs).
  const sorted = useMemo(() => sortVocabs(filtered, sortOrder), [filtered, sortOrder]);
  // Chỉ render lát cắt trang hiện tại (tránh dựng toàn bộ ~800 dòng cùng lúc).
  const pageInfo = useMemo(() => paginate(sorted, page, pageSize), [sorted, page, pageSize]);

  const changePageSize = (next: PageSize): void => {
    setPageSize(next);
    savePageSize(next);
  };
  const goToPage = (next: number): void => {
    setPage(Math.min(Math.max(Math.round(next), 1), pageInfo.pageCount));
  };

  return (
    <div className="kn-overview">
      <QuickAddForm folderId={folderId} onAdd={api.quickAdd} />
      <div className="kn-overview__toolbar">
        <Button onClick={() => setImportOpen(true)}>Nhập từ file / dán</Button>
      </div>
      {api.status === 'ready' ? (
        <div className="kn-overview__listbar">
          <div className="kn-overview__sort" role="group" aria-label="Sắp xếp">
            <Button
              variant={sortOrder === 'added' ? 'primary' : 'secondary'}
              aria-pressed={sortOrder === 'added'}
              onClick={() => setSortOrder('added')}
            >
              Thứ tự thêm
            </Button>
            <Button
              variant={sortOrder === 'newest' ? 'primary' : 'secondary'}
              aria-pressed={sortOrder === 'newest'}
              onClick={() => setSortOrder('newest')}
            >
              Mới nhất
            </Button>
          </div>
          <label className="kn-overview__pagesize">
            Mỗi trang
            <select
              value={String(pageSize)}
              onChange={(event) => changePageSize(toPageSize(event.target.value))}
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      <p className="kn-overview__count">
        {folderId === null ? 'Tất cả từ' : 'Thư mục đã chọn'} ·{' '}
        {pageInfo.total === 0
          ? '0 từ'
          : `${String(pageInfo.from)}–${String(pageInfo.to)} / ${String(pageInfo.total)} từ`}
      </p>

      {api.status === 'loading' ? <LoadingState label="Đang tải từ vựng…" /> : null}
      {api.status === 'error' ? (
        <ErrorState message={api.error ?? undefined} onRetry={() => void api.reload()} />
      ) : null}
      {api.status === 'ready' ? (
        <>
          <VocabularyList items={pageInfo.items} onDelete={setPendingDelete} />
          {pageInfo.pageCount > 1 ? (
            <nav className="kn-pager" aria-label="Phân trang">
              <button
                type="button"
                className="kn-pager__btn"
                aria-label="Trang đầu"
                disabled={pageInfo.page === 1}
                onClick={() => goToPage(1)}
              >
                «
              </button>
              <button
                type="button"
                className="kn-pager__btn"
                aria-label="Trang trước"
                disabled={pageInfo.page === 1}
                onClick={() => goToPage(pageInfo.page - 1)}
              >
                ‹
              </button>
              <span className="kn-pager__pos">
                <input
                  className="kn-pager__input"
                  type="number"
                  min={1}
                  max={pageInfo.pageCount}
                  value={pageInfo.page}
                  onChange={(event) => goToPage(Number(event.target.value))}
                  aria-label="Số trang"
                />
                <span>/ {pageInfo.pageCount}</span>
              </span>
              <button
                type="button"
                className="kn-pager__btn"
                aria-label="Trang sau"
                disabled={pageInfo.page === pageInfo.pageCount}
                onClick={() => goToPage(pageInfo.page + 1)}
              >
                ›
              </button>
              <button
                type="button"
                className="kn-pager__btn"
                aria-label="Trang cuối"
                disabled={pageInfo.page === pageInfo.pageCount}
                onClick={() => goToPage(pageInfo.pageCount)}
              >
                »
              </button>
            </nav>
          ) : null}
        </>
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

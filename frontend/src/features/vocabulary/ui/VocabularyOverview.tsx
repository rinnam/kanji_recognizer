import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
} from 'react';
import { folderPath, getAllFoldersLocal, type LocalFolder } from '../../../entities/folder';
import {
  collectDescendantFolderIds,
  selectWordsInScope,
  type LocalVocabulary,
} from '../../../entities/vocabulary';
import type { JlptLevel } from '../../../shared/api';
import { useDb } from '../../../shared/db';
import { subscribeDataChanged } from '../../../shared/lib';
import { Button, ErrorState, LoadingState, Modal, ToolbarSlot } from '../../../shared/ui';
import { filterVocabularies } from '../model/filter';
import {
  pageState,
  paginate,
  selectRange,
  setMany,
  sortVocabs,
  toggleId,
  type VocabSort,
} from '../model/list-utils';
import {
  loadPageSize,
  PAGE_SIZES,
  savePageSize,
  toPageSize,
  type PageSize,
} from '../model/page-size';
import { useDebouncedValue } from '../model/useDebouncedValue';
import { useVocabulary } from '../model/useVocabulary';
import { planWordRemoval, type WordRemovalCounts } from '../model/word-removal';
import { ImportModal } from './ImportModal';
import { QuickAddForm } from './QuickAddForm';
import { VocabularyList } from './VocabularyList';
import './vocabulary.css';

interface VocabularyOverviewProps {
  folderId: string | null;
  query: string;
  jlpt: JlptLevel | null;
}

/** `now` giả cho dry-run tính số liệu hộp xác nhận — counts KHÔNG phụ thuộc now. */
const COUNTS_ONLY = '';

interface RemovalCopy {
  title: string;
  body: ReactElement;
  confirm: string;
}

/**
 * Lời cho hộp xác nhận gỡ/xóa từ (Phần 7D), dựng từ số liệu plan:
 *  - đang xem một thư mục → 'Gỡ N từ khỏi «đường dẫn»?' + chi tiết xóa hẳn/giữ lại, nút 'Gỡ';
 *  - 'Tất cả từ vựng' / tìm kiếm toàn cục → 'Xóa hẳn N từ?' + 'Không thể hoàn tác', nút 'Xóa'.
 */
function removalCopy(
  counts: WordRemovalCounts,
  scopeFolderIds: ReadonlySet<string> | null,
  scopePath: string,
): RemovalCopy {
  const total = counts.detached + counts.deleted;
  if (scopeFolderIds === null) {
    return {
      title: `Xóa hẳn ${String(total)} từ?`,
      body: (
        <p>
          <strong>Không thể hoàn tác.</strong>
        </p>
      ),
      confirm: 'Xóa',
    };
  }
  return {
    title: `Gỡ ${String(total)} từ khỏi «${scopePath}»?`,
    body: (
      <p>
        {counts.deleted} từ chỉ thuộc thư mục này sẽ bị xóa hẳn; {counts.detached} từ còn thuộc thư
        mục khác sẽ được giữ lại.
      </p>
    ),
    confirm: 'Gỡ',
  };
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
  // Quick Add: đóng/mở theo phạm vi (khối quyết định nằm dưới, sau khi tính `scoped`).
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [lastScopeKey, setLastScopeKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<VocabSort>('newest');
  const [pageSize, setPageSize] = useState<PageSize>(() => loadPageSize());
  const [page, setPage] = useState(1);
  // Chọn nhiều: lưu theo id (giữ qua các trang). Neo cho shift-range + trạng thái kéo chuột.
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set<string>());
  const [anchorId, setAnchorId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const dragRef = useRef<{ active: boolean; mode: boolean }>({ active: false, mode: true });
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

  // Xóa lựa chọn khi đổi THƯ MỤC / TÌM KIẾM / JLPT (GIỮ khi đổi trang / sắp xếp / cỡ trang).
  const selectionKey = `${folderId ?? ''}|${debouncedSearch}|${jlpt ?? ''}`;
  const [lastSelectionKey, setLastSelectionKey] = useState(selectionKey);
  if (selectionKey !== lastSelectionKey) {
    setLastSelectionKey(selectionKey);
    setSelected(new Set<string>());
    setAnchorId(null);
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

  // Phạm vi theo thư mục (gồm con cháu) dùng chung hàm thuần với badge sidebar — tách riêng
  // để tái dùng cho quyết định mở Quick Add; rồi mới áp lọc JLPT + tìm kiếm (folderId = null).
  const scoped = useMemo(
    () => selectWordsInScope(api.all, folders, folderId),
    [api.all, folders, folderId],
  );
  const filtered = useMemo(
    () => filterVocabularies(scoped, { folderId: null, search: debouncedSearch, jlpt }),
    [scoped, debouncedSearch, jlpt],
  );

  // Phần 7D: phạm vi thư mục để quyết định GỠ (giữ từ) hay XÓA HẲN khi người dùng xóa.
  // null = 'Tất cả từ vựng' / tìm kiếm toàn cục; ngược lại = thư mục đang chọn + con cháu.
  const scopeFolderIds = useMemo(
    () => (folderId === null ? null : collectDescendantFolderIds(folders, folderId)),
    [folders, folderId],
  );
  const scopePath = useMemo(
    () => (folderId === null ? '' : folderPath(folders, folderId)),
    [folders, folderId],
  );

  // Quick Add: mặc định ĐÓNG khi phạm vi đã có từ, MỞ khi chưa có; tính lại khi ĐỔI thư mục.
  // Chỉ chốt khi dữ liệu 'ready' (tránh mở nhầm lúc tải); sau đó giữ nguyên thao tác bật/tắt tay.
  if (api.status === 'ready') {
    const scopeKey = folderId ?? '';
    if (scopeKey !== lastScopeKey) {
      setLastScopeKey(scopeKey);
      setQuickAddOpen(scoped.length === 0);
    }
  }

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

  // Id theo thứ tự: allIds = cả danh sách đã lọc (dùng cho shift-range + "Chọn tất cả M");
  // pageIds = riêng trang hiện tại (lái checkbox tiêu đề + Ctrl/Cmd+A).
  const allIds = useMemo(() => sorted.map((item) => item.id), [sorted]);
  const pageIds = useMemo(() => pageInfo.items.map((item) => item.id), [pageInfo.items]);
  const pageSel = pageState(selected, pageIds);

  const clearSelection = useCallback((): void => {
    setSelected(new Set<string>());
    setAnchorId(null);
  }, []);

  const togglePage = useCallback((): void => {
    setSelected((sel) => setMany(sel, pageIds, pageSel !== 'all'));
  }, [pageIds, pageSel]);

  // pointerdown ở ô checkbox: Shift = chọn dải từ neo; nếu không, chế độ = NGƯỢC trạng thái ô,
  // áp cho chính ô đó rồi (chuột/bút) bật kéo để pointerenter áp cùng chế độ cho dòng khác.
  const rowPointerDown = useCallback(
    (id: string, event: ReactPointerEvent): void => {
      if (event.button !== 0) return;
      event.preventDefault();
      if (event.shiftKey && anchorId !== null) {
        setSelected((sel) => setMany(sel, selectRange(allIds, anchorId, id), true));
        setAnchorId(id);
        return;
      }
      const mode = !selected.has(id);
      setSelected((sel) => setMany(sel, [id], mode));
      setAnchorId(id);
      if (event.pointerType === 'touch') return; // cảm ứng: chỉ bật/tắt, không kéo
      dragRef.current = { active: true, mode };
      setDragging(true);
    },
    [allIds, anchorId, selected],
  );

  const rowPointerEnter = useCallback((id: string): void => {
    if (!dragRef.current.active) return;
    setSelected((sel) => setMany(sel, [id], dragRef.current.mode));
  }, []);

  const rowKeyToggle = useCallback((id: string): void => {
    setSelected((sel) => toggleId(sel, id));
    setAnchorId(id);
  }, []);

  // Kết thúc kéo ở BẤT KỲ đâu — lắng nghe pointerup/pointercancel trên window.
  useEffect(() => {
    const end = (): void => {
      if (!dragRef.current.active) return;
      dragRef.current.active = false;
      setDragging(false);
    };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, []);

  // Khi focus trong danh sách: Ctrl/Cmd+A chọn cả TRANG; Esc bỏ chọn.
  const onListKeyDown = useCallback(
    (event: ReactKeyboardEvent): void => {
      if ((event.ctrlKey || event.metaKey) && (event.key === 'a' || event.key === 'A')) {
        event.preventDefault();
        setSelected((sel) => setMany(sel, pageIds, true));
      } else if (event.key === 'Escape') {
        clearSelection();
      }
    },
    [pageIds, clearSelection],
  );

  const confirmBulkDelete = useCallback(async (): Promise<void> => {
    const ids = [...selected];
    setBulkConfirm(false);
    await api.removeInScope(ids, scopeFolderIds);
    clearSelection();
  }, [selected, api, scopeFolderIds, clearSelection]);

  // Số liệu hộp xác nhận (dry-run THUẦN, không ghi gì) cho xóa từng dòng và xóa hàng loạt.
  const rowCopy =
    pendingDelete === null
      ? null
      : removalCopy(
          planWordRemoval(api.all, [pendingDelete.id], scopeFolderIds, COUNTS_ONLY).counts,
          scopeFolderIds,
          scopePath,
        );
  const bulkCopy = bulkConfirm
    ? removalCopy(
        planWordRemoval(api.all, [...selected], scopeFolderIds, COUNTS_ONLY).counts,
        scopeFolderIds,
        scopePath,
      )
    : null;

  return (
    <div className="kn-overview">
      <ToolbarSlot>
        <Button
          variant={quickAddOpen ? 'primary' : 'secondary'}
          aria-pressed={quickAddOpen}
          aria-expanded={quickAddOpen}
          onClick={() => setQuickAddOpen((open) => !open)}
        >
          Thêm từ
        </Button>
        <Button onClick={() => setImportOpen(true)}>Nhập từ file / dán</Button>
      </ToolbarSlot>
      {quickAddOpen ? <QuickAddForm folderId={folderId} onAdd={api.quickAdd} /> : null}
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
          <div className="kn-vselect" onKeyDown={onListKeyDown}>
            <VocabularyList
              items={pageInfo.items}
              onDelete={setPendingDelete}
              selectedIds={selected}
              pageSelectState={pageSel}
              dragging={dragging}
              onTogglePage={togglePage}
              onRowPointerDown={rowPointerDown}
              onRowPointerEnter={rowPointerEnter}
              onRowKeyToggle={rowKeyToggle}
            />
            {selected.size > 0 ? (
              <div className="kn-vactions" role="region" aria-label="Hành động hàng loạt">
                <span className="kn-vactions__count">Đã chọn {selected.size} từ</span>
                {selected.size < sorted.length ? (
                  <>
                    <span className="kn-vactions__sep" aria-hidden="true">
                      ·
                    </span>
                    <button
                      type="button"
                      className="kn-vactions__link"
                      onClick={() => setSelected(new Set(allIds))}
                    >
                      Chọn tất cả {sorted.length} từ trong phạm vi
                    </button>
                  </>
                ) : null}
                <span className="kn-vactions__sep" aria-hidden="true">
                  ·
                </span>
                <Button variant="primary" onClick={() => setBulkConfirm(true)}>
                  Xóa {selected.size} từ
                </Button>
                <span className="kn-vactions__sep" aria-hidden="true">
                  ·
                </span>
                <Button onClick={clearSelection}>Bỏ chọn</Button>
              </div>
            ) : null}
          </div>
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
        title={rowCopy?.title ?? 'Xóa từ'}
        onClose={() => setPendingDelete(null)}
        footer={
          <>
            <Button onClick={() => setPendingDelete(null)}>Hủy</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (pendingDelete !== null) {
                  void api.removeInScope([pendingDelete.id], scopeFolderIds);
                }
                setPendingDelete(null);
              }}
            >
              {rowCopy?.confirm ?? 'Xóa'}
            </Button>
          </>
        }
      >
        {rowCopy?.body}
      </Modal>

      <Modal
        open={bulkConfirm}
        title={bulkCopy?.title ?? 'Xóa từ'}
        onClose={() => setBulkConfirm(false)}
        footer={
          <>
            <Button onClick={() => setBulkConfirm(false)}>Hủy</Button>
            <Button variant="primary" onClick={() => void confirmBulkDelete()}>
              {bulkCopy?.confirm ?? 'Xóa'}
            </Button>
          </>
        }
      >
        {bulkCopy?.body}
      </Modal>

      {importOpen ? (
        <ImportModal
          open
          onClose={() => setImportOpen(false)}
          folders={folders}
          defaultFolderId={folderId}
          vocabs={api.all}
          onImport={api.importNew}
        />
      ) : null}
    </div>
  );
}

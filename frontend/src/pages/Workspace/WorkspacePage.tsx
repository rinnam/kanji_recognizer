import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FlashcardStudy } from '../../features/flashcard';
import { FolderTree } from '../../features/folder-tree';
import { QuizRunner } from '../../features/quiz';
import { VocabularyOverview } from '../../features/vocabulary';
import { folderPath, getAllFoldersLocal, type LocalFolder } from '../../entities/folder';
import {
  applyScope,
  getAllVocabulariesLocal,
  selectWordsInScope,
  type LocalVocabulary,
  type ScopeSelection,
} from '../../entities/vocabulary';
import {
  JLPT_PARAM,
  parseJlpt,
  parseTab,
  SEARCH_PARAM,
  TAB_PARAM,
  type TabId,
} from '../../routes';
import { useDb } from '../../shared/db';
import { subscribeDataChanged } from '../../shared/lib';
import {
  IconFolder,
  IconGrid,
  IconKeyboard,
  IconLayers,
  ScopeBar,
  ToolbarSlotProvider,
  ToolbarSlotTarget,
  type ScopeKind,
} from '../../shared/ui';
import './WorkspacePage.css';

interface TabMeta {
  readonly id: TabId;
  readonly label: string;
}

const TAB_META: readonly TabMeta[] = [
  { id: 'overview', label: 'Tổng quan' },
  { id: 'flashcard', label: 'Flashcard' },
  { id: 'quiz', label: 'Quiz' },
];

const TAB_ICON: Record<TabId, ReactElement> = {
  overview: <IconGrid />,
  flashcard: <IconLayers />,
  quiz: <IconKeyboard />,
};

const ALL_LABEL = 'Tất cả từ vựng';
const DEFAULT_SCOPE: ScopeSelection = { mode: 'all', n: 30, seed: 0 };

/**
 * Màn hình làm việc gộp (Việc A): cây thư mục luôn hiện ở cột trái; đổi chế độ bằng
 * tab (lưu trong URL ?tab=) mà KHÔNG chuyển trang. Thư mục đang chọn ở sidebar là
 * phạm vi dữ liệu cho cả ba tab. Sidebar luôn mounted nên trạng thái cây được giữ.
 */
export function WorkspacePage(): ReactElement {
  const [params, setParams] = useSearchParams();
  const tab = parseTab(params.get(TAB_PARAM));
  const query = params.get(SEARCH_PARAM) ?? '';
  const jlpt = parseJlpt(params.get(JLPT_PARAM));

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedFolderName, setSelectedFolderName] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const db = useDb();
  const [vocabs, setVocabs] = useState<LocalVocabulary[]>([]);
  const [folders, setFolders] = useState<LocalFolder[]>([]);
  const [scope, setScope] = useState<ScopeSelection>(DEFAULT_SCOPE);
  // `scope` đổi tức thì (ô N + viên x/y mượt); `appliedN` là N đã debounce — dùng để remount vùng học.
  const [appliedN, setAppliedN] = useState(DEFAULT_SCOPE.n);
  const nTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Nạp vocab + thư mục còn sống để đếm x/y cho thanh phạm vi; nghe thay đổi dữ liệu.
  useEffect(() => {
    let active = true;
    const load = async (): Promise<void> => {
      const [vrows, frows] = await Promise.all([
        getAllVocabulariesLocal(db),
        getAllFoldersLocal(db),
      ]);
      if (!active) return;
      setVocabs(vrows.filter((item) => item.deletedAt === null));
      setFolders(frows.filter((item) => item.deletedAt === null));
    };
    void load();
    const unsubscribe = subscribeDataChanged(() => void load());
    return () => {
      active = false;
      unsubscribe();
    };
  }, [db]);

  // Dọn timer debounce khi rời trang.
  useEffect(
    () => () => {
      if (nTimer.current !== null) clearTimeout(nTimer.current);
    },
    [],
  );

  const words = useMemo(
    () => selectWordsInScope(vocabs, folders, selectedFolderId),
    [vocabs, folders, selectedFolderId],
  );
  const scopeTotal = words.length;
  const scopeUsed = useMemo(() => applyScope(words, scope).length, [words, scope]);
  // Phạm vi truyền xuống dùng N đã debounce (appliedN) để không remount vùng học mỗi lần gõ.
  const studyScope = useMemo<ScopeSelection>(
    () => ({ mode: scope.mode, n: appliedN, seed: scope.seed }),
    [scope.mode, scope.seed, appliedN],
  );
  const studyKey = `${selectedFolderId ?? 'all'}|${scope.mode}|${String(appliedN)}|${String(scope.seed)}`;

  const scopeLabel = selectedFolderName ?? ALL_LABEL;
  // Chip "Đang chọn": đường dẫn đầy đủ (vd 'Ôn Thi Giữa Kì › Hán Tự'); rỗng/ở gốc → nhãn thường.
  const scopePath =
    selectedFolderId === null ? ALL_LABEL : folderPath(folders, selectedFolderId) || scopeLabel;

  const setTab = (next: TabId): void => {
    const nextParams = new URLSearchParams(params);
    nextParams.set(TAB_PARAM, next);
    setParams(nextParams, { replace: true });
  };

  const selectFolder = (id: string | null, name: string | null): void => {
    setSelectedFolderId(id);
    setSelectedFolderName(name);
    setScope(DEFAULT_SCOPE);
    setAppliedN(DEFAULT_SCOPE.n);
    setDrawerOpen(false);
  };

  // Chip phạm vi: Random bốc lại (seed + 1) kể cả khi đang ở Random; 'all'/'first' chỉ đổi mode.
  const changeKind = (next: ScopeKind): void => {
    setScope((prev) =>
      next === 'random'
        ? { ...prev, mode: 'random', seed: prev.seed + 1 }
        : { ...prev, mode: next },
    );
  };
  // Ô số N: đổi scope.n tức thì (ô nhập + viên x/y mượt) rồi debounce ~300ms chốt appliedN (kẹp [1, y]).
  const changeN = (value: number): void => {
    const clamped = Math.max(1, Math.min(Math.round(value) || 1, Math.max(1, scopeTotal)));
    setScope((prev) => ({ ...prev, n: clamped }));
    if (nTimer.current !== null) clearTimeout(nTimer.current);
    nTimer.current = setTimeout(() => {
      setAppliedN(clamped);
    }, 300);
  };

  return (
    <ToolbarSlotProvider>
      <div className={drawerOpen ? 'kn-ws kn-ws--drawer-open' : 'kn-ws'}>
      <aside className="kn-ws__sidebar" aria-label="Quản lý thư mục">
        <div className="kn-ws__drawer-head">
          <span>Thư mục</span>
          <button
            type="button"
            className="kn-btn"
            onClick={() => setDrawerOpen(false)}
            aria-label="Đóng danh sách thư mục"
          >
            ✕
          </button>
        </div>
        <FolderTree selectedId={selectedFolderId} onSelect={selectFolder} />
      </aside>

      <button
        type="button"
        className="kn-ws__scrim"
        aria-label="Đóng danh sách thư mục"
        tabIndex={drawerOpen ? 0 : -1}
        onClick={() => setDrawerOpen(false)}
      />

      <div className="kn-ws__content">
        <button
          type="button"
          className="kn-ws__folder-chip"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)}
        >
          {scopeLabel} ⌄
        </button>

        {/* Thanh gộp (7F): TRÁI = chip "Đang chọn" · GIỮA = tabs · PHẢI = phạm vi / nút hành động. */}
        <div className="kn-ws__scope">
          <div className="kn-ws__scope-left">
            <span className="kn-ws__scope-label">Đang chọn:</span>
            <span className="kn-ws__scope-chip" title={scopePath}>
              <IconFolder className="kn-ws__scope-chip-icon" />
              <span className="kn-ws__scope-path">{scopePath}</span>
            </span>
          </div>
          <div className="kn-ws__tabs" role="tablist" aria-label="Chế độ học">
            {TAB_META.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                className={tab === item.id ? 'kn-ws__tab kn-ws__tab--active' : 'kn-ws__tab'}
                onClick={() => setTab(item.id)}
              >
                <span className="kn-ws__tab-icon" aria-hidden="true">
                  {TAB_ICON[item.id]}
                </span>
                {item.label}
              </button>
            ))}
          </div>
          <div className="kn-ws__scope-right">
            {tab === 'overview' ? <ToolbarSlotTarget className="kn-ws__scope-actions" /> : null}
            {tab === 'flashcard' || tab === 'quiz' ? (
              <ScopeBar
                variant="inline"
                total={scopeTotal}
                used={scopeUsed}
                kind={scope.mode}
                n={scope.n}
                onKindChange={changeKind}
                onNChange={changeN}
              />
            ) : null}
          </div>
        </div>

        <div className="kn-ws__panel">
          {tab === 'overview' ? (
            <VocabularyOverview folderId={selectedFolderId} query={query} jlpt={jlpt} />
          ) : null}
          {tab === 'flashcard' ? (
            <div className="kn-ws__study">
              <FlashcardStudy key={studyKey} folderId={selectedFolderId} scope={studyScope} />
            </div>
          ) : null}
          {tab === 'quiz' ? (
            <div className="kn-ws__study">
              <QuizRunner key={studyKey} folderId={selectedFolderId} scope={studyScope} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
    </ToolbarSlotProvider>
  );
}

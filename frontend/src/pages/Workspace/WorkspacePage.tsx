import { useMemo, useState, type ReactElement } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FlashcardStudy } from '../../features/flashcard';
import { FolderTree } from '../../features/folder-tree';
import { QuizRunner } from '../../features/quiz';
import { VocabularyOverview } from '../../features/vocabulary';
import { parseTab, TAB_PARAM, type TabId } from '../../routes';
import './WorkspacePage.css';

interface TabMeta {
  readonly id: TabId;
  readonly label: string;
  readonly hint: string;
}

const TAB_META: readonly TabMeta[] = [
  {
    id: 'overview',
    label: 'Tổng quan',
    hint: 'Thêm, lọc và quản lý từ trong phạm vi đang chọn.',
  },
  { id: 'flashcard', label: 'Flashcard', hint: 'Bấm thẻ hoặc nhấn Space để lật.' },
  { id: 'quiz', label: 'Quiz', hint: 'Gõ đáp án rồi nhấn Enter để nộp.' },
];

const ALL_LABEL = 'Tất cả từ vựng';

/**
 * Màn hình làm việc gộp (Việc A): cây thư mục luôn hiện ở cột trái; đổi chế độ bằng
 * tab (lưu trong URL ?tab=) mà KHÔNG chuyển trang. Thư mục đang chọn ở sidebar là
 * phạm vi dữ liệu cho cả ba tab. Sidebar luôn mounted nên trạng thái cây được giữ.
 */
export function WorkspacePage(): ReactElement {
  const [params, setParams] = useSearchParams();
  const tab = parseTab(params.get(TAB_PARAM));

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedFolderName, setSelectedFolderName] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const activeHint = useMemo(
    () => TAB_META.find((item) => item.id === tab)?.hint ?? '',
    [tab],
  );
  const scopeLabel = selectedFolderName ?? ALL_LABEL;

  const setTab = (next: TabId): void => {
    const nextParams = new URLSearchParams(params);
    nextParams.set(TAB_PARAM, next);
    setParams(nextParams, { replace: true });
  };

  const selectFolder = (id: string | null, name: string | null): void => {
    setSelectedFolderId(id);
    setSelectedFolderName(name);
    setDrawerOpen(false);
  };

  return (
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

        <div className="kn-ws__scope">
          <span className="kn-ws__scope-label">Đang chọn:</span>
          <span className="kn-ws__scope-chip">{scopeLabel}</span>
        </div>

        <div className="kn-ws__tabbar">
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
                {item.label}
              </button>
            ))}
          </div>
          <p className="kn-ws__hint">{activeHint}</p>
        </div>

        <div className="kn-ws__panel">
          {tab === 'overview' ? <VocabularyOverview folderId={selectedFolderId} /> : null}
          {tab === 'flashcard' ? (
            <FlashcardStudy key={selectedFolderId ?? 'all'} folderId={selectedFolderId} />
          ) : null}
          {tab === 'quiz' ? (
            <QuizRunner key={selectedFolderId ?? 'all'} folderId={selectedFolderId} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

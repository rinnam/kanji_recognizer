import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { getAllVocabulariesLocal, type LocalVocabulary } from '../../../entities/vocabulary';
import { useDb } from '../../../shared/db';
import { subscribeDataChanged } from '../../../shared/lib';
import { Button, EmptyState, ErrorState, Input, LoadingState } from '../../../shared/ui';
import { useFolderTree } from '../model/useFolderTree';
import type { FolderTreeNode } from '../model/tree';
import { FolderTreeItem } from './FolderTreeItem';
import './folder-tree.css';

/** Kiểu MIME nội bộ mang id folder khi kéo–thả. */
export const FOLDER_DRAG_MIME = 'application/x-kn-folder-id';

interface FolderTreeProps {
  selectedId: string | null;
  onSelect: (id: string | null, name: string | null) => void;
}

/**
 * Đếm số từ còn sống (không trùng) theo từng thư mục, GỒM mọi thư mục con cháu.
 * TODO(B0): thay bằng hàm thuần collectDescendantFolderIds/selectWordsInScope + unit test.
 */
function subtreeFolderIds(node: FolderTreeNode): string[] {
  const ids = [node.folder.id];
  for (const child of node.children) ids.push(...subtreeFolderIds(child));
  return ids;
}

function buildCounts(
  nodes: readonly FolderTreeNode[],
  vocab: readonly LocalVocabulary[],
  out: Map<string, number>,
): void {
  for (const node of nodes) {
    const ids = new Set(subtreeFolderIds(node));
    let count = 0;
    for (const item of vocab) {
      if (item.folderIds.some((id) => ids.has(id))) count += 1;
    }
    out.set(node.folder.id, count);
    buildCounts(node.children, vocab, out);
  }
}

/** Cây thư mục local-first: tạo/sửa/xóa + kéo–thả; badge số từ theo phạm vi (gồm thư mục con). */
export function FolderTree({ selectedId, onSelect }: FolderTreeProps): ReactElement {
  const api = useFolderTree();
  const db = useDb();
  const [newName, setNewName] = useState('');
  const [rootOver, setRootOver] = useState(false);
  const [vocab, setVocab] = useState<LocalVocabulary[]>([]);

  // Nạp từ vựng còn sống để tính badge; nghe thay đổi dữ liệu để số luôn khớp Overview.
  useEffect(() => {
    let active = true;
    const load = async (): Promise<void> => {
      const rows = await getAllVocabulariesLocal(db);
      if (active) setVocab(rows.filter((item) => item.deletedAt === null));
    };
    void load();
    const unsubscribe = subscribeDataChanged(() => void load());
    return () => {
      active = false;
      unsubscribe();
    };
  }, [db]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    buildCounts(api.tree, vocab, map);
    return map;
  }, [api.tree, vocab]);
  const total = vocab.length;

  if (api.status === 'loading') return <LoadingState label="Đang tải thư mục…" />;
  if (api.status === 'error') {
    return <ErrorState message={api.error ?? undefined} onRetry={() => void api.reload()} />;
  }

  const addRoot = (): void => {
    void api.create(newName, null);
    setNewName('');
  };

  return (
    <div className="kn-ftree">
      <div className="kn-ftree__head">
        <h3 className="kn-ftree__title">Quản lý Thư mục</h3>
      </div>

      <button
        type="button"
        className={
          selectedId === null ? 'kn-ftree__all kn-ftree__all--active' : 'kn-ftree__all'
        }
        aria-pressed={selectedId === null}
        onClick={() => onSelect(null, null)}
      >
        <span className="kn-ftree__all-label">Tất cả từ vựng</span>
        <span className="kn-ftree__badge kn-ftree__badge--all">{total}</span>
      </button>

      <p className="kn-ftree__section">CÂY THƯ MỤC</p>

      <div
        className={
          rootOver ? 'kn-ftree__root-drop kn-ftree__root-drop--over' : 'kn-ftree__root-drop'
        }
        onDragOver={(event) => {
          event.preventDefault();
          setRootOver(true);
        }}
        onDragLeave={() => setRootOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setRootOver(false);
          const id = event.dataTransfer.getData(FOLDER_DRAG_MIME);
          if (id !== '') void api.moveInto(id, null);
        }}
      >
        Kéo vào đây để đưa ra thư mục gốc
      </div>

      {api.tree.length === 0 ? (
        <EmptyState title="Chưa có thư mục" description="Tạo thư mục đầu tiên bên dưới." />
      ) : (
        <ul className="kn-ftree__list" role="tree" aria-label="Cây thư mục">
          {api.tree.map((node) => (
            <FolderTreeItem
              key={node.folder.id}
              node={node}
              depth={0}
              api={api}
              selectedId={selectedId}
              onSelect={onSelect}
              counts={counts}
            />
          ))}
        </ul>
      )}

      <form
        className="kn-ftree__add"
        onSubmit={(event) => {
          event.preventDefault();
          addRoot();
        }}
      >
        <Input
          aria-label="Tên thư mục gốc mới"
          placeholder="Thư mục mới…"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
        />
        <Button type="submit" variant="primary" disabled={newName.trim() === ''}>
          Thêm
        </Button>
      </form>
    </div>
  );
}

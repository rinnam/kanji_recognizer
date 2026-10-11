import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { findDuplicateSiblingIds } from '../../../entities/folder';
import {
  getAllVocabulariesLocal,
  selectWordsInScope,
  type LocalVocabulary,
} from '../../../entities/vocabulary';
import { useDb } from '../../../shared/db';
import { subscribeDataChanged } from '../../../shared/lib';
import { Button, EmptyState, ErrorState, Input, LoadingState } from '../../../shared/ui';
import { useFolderTree } from '../model/useFolderTree';
import { FolderTreeItem } from './FolderTreeItem';
import './folder-tree.css';

/** Kiểu MIME nội bộ mang id folder khi kéo–thả. */
export const FOLDER_DRAG_MIME = 'application/x-kn-folder-id';

interface FolderTreeProps {
  selectedId: string | null;
  onSelect: (id: string | null, name: string | null) => void;
}

/** Cây thư mục local-first: tạo/sửa/xóa + kéo–thả; badge số từ theo phạm vi (gồm thư mục con). */
export function FolderTree({ selectedId, onSelect }: FolderTreeProps): ReactElement {
  const api = useFolderTree();
  const db = useDb();
  const [newName, setNewName] = useState('');
  const [rootOver, setRootOver] = useState(false);
  const [vocab, setVocab] = useState<LocalVocabulary[]>([]);
  const [addError, setAddError] = useState<string | null>(null);
  const [treeAlert, setTreeAlert] = useState<string | null>(null);

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

  // Badge mỗi thư mục = số từ trong phạm vi (gồm con cháu) — dùng chung hàm thuần với Overview.
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const folder of api.folders) {
      map.set(folder.id, selectWordsInScope(vocab, api.folders, folder.id).length);
    }
    return map;
  }, [api.folders, vocab]);
  const total = vocab.length;
  // Thư mục cũ trùng tên anh em cùng cấp (dữ liệu trước ràng buộc) → đánh dấu ⚠ (không tự sửa).
  const duplicateIds = useMemo(() => findDuplicateSiblingIds(api.folders), [api.folders]);

  if (api.status === 'loading') return <LoadingState label="Đang tải thư mục…" />;
  if (api.status === 'error') {
    return <ErrorState message={api.error ?? undefined} onRetry={() => void api.reload()} />;
  }

  const addRoot = async (): Promise<void> => {
    const result = await api.create(newName, null);
    if (result.ok) {
      setNewName('');
      setAddError(null);
    } else {
      setAddError(result.error ?? null);
    }
  };

  // Kéo–thả vào một thư mục/gốc: nếu trùng tên cùng cấp thì HỦY và báo role="alert" trong cây.
  const handleMoveInto = async (draggedId: string, parentId: string | null): Promise<void> => {
    const result = await api.moveInto(draggedId, parentId);
    setTreeAlert(result.ok ? null : result.error ?? null);
  };

  return (
    <div className="kn-ftree">
      <div className="kn-ftree__top">
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
      </div>

      <div className="kn-ftree__scroll">
        <p className="kn-ftree__section">CÂY THƯ MỤC</p>

        {treeAlert !== null ? (
          <p className="kn-ftree__alert" role="alert">
            {treeAlert}
          </p>
        ) : null}

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
            if (id !== '') void handleMoveInto(id, null);
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
                duplicateIds={duplicateIds}
                onMoveInto={handleMoveInto}
              />
            ))}
          </ul>
        )}
      </div>

      <form
        className="kn-ftree__add"
        onSubmit={(event) => {
          event.preventDefault();
          void addRoot();
        }}
      >
        <Input
          aria-label="Tên thư mục gốc mới"
          placeholder="Thư mục mới…"
          value={newName}
          onChange={(event) => {
            setNewName(event.target.value);
            setAddError(null);
          }}
        />
        <Button type="submit" variant="primary" disabled={newName.trim() === ''}>
          Thêm
        </Button>
        {addError !== null ? (
          <p className="kn-ftree__error" role="alert">
            {addError}
          </p>
        ) : null}
      </form>
    </div>
  );
}

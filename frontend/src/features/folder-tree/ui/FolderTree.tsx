import { useState, type ReactElement } from 'react';
import { Button, EmptyState, ErrorState, Input, LoadingState } from '../../../shared/ui';
import { useFolderTree } from '../model/useFolderTree';
import { FolderTreeItem } from './FolderTreeItem';
import './folder-tree.css';

/** Kiểu MIME nội bộ mang id folder khi kéo–thả. */
export const FOLDER_DRAG_MIME = 'application/x-kn-folder-id';

interface FolderTreeProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

/** Cây thư mục local-first: tạo/sửa/xóa + kéo–thả đổi cha/sắp thứ tự. */
export function FolderTree({ selectedId, onSelect }: FolderTreeProps): ReactElement {
  const api = useFolderTree();
  const [newName, setNewName] = useState('');
  const [rootOver, setRootOver] = useState(false);

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
        <h3 className="kn-ftree__title">Thư mục</h3>
        <button
          type="button"
          className={
            selectedId === null ? 'kn-ftree__all kn-ftree__all--active' : 'kn-ftree__all'
          }
          onClick={() => onSelect(null)}
        >
          Tất cả từ
        </button>
      </div>

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

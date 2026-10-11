import { useState, type ReactElement } from 'react';
import { Button, IconWarning, Input, Modal } from '../../../shared/ui';
import type { FolderTreeApi } from '../model/useFolderTree';
import type { FolderCascadeCounts } from '../model/cascade';
import type { FolderTreeNode } from '../model/tree';
import { FOLDER_DRAG_MIME } from './FolderTree';

const DUPLICATE_HINT = 'Trùng tên với thư mục cùng cấp, hãy đổi tên';

interface FolderTreeItemProps {
  node: FolderTreeNode;
  depth: number;
  api: FolderTreeApi;
  selectedId: string | null;
  onSelect: (id: string | null, name: string | null) => void;
  counts: Map<string, number>;
  /** id các thư mục đang trùng tên anh em cùng cấp (hiển thị ⚠). */
  duplicateIds: Set<string>;
  /** Kéo–thả vào thư mục này: do cha xử lý để báo lỗi trùng tên tập trung. */
  onMoveInto: (draggedId: string, parentId: string | null) => Promise<void>;
}

type EditMode = 'none' | 'rename' | 'add-child';
type DropHint = 'none' | 'into' | 'before';

function rowClass(selected: boolean, over: boolean): string {
  return ['kn-ftree__row', selected ? 'kn-ftree__row--selected' : '', over ? 'kn-ftree__row--over' : '']
    .filter(Boolean)
    .join(' ');
}

/** Một nút trong cây: chọn, kéo–thả, đổi tên, thêm con, xóa (có xác nhận). */
export function FolderTreeItem({
  node,
  depth,
  api,
  selectedId,
  onSelect,
  counts,
  duplicateIds,
  onMoveInto,
}: FolderTreeItemProps): ReactElement {
  const { folder, children } = node;
  const count = counts.get(folder.id) ?? 0;
  const [expanded, setExpanded] = useState(true);
  const [edit, setEdit] = useState<EditMode>('none');
  const [draft, setDraft] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [planCounts, setPlanCounts] = useState<FolderCascadeCounts | null>(null);
  const [drop, setDrop] = useState<DropHint>('none');
  const isDuplicate = duplicateIds.has(folder.id);

  const openDeleteConfirm = (): void => {
    setPlanCounts(null);
    setConfirmDelete(true);
    void api.planRemove(folder.id).then(setPlanCounts);
  };

  const hasChildren = children.length > 0;
  const selected = selectedId === folder.id;

  const closeEdit = (): void => {
    setEdit('none');
    setDraft('');
    setEditError(null);
  };

  const openEdit = (mode: EditMode, initial: string): void => {
    setDraft(initial);
    setEditError(null);
    setEdit(mode);
  };

  // Lưu đổi tên / thêm con; trùng tên cùng cấp → GIỮ form mở và báo lỗi ngay dưới ô nhập.
  const submitEdit = async (): Promise<void> => {
    if (edit === 'none') return;
    const result =
      edit === 'rename'
        ? await api.rename(folder.id, draft)
        : await api.create(draft, folder.id);
    if (result.ok) closeEdit();
    else setEditError(result.error ?? null);
  };

  const readDragId = (event: React.DragEvent): string =>
    event.dataTransfer.getData(FOLDER_DRAG_MIME);

  return (
    <li
      className="kn-ftree__item"
      role="treeitem"
      aria-expanded={hasChildren ? expanded : undefined}
      aria-selected={selected}
    >
      <div
        className={drop === 'before' ? 'kn-ftree__gap kn-ftree__gap--over' : 'kn-ftree__gap'}
        onDragOver={(event) => {
          event.preventDefault();
          setDrop('before');
        }}
        onDragLeave={() => setDrop('none')}
        onDrop={(event) => {
          event.preventDefault();
          setDrop('none');
          const id = readDragId(event);
          if (id !== '') void api.moveBefore(id, folder.id);
        }}
      />

      <div
        className={rowClass(selected, drop === 'into')}
        style={{ paddingLeft: `${depth * 1.1 + 0.25}rem` }}
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData(FOLDER_DRAG_MIME, folder.id);
          event.dataTransfer.effectAllowed = 'move';
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDrop('into');
        }}
        onDragLeave={() => setDrop('none')}
        onDrop={(event) => {
          event.preventDefault();
          setDrop('none');
          const id = readDragId(event);
          if (id !== '') void onMoveInto(id, folder.id);
        }}
      >
        <button
          type="button"
          className="kn-ftree__twisty"
          aria-hidden={!hasChildren}
          disabled={!hasChildren}
          tabIndex={hasChildren ? 0 : -1}
          onClick={() => setExpanded((value) => !value)}
        >
          {hasChildren ? (expanded ? '▾' : '▸') : '•'}
        </button>
        <button
          type="button"
          className="kn-ftree__name"
          aria-pressed={selected}
          onClick={() => onSelect(folder.id, folder.name)}
        >
          {folder.name}
        </button>
        {isDuplicate ? (
          <span className="kn-ftree__warn" role="img" aria-label={DUPLICATE_HINT} title={DUPLICATE_HINT}>
            <IconWarning />
          </span>
        ) : null}
        <span className="kn-ftree__badge" aria-label={`${count} từ`}>
          {count}
        </span>
        <span className="kn-ftree__actions">
          <button
            type="button"
            className="kn-ftree__icon"
            aria-label={`Thêm thư mục con trong ${folder.name}`}
            onClick={() => openEdit('add-child', '')}
          >
            ＋
          </button>
          <button
            type="button"
            className="kn-ftree__icon"
            aria-label={`Đổi tên ${folder.name}`}
            onClick={() => openEdit('rename', folder.name)}
          >
            ✎
          </button>
          <button
            type="button"
            className="kn-ftree__icon"
            aria-label={`Xóa ${folder.name}`}
            onClick={openDeleteConfirm}
          >
            🗑
          </button>
        </span>
      </div>

      {edit !== 'none' ? (
        <form
          className="kn-ftree__edit"
          style={{ paddingLeft: `${depth * 1.1 + 1.5}rem` }}
          onSubmit={(event) => {
            event.preventDefault();
            void submitEdit();
          }}
        >
          <Input
            autoFocus
            aria-label={edit === 'rename' ? 'Tên mới' : 'Tên thư mục con'}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setEditError(null);
            }}
          />
          <Button type="submit" variant="primary" disabled={draft.trim() === ''}>
            Lưu
          </Button>
          <Button type="button" onClick={closeEdit}>
            Hủy
          </Button>
          {editError !== null ? (
            <p className="kn-ftree__error" role="alert">
              {editError}
            </p>
          ) : null}
        </form>
      ) : null}

      {hasChildren && expanded ? (
        <ul className="kn-ftree__list" role="group">
          {children.map((child) => (
            <FolderTreeItem
              key={child.folder.id}
              node={child}
              depth={depth + 1}
              api={api}
              selectedId={selectedId}
              onSelect={onSelect}
              counts={counts}
              duplicateIds={duplicateIds}
              onMoveInto={onMoveInto}
            />
          ))}
        </ul>
      ) : null}

      <Modal
        open={confirmDelete}
        title={`Xóa thư mục «${folder.name}»?`}
        onClose={() => setConfirmDelete(false)}
        footer={
          <>
            <Button onClick={() => setConfirmDelete(false)}>Hủy</Button>
            <Button
              variant="primary"
              onClick={() => {
                setConfirmDelete(false);
                void api.remove(folder.id);
              }}
            >
              Xóa
            </Button>
          </>
        }
      >
        {planCounts === null ? (
          <p>Đang tính phạm vi xóa…</p>
        ) : (
          <p>
            Sẽ xóa <strong>{planCounts.childFolders}</strong> thư mục con và{' '}
            <strong>{planCounts.vocabTombstoned}</strong> từ vựng.
            {planCounts.vocabKept > 0 ? (
              <>
                {' '}
                <strong>{planCounts.vocabKept}</strong> từ thuộc thư mục khác sẽ được giữ lại.
              </>
            ) : null}{' '}
            Không thể hoàn tác.
          </p>
        )}
      </Modal>
    </li>
  );
}

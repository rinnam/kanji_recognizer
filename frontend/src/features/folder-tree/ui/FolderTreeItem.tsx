import { useState, type ReactElement } from 'react';
import { Button, Input, Modal } from '../../../shared/ui';
import type { FolderTreeApi } from '../model/useFolderTree';
import type { FolderCascadeCounts } from '../model/cascade';
import type { FolderTreeNode } from '../model/tree';
import { FOLDER_DRAG_MIME } from './FolderTree';

interface FolderTreeItemProps {
  node: FolderTreeNode;
  depth: number;
  api: FolderTreeApi;
  selectedId: string | null;
  onSelect: (id: string | null, name: string | null) => void;
  counts: Map<string, number>;
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
}: FolderTreeItemProps): ReactElement {
  const { folder, children } = node;
  const count = counts.get(folder.id) ?? 0;
  const [expanded, setExpanded] = useState(true);
  const [edit, setEdit] = useState<EditMode>('none');
  const [draft, setDraft] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [planCounts, setPlanCounts] = useState<FolderCascadeCounts | null>(null);
  const [drop, setDrop] = useState<DropHint>('none');

  const openDeleteConfirm = (): void => {
    setPlanCounts(null);
    setConfirmDelete(true);
    void api.planRemove(folder.id).then(setPlanCounts);
  };

  const hasChildren = children.length > 0;
  const selected = selectedId === folder.id;

  const submitEdit = (): void => {
    if (edit === 'rename') void api.rename(folder.id, draft);
    else if (edit === 'add-child') void api.create(draft, folder.id);
    setEdit('none');
    setDraft('');
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
          if (id !== '') void api.moveInto(id, folder.id);
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
        <span className="kn-ftree__badge" aria-label={`${count} từ`}>
          {count}
        </span>
        <span className="kn-ftree__actions">
          <button
            type="button"
            className="kn-ftree__icon"
            aria-label={`Thêm thư mục con trong ${folder.name}`}
            onClick={() => {
              setDraft('');
              setEdit('add-child');
            }}
          >
            ＋
          </button>
          <button
            type="button"
            className="kn-ftree__icon"
            aria-label={`Đổi tên ${folder.name}`}
            onClick={() => {
              setDraft(folder.name);
              setEdit('rename');
            }}
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
            submitEdit();
          }}
        >
          <Input
            autoFocus
            aria-label={edit === 'rename' ? 'Tên mới' : 'Tên thư mục con'}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <Button type="submit" variant="primary" disabled={draft.trim() === ''}>
            Lưu
          </Button>
          <Button type="button" onClick={() => setEdit('none')}>
            Hủy
          </Button>
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

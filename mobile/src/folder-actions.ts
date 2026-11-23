import { isFolderNameTaken } from '../../frontend/src/entities/folder/model/path';
import { collectDescendantFolderIds } from '../../frontend/src/entities/vocabulary/model/scope';
import { ORDER_STEP, reparentAppend, reorderBefore, siblingsOf } from '../../frontend/src/features/folder-tree/model/tree';
import { createLocalFolder, type LocalWorkspace } from './workspace-storage';

export type FolderAction =
  | { kind: 'create'; parentId: string | null; name: string }
  | { kind: 'rename'; id: string; name: string }
  | { kind: 'move'; id: string; parentId: string | null; beforeId?: string }
  | { kind: 'remove'; id: string; signature: string };

export function deletionPreview(library: LocalWorkspace, id: string) {
  const ids = collectDescendantFolderIds(library.folders, id);
  const live = new Set(library.folders.filter(f => !f.deletedAt).map(f => f.id));
  const words = library.vocabularies.filter(w => !w.deletedAt && w.folderIds.some(key => ids.has(key)));
  const kept = words.filter(w => w.folderIds.some(key => live.has(key) && !ids.has(key))).length;
  const signature = JSON.stringify([
    [...ids].sort(), words.map(w => [w.id, w.updatedAt]).sort(), kept,
  ]);
  return { ids, words, kept, removed: words.length - kept, live, signature };
}

export function folderWrites(library: LocalWorkspace, action: FolderAction): LocalWorkspace {
  const { folders } = library;
  const current = action.kind === 'create' ? undefined : folders.find(f => f.id === action.id && !f.deletedAt);
  if (action.kind !== 'create' && !current) throw new Error('Thư mục đã thay đổi.');
  const stamp = (previous: string) => new Date(Math.max(Date.now(), Date.parse(previous) + 1)).toISOString();
  if (action.kind === 'remove') {
    const plan = deletionPreview(library, action.id);
    if (plan.signature !== action.signature) throw new Error('Nội dung đã thay đổi. Kiểm tra lại trước khi xóa.');
    return {
      folders: folders.filter(f => plan.ids.has(f.id)).map(f => {
        const now = stamp(f.updatedAt);
        return { ...f, updatedAt: now, deletedAt: now };
      }),
      vocabularies: plan.words.map(w => {
        const folderIds = w.folderIds.filter(key => !plan.ids.has(key));
        const now = stamp(w.updatedAt);
        return { ...w, folderIds, updatedAt: now, deletedAt: folderIds.some(key => plan.live.has(key)) ? null : now };
      }),
    };
  }
  const parent = action.kind === 'rename' ? current!.parentId : action.parentId;
  if (parent !== null && !folders.some(f => f.id === parent && !f.deletedAt)) throw new Error('Không tìm thấy thư mục cha.');
  const name = action.kind === 'move' ? current!.name : action.name.trim();
  if (!name) throw new Error('Nhập tên thư mục.');
  if (isFolderNameTaken(folders, parent, name, current?.id)) throw new Error('Đã có thư mục cùng tên ở cấp này.');
  if (action.kind === 'move') {
    const patches = action.beforeId ? reorderBefore(folders, action.id, action.beforeId) : reparentAppend(folders, action.id, parent);
    if (!patches.length) throw new Error('Không thể chuyển tới vị trí này.');
    return { folders: patches.map(p => {
      const f = folders.find(row => row.id === p.id)!;
      return { ...f, ...p, updatedAt: stamp(f.updatedAt) };
    }), vocabularies: [] };
  }
  const folder = current ? { ...current, name, updatedAt: stamp(current.updatedAt) } : {
    ...createLocalFolder(name, parent), order: (siblingsOf(folders, parent).length + 1) * ORDER_STEP,
  };
  return { folders: [folder], vocabularies: [] };
}


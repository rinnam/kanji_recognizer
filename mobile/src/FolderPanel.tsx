import { useRef, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { folderPath } from '../../frontend/src/entities/folder/model/path';
import { Control } from './WorkspaceButton';
import { deletionPreview, type FolderAction } from './folder-actions';
import type { FolderRow } from './workspace-model';
import type { LocalWorkspace } from './workspace-storage';
import type { WorkspaceTheme } from './workspace-theme';
import { FolderDragItem, RootDropTarget } from './FolderDragItem';
import { WorkspaceIcon, type WorkspaceIconName } from './WorkspaceIcon';

type EditKind = 'create' | 'rename' | 'remove' | 'move';

export function FolderPanel({ theme, library, rows, selected, onSelect, onChange, compact, close, maxHeight }: {
  theme: WorkspaceTheme; library?: LocalWorkspace; rows: FolderRow[]; selected: string | null;
  onSelect: (id: string | null) => void; onChange?: (action: FolderAction) => Promise<void>;
  compact: boolean; close: () => void; maxHeight: number;
}) {
  const { styles, colors } = theme;
  const [collapsed, setCollapsed] = useState(new Set<string>());
  const [edit, setEdit] = useState<{ kind: EditKind; id: string | null }>();
  const [name, setName] = useState('');
  const [rootName, setRootName] = useState('');
  const [toolsFor, setToolsFor] = useState<string>();
  const [moveSource, setMoveSource] = useState<string>();
  const [hovered, setHovered] = useState<string>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const active = rows.find(row => row.folder.id === edit?.id);
  const plan = edit?.kind === 'remove' && library && active ? deletionPreview(library, active.folder.id) : undefined;
  const hidden = new Set<string>();
  for (const row of rows) if (collapsed.has(row.folder.id)) {
    for (const id of row.childIds) if (id !== row.folder.id) hidden.add(id);
  }
  function open(kind: NonNullable<typeof edit>['kind'], id: string | null, value = '') {
    setEdit({ kind, id }); setName(value); setError('');
  }
  async function save(action: FolderAction) {
    if (!onChange || lock.current) return false;
    lock.current = true; setBusy(true); setError('');
    try {
      await onChange(action);
      setEdit(undefined);
      setToolsFor(undefined);
      if (action.kind === 'create' && action.parentId) {
        setCollapsed(prev => { const next = new Set(prev); next.delete(action.parentId!); return next; });
      }
      if (action.kind === 'remove' && selected && plan?.ids.has(selected)) onSelect(null);
      return true;
    } catch (e) { setError(e instanceof Error ? e.message : 'Không lưu được thư mục.'); }
    finally { setBusy(false); lock.current = false; }
    return false;
  }
  async function moveFolder(id: string, parentId: string | null, beforeId?: string) {
    const source = rows.find(row => row.folder.id === id);
    if (!source || id === parentId || (parentId !== null && source.childIds.has(parentId))) {
      setError('Không thể chuyển thư mục vào chính nó hoặc thư mục con.');
      return;
    }
    if (await save({ kind: 'move', id, parentId, beforeId })) setMoveSource(undefined);
  }
  return <View style={[styles.sidebar, { maxHeight }, compact && { width: '100%', maxWidth: '100%' }]}>
    <Text accessibilityRole="header" style={styles.title}>Quản lý Thư mục</Text>
    {edit ? <>
      <Text style={styles.title}>{{ create: 'Thêm thư mục', rename: 'Đổi tên thư mục', move: 'Di chuyển thư mục', remove: 'Xóa thư mục' }[edit.kind]}</Text>
      <Text style={styles.muted}>{edit.id && library ? folderPath(library.folders, edit.id) : 'Thư mục gốc'}</Text>
      {edit.kind === 'remove' && plan && <Text style={styles.field}>
        Xóa thư mục này cùng {plan.ids.size - 1} thư mục con và {plan.removed} từ. Giữ lại {plan.kept} từ còn thuộc thư mục khác.
      </Text>}
      {edit.kind === 'move' && active && <ScrollView>
        {[{ id: null, label: 'Thư mục gốc' }, ...rows.filter(r => !active.childIds.has(r.folder.id))
          .map(r => ({ id: r.folder.id, label: folderPath(library!.folders, r.folder.id) }))].map(target =>
          <Control key={target.id ?? 'root'} theme={theme} label={target.label} disabled={busy || target.id === active.folder.parentId}
            onPress={() => void save({ kind: 'move', id: active.folder.id, parentId: target.id })} />)}
        {rows.filter(r => !active.childIds.has(r.folder.id)).map(r =>
          <Control key={r.folder.id} theme={theme} label={`Đặt trước · ${folderPath(library!.folders, r.folder.id)}`} disabled={busy}
            onPress={() => void save({ kind: 'move', id: active.folder.id, parentId: r.folder.parentId, beforeId: r.folder.id })} />)}
      </ScrollView>}
      {(edit.kind === 'rename' || edit.kind === 'create') && <TextInput autoFocus accessibilityLabel="Tên thư mục"
        style={styles.input} value={name} onChangeText={setName} editable={!busy} placeholder="Tên thư mục" placeholderTextColor={colors.muted} />}
      {!!error && <Text accessibilityRole="alert" style={styles.field}>{error}</Text>}
      <View style={styles.actions}>
        {edit.kind !== 'move' && <Control theme={theme} selected label={edit.kind === 'remove' ? 'Xác nhận xóa' : 'Lưu'}
          disabled={busy || (edit.kind === 'remove' ? !plan : !name.trim())} onPress={() => {
            if (edit.kind === 'create') void save({ kind: 'create', parentId: edit.id, name });
            if (edit.kind === 'rename' && edit.id) void save({ kind: 'rename', id: edit.id, name });
            if (edit.kind === 'remove' && edit.id && plan) void save({ kind: 'remove', id: edit.id, signature: plan.signature });
          }} />}
        <Control theme={theme} label="Hủy" disabled={busy} onPress={() => setEdit(undefined)} />
      </View>
    </> : <>
      <Control theme={theme} label="Tất cả từ vựng" count={library?.vocabularies.filter(w => !w.deletedAt).length ?? 0}
        selected={!selected} onPress={() => moveSource ? void moveFolder(moveSource, null) : onSelect(null)} />
      <Text style={styles.muted}>CÂY THƯ MỤC</Text>
      {!compact && <RootDropTarget onMoveRoot={id => void moveFolder(id, null)}><View style={{ minHeight: 32, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border,
        borderRadius: 6, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={[styles.muted, { fontSize: 12 }]}>Kéo vào đây để đưa ra thư mục gốc</Text>
      </View></RootDropTarget>}
      {compact && moveSource && <View style={[styles.wordCard, { gap: 8 }]}>
        <Text style={styles.field}>Đang di chuyển: {rows.find(row => row.folder.id === moveSource)?.folder.name}</Text>
        <Text style={styles.muted}>Chạm thư mục đích, hoặc đưa thư mục này ra gốc.</Text>
        <View style={styles.actions}>
          <Control theme={theme} label="Đưa ra gốc" disabled={busy} onPress={() => void moveFolder(moveSource, null)} />
          <Control theme={theme} label="Hủy" disabled={busy} onPress={() => setMoveSource(undefined)} />
        </View>
      </View>}
      {!!error && !edit && <Text accessibilityRole="alert" style={styles.field}>{error}</Text>}
      <ScrollView keyboardShouldPersistTaps="handled">
        {rows.filter(r => !hidden.has(r.folder.id)).map(({ folder, depth, count, childIds }) =>
          <FolderDragItem key={folder.id} id={folder.id} disabled={!onChange || busy}
            onMoveInto={(id, parentId) => void moveFolder(id, parentId)}
            onMoveBefore={(id, beforeId) => void moveFolder(id, folder.parentId, beforeId)}>
          <View style={{ marginLeft: Math.min(depth, 5) * 8 }}
            onPointerEnter={compact ? undefined : () => setHovered(folder.id)}
            onPointerLeave={compact ? undefined : () => setHovered(undefined)}>
            <View style={styles.actions}>
              {childIds.size > 1 ? <Control theme={theme} compactTab label=""
                icon={<WorkspaceIcon name={collapsed.has(folder.id) ? 'chevronRight' : 'chevronDown'} color={colors.ink} size={17} />}
                layout={{ width: 36, paddingHorizontal: 0, alignItems: 'center' }}
                accessibleLabel={`Mở / thu gọn ${folder.name}`} onPress={() => setCollapsed(prev => {
                  const next = new Set(prev); if (!next.delete(folder.id)) next.add(folder.id); return next;
                })} /> : <Text style={[styles.muted, { width: 36, textAlign: 'center' }]}>•</Text>}
              <View style={{ flex: 1, minWidth: 0 }}><Control theme={theme} label={folder.name} count={count}
                selected={selected === folder.id || moveSource === folder.id}
                onLongPress={compact && onChange ? () => { setMoveSource(folder.id); setToolsFor(undefined); setError(''); } : undefined}
                onPress={() => moveSource && moveSource !== folder.id ? void moveFolder(moveSource, folder.id) : onSelect(folder.id)} /></View>
              {compact && onChange && <Control theme={theme} label="" compactTab layout={{ minWidth: 44, alignItems: 'center' }}
                icon={<WorkspaceIcon name="more" color={colors.ink} size={19} />}
                accessibleLabel={`Thao tác thư mục ${folder.name}`} onPress={() => setToolsFor(toolsFor === folder.id ? undefined : folder.id)} />}
            </View>
            {onChange && (toolsFor === folder.id || hovered === folder.id) && <View style={[styles.actions, { gap: 2, justifyContent: 'flex-end' }]}>
              {([['create', 'plus', 'Thêm thư mục con'], ['rename', 'edit', 'Đổi tên'], ['move', 'move', 'Di chuyển'],
                ['remove', 'trash', 'Xóa']] as const satisfies readonly (readonly [EditKind, WorkspaceIconName, string])[])
                .map(([kind, icon, label]) => <Control key={kind} compactTab theme={theme} label={compact ? label : ''}
                  icon={<WorkspaceIcon name={icon} color={colors.ink} size={18} />}
                  layout={{ minWidth: 44, alignItems: 'center' }} accessibleLabel={`${label} ${folder.name}`}
                  onPress={() => open(kind, folder.id, kind === 'rename' ? folder.name : '')} />)}
            </View>}
          </View></FolderDragItem>)}
        {rows.length === 0 && <Text style={styles.muted}>Chưa có thư mục.</Text>}
      </ScrollView>
      <TextInput accessibilityLabel="Thư mục mới" placeholder="Thư mục mới..." placeholderTextColor={colors.muted}
        style={styles.input} value={rootName} onChangeText={setRootName} editable={!!onChange && !busy}
        onSubmitEditing={() => { if (rootName.trim()) void save({ kind: 'create', parentId: null, name: rootName }).then(() => setRootName('')); }} />
      <View style={styles.actions}><Control theme={theme} label="Thêm" selected disabled={!onChange || busy || !rootName.trim()}
        onPress={() => void save({ kind: 'create', parentId: null, name: rootName }).then(() => setRootName(''))} /></View>
      {compact && <Control theme={theme} label="Đóng thư mục" onPress={close} />}
    </>}
  </View>;
}


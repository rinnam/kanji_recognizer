import { useRef, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { folderPath } from '../../frontend/src/entities/folder/model/path';
import { Control } from './WorkspaceButton';
import { deletionPreview, type FolderAction } from './folder-actions';
import type { FolderRow } from './workspace-model';
import type { LocalWorkspace } from './workspace-storage';
import type { WorkspaceTheme } from './workspace-theme';

export function FolderPanel({ theme, library, rows, selected, onSelect, onChange, compact, close, maxHeight }: {
  theme: WorkspaceTheme; library?: LocalWorkspace; rows: FolderRow[]; selected: string | null;
  onSelect: (id: string | null) => void; onChange?: (action: FolderAction) => Promise<void>;
  compact: boolean; close: () => void; maxHeight: number;
}) {
  const { styles, colors } = theme;
  const [collapsed, setCollapsed] = useState(new Set<string>());
  const [edit, setEdit] = useState<{ kind: 'create' | 'rename' | 'remove' | 'move'; id: string | null }>();
  const [name, setName] = useState('');
  const [toolsFor, setToolsFor] = useState<string>();
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
    if (!onChange || lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      await onChange(action);
      setEdit(undefined);
      setToolsFor(undefined);
      if (action.kind === 'create' && action.parentId) {
        setCollapsed(prev => { const next = new Set(prev); next.delete(action.parentId!); return next; });
      }
      if (action.kind === 'remove' && selected && plan?.ids.has(selected)) onSelect(null);
    } catch (e) { setError(e instanceof Error ? e.message : 'Không lưu được thư mục.'); }
    finally { setBusy(false); lock.current = false; }
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
        selected={!selected} onPress={() => onSelect(null)} />
      <Text style={styles.muted}>CÂY THƯ MỤC</Text>
      <ScrollView keyboardShouldPersistTaps="handled">
        {rows.filter(r => !hidden.has(r.folder.id)).map(({ folder, depth, count, childIds }) =>
          <View key={folder.id} style={{ marginLeft: Math.min(depth, 5) * 8 }}
            onPointerEnter={compact ? undefined : () => setHovered(folder.id)}
            onPointerLeave={compact ? undefined : () => setHovered(undefined)}>
            <View style={styles.actions}>
              {childIds.size > 1 && <Control theme={theme} compactTab label={collapsed.has(folder.id) ? '▸' : '▾'}
                accessibleLabel={`Mở / thu gọn ${folder.name}`} onPress={() => setCollapsed(prev => {
                  const next = new Set(prev); if (!next.delete(folder.id)) next.add(folder.id); return next;
                })} />}
              <View style={{ flex: 1, minWidth: 0 }}><Control theme={theme} label={folder.name} count={count}
                selected={selected === folder.id} onPress={() => onSelect(folder.id)} /></View>
              {onChange && <Control theme={theme} label="⋯" compactTab layout={{ minWidth: 44, alignItems: 'center' }}
                accessibleLabel={`Thao tác thư mục ${folder.name}`} onPress={() => setToolsFor(toolsFor === folder.id ? undefined : folder.id)} />}
            </View>
            {onChange && (toolsFor === folder.id || hovered === folder.id) && <View style={[styles.actions, { gap: 2, justifyContent: 'flex-end' }]}>
              {([['create', '+', 'Thêm thư mục con'], ['rename', '✎', 'Đổi tên'], ['move', '↗', 'Di chuyển'],
                ['remove', '×', 'Xóa']] as const).map(([kind, icon, label]) =>
                <Control key={kind} compactTab theme={theme} label={compact ? label : icon} layout={{ minWidth: 44, alignItems: 'center' }}
                  accessibleLabel={`${label} ${folder.name}`} onPress={() => open(kind, folder.id, kind === 'rename' ? folder.name : '')} />)}
            </View>}
          </View>)}
        {rows.length === 0 && <Text style={styles.muted}>Chưa có thư mục.</Text>}
      </ScrollView>
      <Control theme={theme} label="+ Thư mục" disabled={!onChange} onPress={() => open('create', null)} />
      {compact && <Control theme={theme} label="Đóng thư mục" onPress={close} />}
    </>}
  </View>;
}


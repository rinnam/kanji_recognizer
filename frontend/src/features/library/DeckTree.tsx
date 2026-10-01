import { useEffect, useRef, useState } from 'react';
import type { Deck } from './types';

interface DeckTreeProps {
  decks: Deck[];
  selectedDeckId: string;
  busy: boolean;
  onSelect: (deckId: string) => void;
  onCreate: (name: string, description: string | null, parentId: string | null) => Promise<boolean>;
  onUpdate: (deck: Deck, changes: { name?: string; description?: string | null; parentId?: string | null }) => Promise<boolean>;
  onDelete: (deck: Deck) => Promise<boolean>;
}

type Dialog = { kind: 'create'; parentId: string | null } | { kind: 'edit' | 'move' | 'delete'; deck: Deck };

export function DeckTree({ decks, selectedDeckId, busy, onSelect, onCreate, onUpdate, onDelete }: DeckTreeProps) {
  const [dialog, setDialog] = useState<Dialog>();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [mobileOpen, setMobileOpen] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!dialog) return;
    dialogRef.current?.querySelector<HTMLElement>('input, select, button')?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) {
        event.preventDefault();
        setDialog(undefined);
      }
      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)')];
        if (focusable.length === 0) return;
        const first = focusable[0]!;
        const last = focusable.at(-1)!;
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [busy, dialog]);

  useEffect(() => {
    if (!dialog) returnFocusRef.current?.focus();
  }, [dialog]);

  const showDialog = (next: Dialog) => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setDialog(next);
  };
  const closeDialog = () => setDialog(undefined);
  const openCreate = (parentId: string | null) => { setName(''); setDescription(''); showDialog({ kind: 'create', parentId }); };
  const openEdit = (deck: Deck) => { setName(deck.name); setDescription(deck.description ?? ''); showDialog({ kind: 'edit', deck }); };
  const children = (parentId: string | null) => decks
    .filter((deck) => deck.parentId === parentId)
    .sort((a, b) => Number(a.sortPosition) - Number(b.sortPosition) || a.id.localeCompare(b.id));
  const descendants = (deckId: string): Set<string> => {
    const result = new Set<string>();
    const visit = (id: string) => children(id).forEach((child) => { result.add(child.id); visit(child.id); });
    visit(deckId);
    return result;
  };
  const closeOnSuccess = async (action: () => Promise<boolean>) => { if (await action()) closeDialog(); };

  const renderBranch = (parentId: string | null, level: number): React.ReactNode => (
    <ul role={parentId === null ? 'tree' : 'group'}>
      {children(parentId).map((deck) => {
        const nested = children(deck.id);
        const isCollapsed = collapsed.has(deck.id);
        return <li role="treeitem" aria-level={level} aria-selected={selectedDeckId === deck.id} aria-expanded={nested.length ? !isCollapsed : undefined} key={deck.id}>
          <div className="deck-row">
            {nested.length > 0 ? <button className="deck-toggle" aria-label={`${isCollapsed ? 'Mở rộng' : 'Thu gọn'} ${deck.name}`} onClick={() => setCollapsed((current) => { const next = new Set(current); if (next.has(deck.id)) next.delete(deck.id); else next.add(deck.id); return next; })}>{isCollapsed ? '›' : '⌄'}</button> : <span className="deck-leaf" aria-hidden="true">·</span>}
            <button className="deck-name" onClick={() => { onSelect(deck.id); setMobileOpen(false); }}>{deck.name}</button>
            <div className="deck-actions">
              <button aria-label={`Tạo bộ thẻ con trong ${deck.name}`} title="Tạo bộ thẻ con" disabled={busy || level >= 8} onClick={() => openCreate(deck.id)}>＋</button>
              <button aria-label={`Chỉnh sửa ${deck.name}`} title="Chỉnh sửa bộ thẻ" disabled={busy} onClick={() => openEdit(deck)}>✎</button>
              <button aria-label={`Di chuyển ${deck.name}`} title="Di chuyển bộ thẻ" disabled={busy} onClick={() => setDialog({ kind: 'move', deck })}>↳</button>
              <button aria-label={`Xóa ${deck.name}`} title="Lưu trữ và xóa bộ thẻ" disabled={busy} onClick={() => setDialog({ kind: 'delete', deck })}>×</button>
            </div>
          </div>
          {nested.length > 0 && !isCollapsed && renderBranch(deck.id, level + 1)}
        </li>;
      })}
    </ul>
  );

  const moving = dialog?.kind === 'move' ? dialog.deck : undefined;
  const invalidParents = moving ? descendants(moving.id) : new Set<string>();
  if (moving) invalidParents.add(moving.id);
  const selectedName = decks.find((deck) => deck.id === selectedDeckId)?.name ?? 'Mục đã lưu';

  return <aside className={mobileOpen ? 'deck-panel is-open' : 'deck-panel'} aria-label="Cấu trúc bộ thẻ">
    <button className="deck-mobile-toggle" aria-expanded={mobileOpen} aria-controls="deck-tree-content" onClick={() => setMobileOpen((open) => !open)}><span>Bộ thẻ</span><strong>{selectedName}</strong><span aria-hidden="true">{mobileOpen ? '−' : '+'}</span></button>
    <div id="deck-tree-content" className="deck-tree-content">
      <div className="panel-heading"><div><p className="kicker">Bộ sưu tập</p><h2>Bộ thẻ</h2></div><button aria-label="Tạo bộ thẻ cấp cao nhất" onClick={() => openCreate(null)} disabled={busy}>＋</button></div>
      <button className={selectedDeckId === '' ? 'deck-all active' : 'deck-all'} aria-current={selectedDeckId === '' ? 'page' : undefined} onClick={() => { onSelect(''); setMobileOpen(false); }}><span aria-hidden="true">▦</span> Mục đã lưu</button>
      {decks.length === 0 ? <p className="muted">Chưa có bộ thẻ. Hãy tạo bộ thẻ để sắp xếp các mục đã lưu.</p> : renderBranch(null, 1)}

      {dialog?.kind === 'create' && <form ref={dialogRef as React.RefObject<HTMLFormElement | null>} className="inline-dialog" role="dialog" aria-modal="true" aria-labelledby="create-deck-title" onSubmit={(event) => { event.preventDefault(); if (name.trim()) void closeOnSuccess(() => onCreate(name.trim(), description.trim() || null, dialog.parentId)); }}>
        <strong id="create-deck-title">Tạo bộ thẻ</strong>
        <label>Tên bộ thẻ<input value={name} maxLength={200} required onChange={(event) => setName(event.target.value)} /></label>
        <label>Mô tả<textarea value={description} maxLength={2000} onChange={(event) => setDescription(event.target.value)} /></label>
        <div><button disabled={busy}>Tạo</button><button type="button" onClick={() => closeDialog()}>Hủy</button></div>
      </form>}

      {dialog?.kind === 'edit' && <form ref={dialogRef as React.RefObject<HTMLFormElement | null>} className="inline-dialog" role="dialog" aria-modal="true" aria-label={`Chỉnh sửa ${dialog.deck.name}`} onSubmit={(event) => { event.preventDefault(); if (name.trim()) void closeOnSuccess(() => onUpdate(dialog.deck, { name: name.trim(), description: description.trim() || null })); }}>
        <label>Tên bộ thẻ<input value={name} maxLength={200} required onChange={(event) => setName(event.target.value)} /></label>
        <label>Mô tả<textarea value={description} maxLength={2000} onChange={(event) => setDescription(event.target.value)} /></label>
        <div><button disabled={busy}>Lưu thay đổi</button><button type="button" onClick={() => closeDialog()}>Hủy</button></div>
      </form>}

      {moving && <form ref={dialogRef as React.RefObject<HTMLFormElement | null>} className="inline-dialog" role="dialog" aria-modal="true" aria-label={`Di chuyển ${moving.name}`} onSubmit={(event) => { event.preventDefault(); const value = new FormData(event.currentTarget).get('parentId') as string; void closeOnSuccess(() => onUpdate(moving, { parentId: value || null })); }}>
        <label>Di chuyển “{moving.name}” vào<select name="parentId" defaultValue={moving.parentId ?? ''}>
          <option value="">Cấp cao nhất</option>
          {decks.filter((deck) => !invalidParents.has(deck.id)).map((deck) => <option value={deck.id} key={deck.id}>{deck.name}</option>)}
        </select></label>
        <div><button disabled={busy}>Lưu vị trí</button><button type="button" onClick={() => closeDialog()}>Hủy</button></div>
      </form>}

      {dialog?.kind === 'delete' && <div ref={dialogRef as React.RefObject<HTMLDivElement | null>} className="inline-dialog danger-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-deck-title" aria-describedby="delete-deck-detail">
        <strong id="delete-deck-title">Xóa vĩnh viễn “{dialog.deck.name}”?</strong>
        <p id="delete-deck-detail">Không thể hoàn tác thao tác này trong phiên bản hiện tại. Hãy xóa các bộ thẻ con đang hoạt động trước. Nội dung đã lưu vẫn được giữ trong Thư viện; các bộ thẻ con sẽ không bao giờ tự động bị xóa hoặc di chuyển.</p>
        <div><button className="danger-button" disabled={busy} onClick={() => void closeOnSuccess(() => onDelete(dialog.deck))}>Xóa vĩnh viễn bộ thẻ</button><button type="button" onClick={() => closeDialog()}>Hủy</button></div>
      </div>}
    </div>
  </aside>;
}

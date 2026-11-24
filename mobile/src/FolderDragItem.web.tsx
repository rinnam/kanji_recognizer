import { useState, type DragEvent, type ReactNode } from 'react';
import type { FolderDragItemProps } from './FolderDragItem';

const MIME = 'application/x-kanji-nest-folder';

function readId(event: DragEvent<HTMLDivElement>) {
  return event.dataTransfer.getData(MIME);
}

export function FolderDragItem({ id, disabled, children, onMoveInto, onMoveBefore }: FolderDragItemProps) {
  const [over, setOver] = useState<'before' | 'into'>();
  return <div role="treeitem">
    <div
      aria-hidden
      style={{ height: 6, borderRadius: 3, background: over === 'before' ? '#b4532a' : 'transparent' }}
      onDragOver={event => { event.preventDefault(); setOver('before'); }}
      onDragLeave={() => setOver(undefined)}
      onDrop={event => {
        event.preventDefault();
        setOver(undefined);
        const dragged = readId(event);
        if (dragged && dragged !== id) onMoveBefore(dragged, id);
      }}
    />
    <div
      draggable={!disabled}
      style={{ borderRadius: 8, outline: over === 'into' ? '2px solid #b4532a' : 'none', outlineOffset: -2 }}
      onDragStart={event => {
        event.dataTransfer.setData(MIME, id);
        event.dataTransfer.effectAllowed = 'move';
      }}
      onDragEnd={() => setOver(undefined)}
      onDragOver={event => { event.preventDefault(); setOver('into'); }}
      onDragLeave={() => setOver(undefined)}
      onDrop={event => {
        event.preventDefault();
        setOver(undefined);
        const dragged = readId(event);
        if (dragged && dragged !== id) onMoveInto(dragged, id);
      }}
    >{children}</div>
  </div>;
}

export function RootDropTarget({ children, onMoveRoot }: { children: ReactNode; onMoveRoot: (draggedId: string) => void }) {
  const [over, setOver] = useState(false);
  return <div
    style={{ borderRadius: 6, outline: over ? '2px solid #b4532a' : 'none', outlineOffset: -2 }}
    onDragOver={event => { event.preventDefault(); setOver(true); }}
    onDragLeave={() => setOver(false)}
    onDrop={event => {
      event.preventDefault();
      setOver(false);
      const dragged = readId(event);
      if (dragged) onMoveRoot(dragged);
    }}
  >{children}</div>;
}

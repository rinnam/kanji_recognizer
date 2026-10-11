import type { ScopeSelection } from '@kanji-nest/core';
import { createContext, useContext, useState, type ReactElement, type ReactNode } from 'react';

interface ScopeApi {
  /** Thư mục đang chọn (null = tất cả, gồm con cháu khi lọc). */
  folderId: string | null;
  setFolderId: (id: string | null) => void;
  /** Phạm vi con: all / N đầu / Random (áp qua core applyScope). */
  selection: ScopeSelection;
  setSelection: (selection: ScopeSelection) => void;
  /** Đổi thư mục → reset phạm vi về tất cả (khớp hành vi web). */
  selectFolder: (id: string | null) => void;
}

const DEFAULT_SELECTION: ScopeSelection = { mode: 'all', n: 30, seed: 0 };

const ScopeContext = createContext<ScopeApi | null>(null);

/** Giữ phạm vi học chung cho các màn hình (Tổng quan / Flashcard / Quiz). */
export function ScopeProvider({ children }: { children: ReactNode }): ReactElement {
  const [folderId, setFolderId] = useState<string | null>(null);
  const [selection, setSelection] = useState<ScopeSelection>(DEFAULT_SELECTION);

  const selectFolder = (id: string | null): void => {
    setFolderId(id);
    setSelection(DEFAULT_SELECTION);
  };

  return (
    <ScopeContext.Provider value={{ folderId, setFolderId, selection, setSelection, selectFolder }}>
      {children}
    </ScopeContext.Provider>
  );
}

export function useScope(): ScopeApi {
  const api = useContext(ScopeContext);
  if (api === null) throw new Error('useScope phải dùng trong <ScopeProvider>');
  return api;
}

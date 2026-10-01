import type { ReactNode } from 'react';

interface StatusTagProps {
  tone?: 'current' | 'target' | 'blocked' | 'mock';
  children: ReactNode;
}

export function StatusTag({ tone = 'current', children }: StatusTagProps) {
  return <span className={`status-tag status-tag--${tone}`}>{children}</span>;
}

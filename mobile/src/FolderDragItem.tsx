import type { ReactNode } from 'react';
import { View } from 'react-native';

export interface FolderDragItemProps {
  id: string;
  disabled?: boolean;
  children: ReactNode;
  onMoveInto: (draggedId: string, parentId: string) => void;
  onMoveBefore: (draggedId: string, beforeId: string) => void;
}

export function FolderDragItem({ children }: FolderDragItemProps) {
  return <View>{children}</View>;
}

export function RootDropTarget({ children }: { children: ReactNode; onMoveRoot: (draggedId: string) => void }) {
  return <View>{children}</View>;
}

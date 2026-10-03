import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactElement,
  type ReactNode,
  type ReactPortal,
} from 'react';
import { createPortal } from 'react-dom';

interface ToolbarSlotContextValue {
  node: HTMLElement | null;
  setNode: (node: HTMLElement | null) => void;
}

const ToolbarSlotContext = createContext<ToolbarSlotContextValue | null>(null);

/**
 * Cơ chế "slot" cho thanh công cụ: PAGE đặt MỘT ô đích (ToolbarSlotTarget) ở vị trí cố định
 * (ví dụ bên phải thanh "Đang chọn"); FEATURE dùng ToolbarSlot để PORTAL các nút vào ô đó —
 * không phải truyền prop/handler xuyên nhiều tầng. Feature chỉ cần import từ shared/ui.
 */
export function ToolbarSlotProvider({ children }: { children: ReactNode }): ReactElement {
  const [node, setNode] = useState<HTMLElement | null>(null);
  return (
    <ToolbarSlotContext.Provider value={{ node, setNode }}>{children}</ToolbarSlotContext.Provider>
  );
}

/** Ô đích do PAGE đặt; đăng ký DOM node vào context để ToolbarSlot biết nơi portal tới. */
export function ToolbarSlotTarget({ className }: { className?: string }): ReactElement {
  const setNode = useContext(ToolbarSlotContext)?.setNode;
  // Ref ỔN ĐỊNH (chỉ chạy khi mount/unmount) để không đăng ký lại node mỗi lần render.
  const ref = useCallback(
    (el: HTMLElement | null) => {
      setNode?.(el);
    },
    [setNode],
  );
  return <div className={className} ref={ref} />;
}

/** Dùng trong FEATURE: portal `children` vào ô đích nếu đã sẵn sàng; chưa có đích → không render. */
export function ToolbarSlot({ children }: { children: ReactNode }): ReactPortal | null {
  const node = useContext(ToolbarSlotContext)?.node ?? null;
  if (node === null) return null;
  return createPortal(children, node);
}

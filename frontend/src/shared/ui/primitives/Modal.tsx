import {
  useEffect,
  useId,
  useRef,
  type ReactElement,
  type ReactNode,
} from 'react';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** 'sm' (mặc định) cho hộp xác nhận; 'lg' cho nội dung rộng (vd nhập từ file). */
  size?: 'sm' | 'lg';
  /** Nội dung phụ CỐ ĐỊNH dưới tiêu đề (vd thanh bước) — nằm trong header, không cuộn. */
  headerExtra?: ReactNode;
}

/** Hộp thoại dùng chung: Esc để đóng, click nền để đóng, focus tiêu đề khi mở. */
export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  size = 'sm',
  headerExtra,
}: ModalProps): ReactElement | null {
  const titleId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!open) return;
    headingRef.current?.focus();
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="kn-ui-modal__backdrop" onClick={onClose}>
      <div
        className={`kn-ui-modal kn-ui-modal--${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="kn-ui-modal__header">
          <h2 id={titleId} className="kn-ui-modal__title" tabIndex={-1} ref={headingRef}>
            {title}
          </h2>
          {headerExtra !== undefined ? (
            <div className="kn-ui-modal__header-extra">{headerExtra}</div>
          ) : null}
        </div>
        <div className="kn-ui-modal__body">{children}</div>
        {footer !== undefined ? (
          <div className="kn-ui-modal__footer">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}

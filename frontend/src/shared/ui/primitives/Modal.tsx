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
}

/** Hộp thoại dùng chung: Esc để đóng, click nền để đóng, focus tiêu đề khi mở. */
export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
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
        className="kn-ui-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="kn-ui-modal__title" tabIndex={-1} ref={headingRef}>
          {title}
        </h2>
        <div className="kn-ui-modal__body">{children}</div>
        {footer !== undefined ? (
          <div className="kn-ui-modal__footer">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}

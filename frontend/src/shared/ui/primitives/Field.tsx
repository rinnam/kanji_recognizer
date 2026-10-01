import { type ReactElement, type ReactNode } from 'react';

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}

/**
 * Bọc nhãn + control, nối id ↔ htmlFor và hiển thị lỗi (role=alert).
 * Caller gắn id cho control khớp prop id (nếu có error nên thêm
 * aria-describedby={`${id}-error`} cho control).
 */
export function Field({
  id,
  label,
  error,
  required,
  children,
}: FieldProps): ReactElement {
  return (
    <div className="kn-ui-field">
      <label className="kn-ui-field__label" htmlFor={id}>
        {label}
        {required === true ? <span aria-hidden="true"> *</span> : null}
      </label>
      {children}
      {error !== undefined ? (
        <p id={`${id}-error`} className="kn-ui-field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

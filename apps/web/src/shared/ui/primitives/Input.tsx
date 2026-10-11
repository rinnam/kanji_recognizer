import { type InputHTMLAttributes, type ReactElement } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

/** Ô nhập văn bản dùng chung (đặt aria-invalid khi invalid). */
export function Input({ invalid, className, ...rest }: InputProps): ReactElement {
  const classes = ['kn-ui-input', className].filter(Boolean).join(' ');
  return (
    <input
      className={classes}
      aria-invalid={invalid === true ? true : undefined}
      {...rest}
    />
  );
}

import { type ButtonHTMLAttributes, type ReactElement } from 'react';

type ButtonVariant = 'primary' | 'secondary';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

/** Nút dùng chung (mặc định type=button để tránh submit ngoài ý muốn). */
export function Button({
  variant = 'secondary',
  type = 'button',
  className,
  ...rest
}: ButtonProps): ReactElement {
  const classes = ['kn-ui-btn', `kn-ui-btn--${variant}`, className]
    .filter(Boolean)
    .join(' ');
  return <button type={type} className={classes} {...rest} />;
}

import type { ButtonHTMLAttributes } from 'react';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  variant = 'primary', size = 'md', iconLeft, className = '', children, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant; size?: 'md' | 'sm'; iconLeft?: IconName;
}) {
  const cls = ['btn', `btn--${variant}`, size === 'sm' ? 'btn--sm' : '', className]
    .filter(Boolean).join(' ');
  return (
    <button className={cls} {...rest}>
      {iconLeft && <Icon name={iconLeft} size={size === 'sm' ? 14 : 16} />}
      {children}
    </button>
  );
}

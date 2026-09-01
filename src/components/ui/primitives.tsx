import type { ReactNode } from 'react';

export const Kicker = ({ children }: { children: ReactNode }) =>
  <p className="reda-kicker">{children}</p>;

export const HairlineRule = () => <hr className="reda-rule" />;

export function SectionTitle({ as: Tag = 'h2', children, className = '' }:
  { as?: 'h1' | 'h2' | 'h3'; children: ReactNode; className?: string }) {
  return <Tag className={`reda-section-title ${className}`}>{children}</Tag>;
}

export function Panel({ variant = 'dark', className = '', children }:
  { variant?: 'dark' | 'parch'; className?: string; children: ReactNode }) {
  return <div className={`reda-panel ${variant === 'parch' ? 'reda-panel--parch' : ''} ${className}`}>{children}</div>;
}

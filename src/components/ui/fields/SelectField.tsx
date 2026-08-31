import type { SelectHTMLAttributes } from 'react';

export function SelectField({ id, label, hint, error, className = '', children, ...rest }:
  SelectHTMLAttributes<HTMLSelectElement> & { id: string; label: string; hint?: string; error?: string }) {
  return (
    <div className="reda-field">
      <label className="reda-field__label" htmlFor={id}>{label}</label>
      <select id={id} className={`reda-field__control ${className}`}
        aria-invalid={error ? true : undefined} {...rest}>
        {children}
      </select>
      {hint && !error && <p className="reda-field__hint">{hint}</p>}
      {error && <p className="reda-field__error" role="alert">{error}</p>}
    </div>
  );
}

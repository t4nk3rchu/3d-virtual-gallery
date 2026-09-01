import type { InputHTMLAttributes } from 'react';

export function TextField({ id, label, hint, error, className = '', ...rest }:
  InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; hint?: string; error?: string }) {
  return (
    <div className="reda-field">
      <label className="reda-field__label" htmlFor={id}>{label}</label>
      <input id={id} className={`reda-field__control ${className}`}
        aria-invalid={error ? true : undefined} {...rest} />
      {hint && !error && <p className="reda-field__hint">{hint}</p>}
      {error && <p className="reda-field__error" role="alert">{error}</p>}
    </div>
  );
}

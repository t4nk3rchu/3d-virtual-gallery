import type { TextareaHTMLAttributes } from 'react';

export function TextArea({ id, label, hint, error, className = '', ...rest }:
  TextareaHTMLAttributes<HTMLTextAreaElement> & { id: string; label: string; hint?: string; error?: string }) {
  return (
    <div className="reda-field">
      <label className="reda-field__label" htmlFor={id}>{label}</label>
      <textarea id={id} className={`reda-field__control ${className}`}
        aria-invalid={error ? true : undefined} {...rest} />
      {hint && !error && <p className="reda-field__hint">{hint}</p>}
      {error && <p className="reda-field__error" role="alert">{error}</p>}
    </div>
  );
}

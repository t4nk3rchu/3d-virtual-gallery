export function Toggle({ checked, onChange, label }:
  { checked: boolean; onChange(next: boolean): void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label}
      className="reda-toggle" onClick={() => onChange(!checked)}>
      <span className="reda-toggle__track" data-on={checked}>
        <span className="reda-toggle__knob" />
      </span>
    </button>
  );
}

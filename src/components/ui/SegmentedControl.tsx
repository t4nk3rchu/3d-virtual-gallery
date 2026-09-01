export function SegmentedControl<T extends string>({ options, value, onChange, ariaLabel }:
  { options: { value: T; label: string }[]; value: T; onChange(v: T): void; ariaLabel: string }) {
  return (
    <div className="reda-seg" role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button key={o.value} type="button" className="reda-seg__opt"
          aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

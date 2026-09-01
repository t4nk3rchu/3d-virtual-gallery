export function Tabs({ tabs, active, onChange }:
  { tabs: { id: string; label: string }[]; active: string; onChange(id: string): void }) {
  return (
    <div className="reda-tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} type="button" role="tab" aria-selected={t.id === active}
          className="reda-tabs__tab" onClick={() => onChange(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

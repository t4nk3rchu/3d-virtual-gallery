import { Icon, type IconName } from '../../ui';

export type Tool = 'curate' | 'rooms' | 'artists' | 'setup';

const ITEMS: { key: Tool; icon: IconName; label: string }[] = [
  { key: 'curate', icon: 'select', label: 'Curate' },
  { key: 'rooms', icon: 'cube', label: 'Rooms' },
  { key: 'artists', icon: 'users', label: 'Artists' },
  { key: 'setup', icon: 'gear', label: 'Setup' },
];

export function ToolRail({ active, onChange }: { active: Tool; onChange(t: Tool): void }) {
  return (
    <div className="wb-rail">
      {ITEMS.map((it) => (
        <button
          key={it.key}
          type="button"
          aria-pressed={it.key === active}
          aria-label={it.label}
          onClick={() => onChange(it.key)}
        >
          <Icon name={it.icon} size={17} />
          {it.label}
        </button>
      ))}
      <div className="sp" />
    </div>
  );
}
